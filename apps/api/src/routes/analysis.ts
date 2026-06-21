/**
 * Analysis route — accepts { token, mode } from the frontend, runs the
 * full 9-step pipeline (flags → calc engine → geocode → walk score →
 * narrative → assemble), and returns { token, analysis }.
 *
 * Registered in app.ts with prefix "/analysis":
 *   await fastify.register(import('./routes/analysis'), { prefix: '/analysis' })
 * Fastify dynamic import requires a default export.
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import type {
  InvestmentMetrics,
  DealScore,
  DealScoreBreakdown,
  Analysis,
  ReportMode,
  WalkScoreResult,
} from '../types/analysis'
import {
  getListingByToken,
  updateAnalysisStatus,
  updateAnalysisByToken,
} from '../services/supabaseService'
import {
  extractListingFlags,
  generateNarrative,
  type NarrativeInput,
} from '../services/anthropicService'
import { geocodeAddress } from '../services/mapboxService'
import { getWalkScore } from '../services/walkScoreService'

const CALC_ENGINE_URL = process.env.CALC_ENGINE_URL ?? 'http://localhost:8000'

const FINANCING_DEFAULTS = {
  down_payment_pct: 0.2,
  mortgage_rate: 0.0479,
  amortization_years: 25,
  include_management_fee: false,
}

const VALID_MODES: readonly string[] = ['investor', 'personal', 'tenant', 'landlord']

// ── Python response types (snake_case from calc engine) ───────────────────────

interface PyComponentMaxes {
  cap_rate: number
  cash_flow: number
  cash_on_cash: number
  dscr: number
  demand: number
}

interface PyDealScoreBreakdown {
  cap_rate: number
  cash_flow: number
  cash_on_cash: number
  dscr: number
  demand: number
  subtotal: number
  deduction: number
  component_maxes: PyComponentMaxes
}

interface PyDealScore {
  total: number
  verdict: string
  breakdown: PyDealScoreBreakdown
}

interface PyInvestmentMetrics {
  cash_flow_monthly: number
  cash_flow_annual: number
  cap_rate: number
  cash_on_cash_return: number
  dscr: number
  grm: number
  noi: number
  mortgage_payment_monthly: number
  down_payment: number
  mortgage_amount: number
  amortization_years: number
  mortgage_rate: number
  break_even_rent: number
  closing_costs_total: number
  ltt_provincial: number
  ltt_municipal: number
  has_sanity_warnings: boolean
}

interface PyRiskFlag {
  id?: string
  severity?: string
  label?: string
  evidence?: string | null
  confidence?: number
  [key: string]: unknown
}

interface PyAnalysisOutput {
  metrics: PyInvestmentMetrics
  deal_score: PyDealScore
  risk_flags: PyRiskFlag[]
  has_sanity_warnings: boolean
}

// ── snake_case → camelCase output transforms ──────────────────────────────────

function toMetrics(py: PyInvestmentMetrics): InvestmentMetrics {
  return {
    cashFlowMonthly: py.cash_flow_monthly,
    cashFlowAnnual: py.cash_flow_annual,
    capRate: py.cap_rate,
    cashOnCashReturn: py.cash_on_cash_return,
    dscr: py.dscr,
    grm: py.grm,
    noi: py.noi,
    mortgagePaymentMonthly: py.mortgage_payment_monthly,
    downPayment: py.down_payment,
    mortgageAmount: py.mortgage_amount,
    amortizationYears: py.amortization_years,
    mortgageRate: py.mortgage_rate,
    breakEvenRent: py.break_even_rent,
    closingCostsTotal: py.closing_costs_total,
    lttProvincial: py.ltt_provincial,
    lttMunicipal: py.ltt_municipal,
    hasSanityWarnings: py.has_sanity_warnings,
  }
}

function toDealScore(py: PyDealScore): DealScore {
  const br = py.breakdown
  const cm = br.component_maxes
  const breakdown: DealScoreBreakdown = {
    capRate: br.cap_rate,
    cashFlow: br.cash_flow,
    cashOnCash: br.cash_on_cash,
    dscr: br.dscr,
    demand: br.demand,
    subtotal: br.subtotal,
    deduction: br.deduction,
    componentMaxes: {
      capRate: cm.cap_rate,
      cashFlow: cm.cash_flow,
      cashOnCash: cm.cash_on_cash,
      dscr: cm.dscr,
      demand: cm.demand,
    },
  }
  return {
    total: py.total,
    verdict: py.verdict as DealScore['verdict'],
    breakdown,
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

async function analysisRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: { token?: string; mode?: string } }>('/', async (req, reply) => {
    const { token, mode: modeRaw } = req.body ?? {}

    // Step 1 — validate input
    if (!token) {
      return reply
        .code(400)
        .send(makeError('MISSING_TOKEN', 'A token is required to run analysis.'))
    }

    if (!modeRaw || !VALID_MODES.includes(modeRaw)) {
      return reply
        .code(400)
        .send(
          makeError('INVALID_MODE', 'Mode must be one of: investor, personal, tenant, landlord.')
        )
    }

    const mode = modeRaw as ReportMode

    try {
      // Step 2 — look up listing
      const listing = await getListingByToken(token)
      if (!listing) {
        return reply.code(404).send(makeError('NOT_FOUND', 'Analysis not found or has expired.'))
      }

      // Step 3 — mark processing
      await updateAnalysisStatus(token, 'processing')

      // Step 4 — extract listing flags (never throws — result feeds the calc engine in a future step)
      if (listing.description) {
        await extractListingFlags(listing.description)
      }

      // Step 5 — build calc engine payload
      // For for-rent listings (tenant/landlord modes), listing.price is null.
      // Estimate property value from monthly rent at a ~6% gross yield proxy
      // so the calc engine can produce a deal score without failing validation.
      const estimatedPrice = listing.price ?? Math.round((listing.rentMonthly ?? 1500) * 200)

      const calcPayload = {
        property_data: {
          address: listing.address,
          province: listing.province,
          price: estimatedPrice,
          annual_taxes: listing.annualTaxes ?? 0,
          condo_fee_monthly: listing.condoFeeMonthly,
          condo_fee_known: listing.condoFeeKnown,
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          year_built: listing.yearBuilt,
          property_type: listing.propertyType,
          is_toronto: listing.city === 'Toronto',
        },
        financing: FINANCING_DEFAULTS,
        rental: {
          low: 0,
          mid: 0,
          high: 0,
          comp_count: 0,
          confidence: 'low',
          postal_code: listing.postalCode,
        },
      }

      // Step 6 — call calc engine
      let pyResponse: Response
      try {
        pyResponse = await fetch(`${CALC_ENGINE_URL}/analysis/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calcPayload),
        })
      } catch (err) {
        fastify.log.error({ err }, 'Calc engine unreachable')
        await updateAnalysisStatus(token, 'failed')
        return reply
          .code(503)
          .send(
            makeError(
              'CALC_ENGINE_UNAVAILABLE',
              'Analysis service is temporarily unavailable — try again in a moment.'
            )
          )
      }

      if (!pyResponse.ok) {
        const raw = await pyResponse.text().catch(() => '')
        fastify.log.error({ status: pyResponse.status, body: raw }, 'Calc engine returned error')
        await updateAnalysisStatus(token, 'failed')
        return reply
          .code(500)
          .send(
            makeError(
              'CALC_ENGINE_ERROR',
              'Analysis failed due to an internal error — try again shortly.'
            )
          )
      }

      const pyData = (await pyResponse.json()) as PyAnalysisOutput

      // Step 7 — geocode then walk score (sequential — walk score requires coordinates)
      const coords = await geocodeAddress(listing.address)
      const walkScore: WalkScoreResult | null = coords
        ? await getWalkScore(listing.address, coords.lat, coords.lng)
        : null

      // Step 8 — generate narrative (never throws)
      const flagLabels = pyData.risk_flags
        .map((f) => String(f.label ?? ''))
        .filter(Boolean)
        .join(', ')

      const narrativeInput: NarrativeInput = {
        mode,
        tier: 'free',
        address: listing.address,
        price: listing.price,
        capRate: pyData.metrics.cap_rate,
        cashFlowMonthly: pyData.metrics.cash_flow_monthly,
        cashFlowAnnual: pyData.metrics.cash_flow_annual,
        cashOnCash: pyData.metrics.cash_on_cash_return,
        dscr: pyData.metrics.dscr,
        dealScore: pyData.deal_score.total,
        dealVerdict: pyData.deal_score.verdict,
        rentMid: 0,
        compCount: 0,
        rentConfidence: 'low',
        breakEvenRent: pyData.metrics.break_even_rent,
        condoFeeMonthly: listing.condoFeeMonthly,
        condoFeeKnown: listing.condoFeeKnown,
        rentTrend: 'flat',
        vacancyRate: 0.02,
        riskFlagSummary: flagLabels || undefined,
      }

      const narrative = await generateNarrative(narrativeInput)

      // Step 9 — assemble Analysis object
      const analysis: Analysis = {
        id: token,
        token,
        mode,
        createdAt: new Date().toISOString(),
        metrics: toMetrics(pyData.metrics),
        dealScore: toDealScore(pyData.deal_score),
        rentalComps: null,
        riskFlags: pyData.risk_flags.map((f) => ({
          id: String(f.id ?? ''),
          severity: (f.severity as 'red' | 'amber') ?? 'amber',
          label: String(f.label ?? ''),
          evidence: (f.evidence as string | null) ?? null,
          confidence: Number(f.confidence ?? 0),
        })),
        narrative,
        walkScore,
        neighbourhood: null,
        hasSanityWarnings: pyData.has_sanity_warnings,
      }

      // Step 10 — save and return
      await updateAnalysisByToken(token, analysis)
      return reply.send({ token, analysis })
    } catch (err) {
      fastify.log.error({ err }, 'Unexpected error in POST /analysis')
      await updateAnalysisStatus(token, 'failed').catch(() => {})
      return reply.code(500).send(makeError('INTERNAL_ERROR', 'Something went wrong — try again.'))
    }
  })
}

export default analysisRoutes
