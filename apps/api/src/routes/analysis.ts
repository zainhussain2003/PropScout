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
  fetchRentalComps,
} from '../services/supabaseService'
import { generateNarrative, type NarrativeInput } from '../services/anthropicService'
import { geocodeAddress } from '../services/mapboxService'
import { getWalkScore } from '../services/walkScoreService'
import { getVacancyRateByCity } from '../services/cmhcService'
import { getMortgageRate } from '../services/bankOfCanadaService'
import { flagLabel } from '../constants/flagLabels'
import { estimateAnnualTaxes } from '../constants/propertyTaxRates'

const CALC_ENGINE_URL = process.env.CALC_ENGINE_URL ?? 'http://localhost:8000'

// Mortgage rate is overridden per-request by the live Bank of Canada rate
// (via bankOfCanadaService → calc engine /rates/mortgage). 0.0479 is the
// hardcoded fallback used by the calc engine when the live fetch fails — kept
// here too so tests don't need to mock the rate service.
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
  /** Calc engine uses snake_case `flag_id`; older callers may send `id`. */
  flag_id?: string
  id?: string
  severity?: string
  /** Calc engine doesn't send a label — orchestrator resolves it via flagLabel(). */
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

      // (The listing description is forwarded to the calc engine in the
      // payload below — the calc engine runs the full extraction pipeline
      // (regex + Haiku merge + confidence gating) and applies red-flag
      // deductions to the deal score. Doing extraction here too would be
      // duplicate work and the result would be ignored.)

      // Step 4 — fetch rental comps from nightly-scraped rental_listings.
      // Falls back to a low-confidence estimate from the listing's own rent
      // (or the price-based proxy) when the FSA has no comps yet.
      const comps = await fetchRentalComps(listing.postalCode, listing.beds).catch(() => null)

      const rentalFallback = listing.rentMonthly ?? Math.round((listing.price ?? 0) * 0.005) // ~0.5%/mo of price
      const rentalForCalc = comps ?? {
        low: Math.round(rentalFallback * 0.9),
        mid: rentalFallback,
        high: Math.round(rentalFallback * 1.1),
        compCount: 0,
        confidence: 'low' as const,
      }

      // Step 4b — live mortgage rate (falls back to FINANCING_DEFAULTS.mortgage_rate
      // when the BoC service is unreachable or returns 'fallback').
      const liveRate = await getMortgageRate().catch(() => null)
      const financingForCalc = {
        ...FINANCING_DEFAULTS,
        mortgage_rate: liveRate?.rate ?? FINANCING_DEFAULTS.mortgage_rate,
      }

      // Step 5 — build calc engine payload
      // For for-rent listings (tenant/landlord modes), listing.price is null.
      // Estimate property value from monthly rent at a ~6% gross yield proxy
      // so the calc engine can produce a deal score without failing validation.
      const estimatedPrice = listing.price ?? Math.round((listing.rentMonthly ?? 1500) * 200)

      // Estimate annual taxes from price + city when the scraper couldn't
      // find the actual value. Defaulting to 0 understated carrying costs
      // by $400–800/mo on a typical Ontario property.
      const annualTaxesForCalc =
        listing.annualTaxes ?? estimateAnnualTaxes(estimatedPrice, listing.city)

      const calcPayload = {
        // Forwarded so the calc engine runs the extraction pipeline and
        // deducts from the deal score for confirmed red flags.
        description: listing.description ?? null,
        property_data: {
          address: listing.address,
          province: listing.province,
          price: estimatedPrice,
          annual_taxes: annualTaxesForCalc,
          condo_fee_monthly: listing.condoFeeMonthly,
          condo_fee_known: listing.condoFeeKnown,
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          year_built: listing.yearBuilt,
          property_type: listing.propertyType,
          is_toronto: listing.city === 'Toronto',
        },
        financing: financingForCalc,
        rental: {
          low: rentalForCalc.low,
          mid: rentalForCalc.mid,
          high: rentalForCalc.high,
          comp_count: rentalForCalc.compCount,
          confidence: rentalForCalc.confidence,
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
      // The Python calc engine returns flag_id (not id) and no label; resolve
      // human-readable labels here for both the narrative + the UI payload.
      const resolvedFlags = pyData.risk_flags.map((f) => {
        const id = String(f.flag_id ?? f.id ?? '')
        return {
          id,
          severity: (f.severity as 'red' | 'amber') ?? 'amber',
          label: flagLabel(id),
          evidence: (f.evidence as string | null) ?? null,
          confidence: Number(f.confidence ?? 0),
        }
      })

      const flagLabels = resolvedFlags
        .map((f) => f.label)
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
        rentMid: rentalForCalc.mid,
        compCount: rentalForCalc.compCount,
        rentConfidence: rentalForCalc.confidence,
        breakEvenRent: pyData.metrics.break_even_rent,
        condoFeeMonthly: listing.condoFeeMonthly,
        condoFeeKnown: listing.condoFeeKnown,
        rentTrend: 'flat',
        vacancyRate: getVacancyRateByCity(listing.city),
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
        rentalComps: comps
          ? {
              low: comps.low,
              mid: comps.mid,
              high: comps.high,
              compCount: comps.compCount,
              confidence: comps.confidence,
              postalCode: listing.postalCode,
            }
          : null,
        riskFlags: resolvedFlags,
        narrative,
        walkScore,
        neighbourhood: null,
        sunScout: null,
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
