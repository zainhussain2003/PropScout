/**
 * useInvestorReport — manages the full state for the Investor Report page.
 *
 * Demo mode (listing.id === 'vaughan' | 'hamilton'):
 *   Computes all metrics locally via computeDemoMetrics + enrichMetrics.
 *   No network call is made. Loading is false from the first render.
 *   Slider changes recompute metrics synchronously without any API round-trip.
 *
 * Live mode (any other listing.id):
 *   Calls useAnalysis → analysisService → Fastify API → Python calc engine.
 *   Updates metrics when the API responds; slider changes re-trigger the API.
 *
 * The hook signature is identical in both modes so the page component and tests
 * are unaffected.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useAnalysis } from './useAnalysis'
import { enrichMetrics, toDealScoreData, computeDemoMetrics } from '../lib/investorCalc'
import {
  DEFAULT_FINANCING_INPUTS,
  VAUGHAN_STABLE_METRICS,
  HAMILTON_STABLE_METRICS,
  VAUGHAN_DEAL_SCORE,
  HAMILTON_DEAL_SCORE,
} from '../constants/demoData'
import type {
  ListingData,
  FinancingInputs,
  ComputedInvestorMetrics,
  DealScoreData,
  SunScoutResult,
} from '../types/analysis'
import type { RentalInput, PropertyInput } from '../types/api'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UseInvestorReportResult {
  /** Core analysis state — always false / null in demo mode */
  loading: boolean
  error: string | null

  /** Current financing slider state */
  financing: FinancingInputs

  /** Enriched metrics including equity curve, expenses, LTT rows, OSFI */
  metrics: ComputedInvestorMetrics | null

  /** Display-ready deal score with label, tagline, and tone */
  dealScore: DealScoreData | null

  /** SunScout data — null in demo mode, populated from live analysis when available */
  sunScout: SunScoutResult | null

  /** Update financing — triggers local recompute (demo) or API re-run (live) */
  updateFinancing: (financing: FinancingInputs) => void
}

// ── Helper: ListingData → PropertyInput ───────────────────────────────────────

function listingToPropertyInput(listing: ListingData): PropertyInput {
  return {
    address: `${listing.addressLine1}, ${listing.addressLine2}`,
    province: listing.province,
    price: listing.price,
    annualTaxes: listing.annualTaxes,
    condoFeeMonthly: listing.condoFeeMonthly || null,
    condoFeeKnown: listing.condoFeeMonthly > 0,
    beds: parseInt(listing.beds, 10) || 1,
    baths: parseFloat(listing.baths) || 1,
    sqft: listing.sqft || null,
    yearBuilt: listing.yearBuilt || null,
    propertyType: listing.propertyType.toLowerCase().includes('condo') ? 'condo' : 'freehold',
    isToronto: listing.isToronto,
  }
}

// ── Helper: FinancingInputs → FinancingInput (API type) ───────────────────────

function toApiFinancing(f: FinancingInputs): {
  downPaymentPct: number
  mortgageRate: number
  amortizationYears: number
  includeManagementFee: boolean
} {
  return {
    downPaymentPct: f.downPaymentPct,
    mortgageRate: f.mortgageRate,
    amortizationYears: f.amortizationYears,
    includeManagementFee: f.includeManagementFee,
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * @param listing  The property listing data (from scraper or demo constants)
 * @param rental   Rental comp estimate (from nightly scraper or demo constants)
 * @param initialFinancing  Override defaults — useful when restoring saved state
 */
export function useInvestorReport(
  listing: ListingData,
  rental: RentalInput,
  initialFinancing?: Partial<FinancingInputs>
): UseInvestorReportResult {
  // Demo mode: skip the API entirely and compute locally
  const isDemo = listing.id === 'vaughan' || listing.id === 'hamilton'

  // Always call useAnalysis (hook rules — no conditional calls)
  // In demo mode run() is never invoked, so this stays at initial state
  const { analysis, loading: apiLoading, error: apiError, run } = useAnalysis()

  const [financing, setFinancing] = useState<FinancingInputs>({
    ...DEFAULT_FINANCING_INPUTS,
    ...initialFinancing,
  })

  // ── Non-demo: kick off API analysis on mount ─────────────────────────────────

  const runWithCurrentState = useCallback(
    (f: FinancingInputs) => {
      if (isDemo) return
      void run(listingToPropertyInput(listing), toApiFinancing(f), rental)
    },
    [run, listing, rental, isDemo]
  )

  useEffect(() => {
    runWithCurrentState(financing)
    // Only re-run on mount — slider changes call updateFinancing explicitly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateFinancing = useCallback(
    (f: FinancingInputs) => {
      setFinancing(f)
      if (!isDemo) {
        runWithCurrentState(f)
      }
      // Demo mode: state update triggers useMemo recompute automatically
    },
    [runWithCurrentState, isDemo]
  )

  // ── Demo mode: fully local computation ───────────────────────────────────────

  const demoMetrics = useMemo<ComputedInvestorMetrics | null>(() => {
    if (!isDemo) return null
    const stable = listing.id === 'hamilton' ? HAMILTON_STABLE_METRICS : VAUGHAN_STABLE_METRICS
    const raw = computeDemoMetrics(stable, listing, financing)
    return enrichMetrics(raw, listing, financing)
  }, [isDemo, listing, financing])

  const demoDealScore = useMemo<DealScoreData | null>(() => {
    if (!isDemo) return null
    const score = listing.id === 'hamilton' ? HAMILTON_DEAL_SCORE : VAUGHAN_DEAL_SCORE
    return toDealScoreData(score)
  }, [isDemo, listing.id])

  // ── Live mode: enrich API metrics ────────────────────────────────────────────

  const apiMetrics = useMemo<ComputedInvestorMetrics | null>(() => {
    if (isDemo || !analysis?.metrics) return null
    return enrichMetrics(analysis.metrics, listing, financing)
  }, [isDemo, analysis?.metrics, listing, financing])

  const apiDealScore = useMemo<DealScoreData | null>(() => {
    if (isDemo || !analysis?.dealScore) return null
    return toDealScoreData(analysis.dealScore)
  }, [isDemo, analysis?.dealScore])

  // ── Unified return ────────────────────────────────────────────────────────────

  return {
    loading: isDemo ? false : apiLoading,
    error: isDemo ? null : apiError,
    financing,
    metrics: isDemo ? demoMetrics : apiMetrics,
    dealScore: isDemo ? demoDealScore : apiDealScore,
    sunScout: isDemo ? null : (analysis?.sunScout ?? null),
    updateFinancing,
  }
}
