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
  getFlagOverrides,
  getNearbySchools,
} from '../services/supabaseService'
import { generateNarrative, type NarrativeInput } from '../services/anthropicService'
import { geocodeAddress } from '../services/mapboxService'
import { getWalkScore } from '../services/walkScoreService'
import { getNearbyDistances } from '../services/googlePlacesService'
import { getNeighbourhoodStats } from '../services/statsCanService'
import { getVacancyRateByCity } from '../services/cmhcService'
import { getMortgageRate } from '../services/bankOfCanadaService'
import { flagLabel } from '../constants/flagLabels'
import { estimateAnnualTaxes } from '../constants/propertyTaxRates'
import { RENT_BOUNDS, CALC_ENGINE_TIMEOUT_MS } from '../constants/thresholds'
import { serializeError, isTimeoutError } from '../lib/http'
import {
  RENT_TO_PRICE_MONTHLY,
  FALLBACK_RENT_BAND,
  DEFAULT_RENT_MONTHLY,
} from '../constants/valuation'
import { estimateValueFromRent } from '../constants/marketCapRates'

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
  display_total: number
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
  /** Per-mode severity tier from the flag matrix: severe|red|amber. */
  tier?: string
  /** Calc engine doesn't send a label — orchestrator resolves it via flagLabel(). */
  label?: string
  evidence?: string | null
  confidence?: number
  [key: string]: unknown
}

export interface PySunScout {
  annual_peak_sun_hours: number
  summer_daily_hours: number
  winter_daily_hours: number
  seasonal_grid: { Dec: number; Mar: number; Jun: number; Sep: number }
  monthly_hours: number[]
  sun_score: number
  verdict: string
}

interface PyAnalysisOutput {
  metrics: PyInvestmentMetrics
  deal_score: PyDealScore
  risk_flags: PyRiskFlag[]
  has_sanity_warnings: boolean
  /** Present only when lat/lng were sent and the sun-path calc succeeded. */
  sun_scout?: PySunScout | null
}

// ── snake_case → camelCase output transforms ──────────────────────────────────

export function toSunScout(py: PySunScout | null | undefined): Analysis['sunScout'] {
  if (py == null) return null
  return {
    annualPeakSunHours: py.annual_peak_sun_hours,
    summerDailyHours: py.summer_daily_hours,
    winterDailyHours: py.winter_daily_hours,
    seasonalGrid: py.seasonal_grid,
    monthlyHours: py.monthly_hours,
    sunScore: py.sun_score,
    verdict: py.verdict as NonNullable<Analysis['sunScout']>['verdict'],
  }
}

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
    displayTotal: py.display_total,
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

      const rentalFallback =
        listing.rentMonthly ?? Math.round((listing.price ?? 0) * RENT_TO_PRICE_MONTHLY)
      const rentalForCalc = comps ?? {
        low: Math.round(rentalFallback * (1 - FALLBACK_RENT_BAND)),
        mid: rentalFallback,
        high: Math.round(rentalFallback * (1 + FALLBACK_RENT_BAND)),
        compCount: 0,
        confidence: 'low' as const,
      }

      // Rent plausibility gate (decision 2026-07-01): a mid outside
      // $500–$10,000/mo means the listing carried no usable rent/price (or a
      // legacy row stored a unit error) — scoring it would produce confident
      // garbage. Fail the analysis with a friendly message instead.
      //
      // The gate only applies to OBSERVED rents (the listing's own rent or a
      // comps mid). A for-sale listing with no comps derives its mid from the
      // asking price (~6% gross-yield proxy) — a $3.5M home legitimately
      // proxies to >$10k/mo and must not hard-fail (live bug 2026-07-02);
      // the calc engine's sanity bounds still flag extreme proxy rents. A
      // rent-less FOR-RENT listing has no price either, so its $0 mid still
      // fails the gate as designed.
      const midIsSalePriceProxy =
        comps == null && listing.rentMonthly == null && (listing.price ?? 0) > 0
      if (
        !midIsSalePriceProxy &&
        (rentalForCalc.mid < RENT_BOUNDS.MIN_MONTHLY || rentalForCalc.mid > RENT_BOUNDS.MAX_MONTHLY)
      ) {
        await updateAnalysisStatus(token, 'failed')
        return reply
          .code(422)
          .send(
            makeError(
              'RENT_OUT_OF_BOUNDS',
              'The rent on this listing looks implausible — check the listing or enter details manually.'
            )
          )
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
      // Estimate value from rent via the per-city cap rate + residual-expense
      // ratio (NOI / capRate), subtracting actual tax + condo fee when present
      // so they're never double-counted. Keeps the calc engine able to score.
      const estimatedPrice =
        listing.price ??
        estimateValueFromRent({
          rentMonthly: listing.rentMonthly ?? DEFAULT_RENT_MONTHLY,
          city: listing.city,
          propertyType: listing.propertyType,
          annualTaxes: listing.annualTaxes,
          condoFeeMonthly: listing.condoFeeMonthly,
        })

      // Estimate annual taxes from price + city when the scraper couldn't
      // find the actual value. Defaulting to 0 understated carrying costs
      // by $400–800/mo on a typical Ontario property.
      const annualTaxesForCalc =
        listing.annualTaxes ?? estimateAnnualTaxes(estimatedPrice, listing.city)

      // Real per-city CMHC vacancy rate — feeds both the deal score's demand
      // component (calc engine) and the narrative, so they stay consistent.
      const cmhcVacancyRate = getVacancyRateByCity(listing.city)

      // Flags the user previously dismissed for this analysis — forwarded so a
      // re-run drops their score deduction. Non-essential: any failure (or a
      // missing value) defaults to no dismissals; the analysis never fails here.
      let dismissedFlagIds: string[] = []
      try {
        dismissedFlagIds = (await getFlagOverrides(token)) ?? []
      } catch {
        dismissedFlagIds = []
      }

      // Geocode BEFORE the calc engine call — lat/lng in property_data is what
      // makes the calc engine's SunScout (sun-path) branch fire. Non-fatal:
      // null coords just skip SunScout and the real map.
      const coords = await geocodeAddress(listing.address)

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
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
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
        cmhc_vacancy_rate: cmhcVacancyRate,
        dismissed_flag_ids: dismissedFlagIds,
        mode,
      }

      // Step 6 — call calc engine (explicit timeout: survives the public-edge
      // limit and never hangs undici's default; shares the scrape path's fix).
      let pyResponse: Response
      try {
        pyResponse = await fetch(`${CALC_ENGINE_URL}/analysis/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calcPayload),
          signal: AbortSignal.timeout(CALC_ENGINE_TIMEOUT_MS.ANALYSIS),
        })
      } catch (err) {
        fastify.log.error(
          { err: serializeError(err), timedOut: isTimeoutError(err) },
          'Calc engine unreachable'
        )
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

      // Step 7 — walk score (uses the coordinates geocoded before the calc call)
      const walkScore: WalkScoreResult | null = coords
        ? await getWalkScore(listing.address, coords.lat, coords.lng)
        : null

      // Step 7b — nearest schools from the schools table (spec: 3 per level,
      // distance-ranked, catchment NOT verified). Null until the EQAO/Fraser
      // CSV is loaded or when geocoding failed — the report shows "data
      // pending", and this lights up the moment the table has rows.
      let schools: Analysis['schools'] = null
      if (coords) {
        try {
          schools = (await getNearbySchools(coords.lat, coords.lng)) ?? null
        } catch {
          schools = null
        }
      }

      // Step 7c — nearby amenity distances (Google Places): transit, grocery,
      // highway on-ramp, pharmacy. Null when no coords / key missing / no results.
      let nearbyDistances: Analysis['nearbyDistances'] = null
      if (coords) {
        try {
          const d = await getNearbyDistances(coords.lat, coords.lng)
          nearbyDistances = d.length > 0 ? d : null
        } catch {
          nearbyDistances = null
        }
      }

      // Step 7d — census stats (StatsCan) for the listing's FSA: median household
      // income + 5-year population growth. Null when the FSA isn't in the table.
      let neighbourhoodStats: Analysis['neighbourhoodStats'] = null
      try {
        neighbourhoodStats = await getNeighbourhoodStats(listing.postalCode)
      } catch {
        neighbourhoodStats = null
      }

      // Step 8 — generate narrative (never throws)
      // The Python calc engine returns flag_id (not id) and no label; resolve
      // human-readable labels here for both the narrative + the UI payload.
      const resolvedFlags = pyData.risk_flags.map((f) => {
        const id = String(f.flag_id ?? f.id ?? '')
        return {
          id,
          severity: (f.severity as 'red' | 'amber') ?? 'amber',
          tier: (f.tier as 'severe' | 'red' | 'amber') ?? 'amber',
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
        vacancyRate: cmhcVacancyRate,
        riskFlagSummary: flagLabels || undefined,
        // Tenant-verdict inputs — without these the tenant prompt saw only $0
        // asking/range and wrongly concluded "no market data available" even
        // when §01 showed real comps.
        askingRent: listing.rentMonthly ?? undefined,
        rentLow: rentalForCalc.low,
        rentHigh: rentalForCalc.high,
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
        nearbyDistances,
        neighbourhoodStats,
        sunScout: toSunScout(pyData.sun_scout),
        coordinates: coords != null ? { lat: coords.lat, lng: coords.lng } : null,
        schools,
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
