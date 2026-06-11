/**
 * Analysis routes — POST /analysis and GET /analysis/:token
 *
 * POST /analysis
 *   Accepts camelCase input from the React frontend, converts it to snake_case
 *   before forwarding to the Python calc engine, fetches rental comps from
 *   Supabase, persists the result, and returns a camelCase analysis with a
 *   share token.
 *
 *   Optional JWT auth (Authorization: Bearer <token>):
 *   - Identifies the user and applies free-tier analysis limits (10/month).
 *   - Determines narrative tier (free = 1 paragraph, pro = full narrative).
 *   - Unauthenticated requests are treated as guest (no limit, no save to user).
 *
 *   Optional Haiku extraction (listingDescription in body):
 *   - Runs Claude Haiku flag extraction on the raw description.
 *   - Applies confidence thresholds: ≥85% → red flag, 60–84% → amber, <60% → ignored.
 *   - Merges with calc-engine risk_flags.
 *
 * GET /analysis/:token
 *   Retrieves a saved analysis by its share token. Returns 404 if not found
 *   or expired.
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
  RiskFlag,
  SunScoutResult,
} from '../types/analysis'
import {
  saveAnalysis,
  getAnalysisByToken,
  fetchRentalComps,
  getUserById,
  getMonthlyAnalysisCount,
  getSupabase,
} from '../services/supabaseService'
import { generateNarrative, extractListingFlags } from '../services/anthropicService'
import type { NarrativeInput } from '../services/anthropicService'
import { geocodeAddress } from '../services/mapboxService'
import type { Listing } from '../types/property'
import { FREE_TIER } from '../constants/tiers'
import { CONFIDENCE } from '../constants/thresholds'
import { isOntarioPostalCode } from '../constants/provinces'

const CALC_ENGINE_URL = process.env.CALC_ENGINE_URL ?? 'http://localhost:8000'

// Human-readable labels for Haiku-extracted flag IDs
const FLAG_LABELS: Record<string, string> = {
  basement_suite: 'Basement suite',
  short_term_rental: 'Short-term rental setup',
  shared_laundry: 'Shared laundry',
  coin_laundry: 'Coin laundry',
  street_parking_only: 'Street parking only',
  first_floor_unit: 'Ground floor unit',
  condo_fee_includes_utilities: 'Condo fee includes utilities',
  tenant_occupied: 'Tenant occupied',
  power_of_sale: 'Power of sale',
  as_is_where_is: 'Sold as-is',
  no_representation: 'No seller representation',
  grow_op_history: 'Grow-op history',
  remediation_done: 'Remediation completed',
  flooding_history: 'Flooding history',
  noise_concern: 'Noise concern',
}

// ── Frontend camelCase input types ────────────────────────────────────────────

interface CamelPropertyData {
  address: string
  province?: string
  price: number
  annualTaxes: number
  condoFeeMonthly?: number | null
  condoFeeKnown?: boolean
  beds: number
  baths: number
  sqft?: number | null
  yearBuilt?: number | null
  propertyType?: string
  isToronto?: boolean
  postalCode?: string
  sourceUrl?: string
  listingType?: 'for-sale' | 'for-rent'
  /** Listing's asking rent for for-rent listings — drives tenant leverage. */
  askingRentMonthly?: number | null
  lat?: number | null
  lng?: number | null
}

interface CamelFinancing {
  downPaymentPct: number
  mortgageRate: number
  amortizationYears: number
  includeManagementFee?: boolean
}

interface CamelRental {
  low: number
  mid: number
  high: number
  compCount: number
  confidence: 'low' | 'medium' | 'high'
  postalCode: string
}

interface CamelAnalysisRequest {
  propertyData: CamelPropertyData
  financing: CamelFinancing
  rental: CamelRental
  mode?: string
  /** Raw listing description text — run through Haiku extraction pipeline. */
  listingDescription?: string
  /** @deprecated Pass JWT via Authorization header instead. */
  userId?: string
}

// ── Python snake_case types (sent to calc engine) ─────────────────────────────

interface SnakePropertyData {
  address: string
  province: string
  price: number
  annual_taxes: number
  condo_fee_monthly: number | null
  condo_fee_known: boolean
  beds: number
  baths: number
  sqft: number | null
  year_built: number | null
  property_type: string
  is_toronto: boolean
  lat: number | null
  lng: number | null
}

interface SnakeFinancing {
  down_payment_pct: number
  mortgage_rate: number
  amortization_years: number
  include_management_fee: boolean
}

interface SnakeRental {
  low: number
  mid: number
  high: number
  comp_count: number
  confidence: 'low' | 'medium' | 'high'
  postal_code: string
}

interface SnakeAnalysisRequest {
  property_data: SnakePropertyData
  financing: SnakeFinancing
  rental: SnakeRental
  /** Raw listing description — calc engine runs extraction + score deductions. */
  description: string | null
}

// ── camelCase → snake_case input conversion ───────────────────────────────────

function isCamelCaseRequest(body: unknown): body is CamelAnalysisRequest {
  return typeof body === 'object' && body !== null && 'propertyData' in body
}

/**
 * Validate the shape of an analysis request beyond the camelCase type guard.
 * Returns a human-readable problem string, or null when the request is valid.
 *
 * Never trust frontend data — a missing rental.postalCode previously crashed
 * the route with an unhandled TypeError (500) instead of a clean 400.
 */
function findRequestProblem(body: CamelAnalysisRequest): string | null {
  const p = body.propertyData as Partial<CamelPropertyData> | undefined
  const f = body.financing as Partial<CamelFinancing> | undefined
  const r = body.rental as Partial<CamelRental> | undefined

  if (p == null || typeof p !== 'object') return 'propertyData is required'
  if (typeof p.address !== 'string' || p.address.trim() === '')
    return 'propertyData.address is required'
  if (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price <= 0)
    return 'propertyData.price must be a positive number'
  if (typeof p.annualTaxes !== 'number' || !Number.isFinite(p.annualTaxes))
    return 'propertyData.annualTaxes must be a number'
  if (typeof p.beds !== 'number') return 'propertyData.beds must be a number'
  if (typeof p.baths !== 'number') return 'propertyData.baths must be a number'

  if (f == null || typeof f !== 'object') return 'financing is required'
  if (typeof f.downPaymentPct !== 'number') return 'financing.downPaymentPct must be a number'
  if ((f.downPaymentPct as number) < 0 || (f.downPaymentPct as number) > 1)
    return 'financing.downPaymentPct must be between 0 and 1'
  if (typeof f.mortgageRate !== 'number') return 'financing.mortgageRate must be a number'
  if ((f.mortgageRate as number) <= 0 || (f.mortgageRate as number) >= 1)
    return 'financing.mortgageRate must be between 0 and 1 (e.g. 0.0479 for 4.79%)'
  if (typeof f.amortizationYears !== 'number') return 'financing.amortizationYears must be a number'

  if (r == null || typeof r !== 'object') return 'rental is required'
  if (typeof r.low !== 'number' || typeof r.mid !== 'number' || typeof r.high !== 'number')
    return 'rental.low, rental.mid, and rental.high must be numbers'
  if ((r.low as number) > (r.mid as number) || (r.mid as number) > (r.high as number))
    return 'rental estimates must satisfy: low ≤ mid ≤ high'
  if (typeof r.postalCode !== 'string') return 'rental.postalCode is required'

  return null
}

function toSnakeRequest(
  body: CamelAnalysisRequest,
  rentalOverride?: CamelAnalysisRequest['rental'],
  lat: number | null = null,
  lng: number | null = null
): SnakeAnalysisRequest {
  const p = body.propertyData
  const f = body.financing
  const r = rentalOverride ?? body.rental
  return {
    property_data: {
      address: p.address,
      province: p.province ?? 'ON',
      price: p.price,
      annual_taxes: p.annualTaxes,
      condo_fee_monthly: p.condoFeeMonthly ?? null,
      condo_fee_known: p.condoFeeKnown ?? false,
      beds: p.beds,
      baths: p.baths,
      sqft: p.sqft ?? null,
      year_built: p.yearBuilt ?? null,
      property_type: p.propertyType ?? 'condo',
      is_toronto: p.isToronto ?? false,
      lat: lat ?? p.lat ?? null,
      lng: lng ?? p.lng ?? null,
    },
    financing: {
      down_payment_pct: f.downPaymentPct,
      mortgage_rate: f.mortgageRate,
      amortization_years: f.amortizationYears,
      include_management_fee: f.includeManagementFee ?? false,
    },
    rental: {
      low: r.low,
      mid: r.mid,
      high: r.high,
      comp_count: r.compCount,
      confidence: r.confidence,
      postal_code: r.postalCode,
    },
    // Forwarded so the calc engine's extraction pipeline (regex + Haiku +
    // logic gate) can apply red-flag deductions to the deal score (spec §10/§19).
    description: body.listingDescription?.trim() || null,
  }
}

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
  /** Calc engine serialises the id as `flag_id`; `id` kept for compatibility. */
  flag_id?: string
  id?: string
  severity?: string
  label?: string
  evidence?: string | null
  confidence?: number
  [key: string]: unknown
}

interface PySunScout {
  annual_peak_sun_hours: number
  summer_daily_hours: number
  winter_daily_hours: number
  seasonal_grid: Record<string, number>
  monthly_hours: number[]
  sun_score: number
  verdict: string
}

interface PyAnalysisOutput {
  metrics: PyInvestmentMetrics
  deal_score: PyDealScore
  risk_flags: PyRiskFlag[]
  has_sanity_warnings: boolean
  sun_scout: PySunScout | null
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

/**
 * Build a minimal Listing object from the analysis request for persistence.
 */
function buildListingFromRequest(body: CamelAnalysisRequest): Listing {
  const p = body.propertyData
  return {
    id: '',
    url: p.sourceUrl ?? `manual:${encodeURIComponent(p.address)}`,
    listingType: (p.listingType ?? 'for-sale') as Listing['listingType'],
    address: p.address,
    city: '',
    province: (p.province ?? 'ON') as Listing['province'],
    postalCode: p.postalCode ?? body.rental.postalCode ?? '',
    price: p.price,
    rentMonthly: null,
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft ?? null,
    propertyType: (p.propertyType ?? 'condo') as Listing['propertyType'],
    yearBuilt: p.yearBuilt ?? null,
    parkingSpots: 0,
    condoFeeMonthly: p.condoFeeMonthly ?? null,
    condoFeeKnown: p.condoFeeKnown ?? false,
    annualTaxes: p.annualTaxes,
    description: body.listingDescription ?? null,
    photos: [],
    scrapedAt: new Date().toISOString(),
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

async function analysisRoutes(fastify: FastifyInstance): Promise<void> {
  // ── POST / — run analysis ──────────────────────────────────────────────────
  fastify.post('/', async (req, reply) => {
    if (!isCamelCaseRequest(req.body)) {
      return reply
        .code(400)
        .send(makeError('INVALID_REQUEST', 'Request must use camelCase property names.'))
    }

    const body = req.body

    // ── Server-side input validation — never trust frontend data ──────────
    const problem = findRequestProblem(body)
    if (problem != null) {
      return reply
        .code(400)
        .send(
          makeError(
            'INVALID_REQUEST',
            'One or more required fields are missing or invalid.',
            problem
          )
        )
    }

    // ── Optional JWT auth ──────────────────────────────────────────────────
    // Reads userId and tier from Supabase JWT. Unauthenticated requests run
    // as guest (no user limit applied, analysis saved without user_id).
    let userId: string | null = null
    let userTier: 'free' | 'pro' | 'professional' | 'team' = 'free'

    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const jwtToken = authHeader.slice(7)
      const { data: authData, error: authError } = await getSupabase().auth.getUser(jwtToken)
      if (!authError && authData.user) {
        userId = authData.user.id

        const userRow = await getUserById(userId)
        if (userRow) {
          userTier = userRow.tier

          // Enforce free tier monthly analysis limit
          if (userTier === 'free') {
            const monthlyCount = await getMonthlyAnalysisCount(userId)
            if (monthlyCount >= FREE_TIER.MONTHLY_ANALYSIS_LIMIT) {
              return reply
                .code(429)
                .send(
                  makeError(
                    'FREE_LIMIT_REACHED',
                    `You have used all ${FREE_TIER.MONTHLY_ANALYSIS_LIMIT} free analyses this month. Upgrade to Pro for unlimited analyses.`
                  )
                )
            }
          }
        }
      }
    }

    // ── Province gate — MVP: Ontario only ─────────────────────────────────────
    const province = body.propertyData.province ?? 'ON'
    const postalCode = body.rental.postalCode
    if (
      province.toUpperCase() !== 'ON' ||
      (postalCode.length > 0 && !isOntarioPostalCode(postalCode))
    ) {
      return reply
        .code(400)
        .send(
          makeError(
            'PROVINCE_NOT_SUPPORTED',
            "PropScout currently covers Ontario only. We'll notify you when your province goes live."
          )
        )
    }

    const beds = body.propertyData.beds

    // Attempt to fetch live rental comps from Supabase.
    // If none are found, fall back to the manually provided rental estimates.
    let comps: CamelAnalysisRequest['rental'] | null = null
    try {
      const dbComps = await fetchRentalComps(postalCode, beds)
      if (dbComps != null) {
        comps = {
          low: dbComps.low,
          mid: dbComps.mid,
          high: dbComps.high,
          compCount: dbComps.compCount,
          confidence: dbComps.confidence,
          postalCode,
        }
      }
    } catch (err) {
      // Non-fatal — fall back to manual estimates
      fastify.log.warn({ err }, 'fetchRentalComps failed — using manual rental estimates')
    }

    const rentalForCalcEngine = comps ?? body.rental

    // Attempt geocoding for SunScout (non-fatal — returns null when Mapbox not configured)
    let geoLat: number | null = body.propertyData.lat ?? null
    let geoLng: number | null = body.propertyData.lng ?? null
    if (geoLat == null || geoLng == null) {
      try {
        const geo = await geocodeAddress(body.propertyData.address)
        if (geo != null) {
          geoLat = geo.lat
          geoLng = geo.lng
        }
      } catch (err) {
        fastify.log.warn({ err }, 'geocodeAddress failed — SunScout will be skipped')
      }
    }

    const snakeBody = toSnakeRequest(body, rentalForCalcEngine, geoLat, geoLng)

    let pyResponse: Response
    try {
      pyResponse = await fetch(`${CALC_ENGINE_URL}/analysis/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snakeBody),
      })
    } catch (err) {
      fastify.log.error({ err }, 'Calc engine unreachable')
      return reply
        .code(503)
        .send(
          makeError(
            'CALC_ENGINE_UNAVAILABLE',
            'Analysis service is temporarily unavailable — try again in a moment.',
            String(err)
          )
        )
    }

    if (!pyResponse.ok) {
      const raw = await pyResponse.text().catch(() => '')
      fastify.log.error({ status: pyResponse.status, body: raw }, 'Calc engine returned error')

      if (pyResponse.status === 422) {
        return reply
          .code(422)
          .send(
            makeError(
              'INVALID_ANALYSIS_INPUT',
              'One or more input values are invalid — check the property details and try again.',
              raw
            )
          )
      }

      return reply
        .code(500)
        .send(
          makeError(
            'CALC_ENGINE_ERROR',
            'Analysis failed due to an internal error — try again shortly.',
            raw
          )
        )
    }

    const pyData = (await pyResponse.json()) as PyAnalysisOutput

    const VALID_MODES = ['investor', 'personal', 'tenant', 'landlord'] as const
    const rawMode = body.mode
    const reportMode: Analysis['mode'] = VALID_MODES.includes(rawMode as Analysis['mode'])
      ? (rawMode as Analysis['mode'])
      : 'investor'

    // Build calc-engine risk flags first.
    // The calc engine serialises ids as `flag_id` and omits labels — map both.
    const calcEngineFlags: RiskFlag[] = pyData.risk_flags.map((f) => {
      const flagId = String(f.flag_id ?? f.id ?? '')
      return {
        id: flagId,
        severity: (f.severity as 'red' | 'amber') ?? 'amber',
        label: String(f.label ?? FLAG_LABELS[flagId] ?? flagId),
        evidence: (f.evidence as string | null) ?? null,
        confidence: Number(f.confidence ?? 0),
      }
    })

    const metricsResult = toMetrics(pyData.metrics)
    const dealScoreResult = toDealScore(pyData.deal_score)

    // ── Haiku extraction (must complete before narrative) ──────────────────
    // Extracted flags are fed into the Sonnet narrative prompt so the AI can
    // reference specific risk factors from the listing description (spec §19).
    // Running in parallel meant flags never reached Sonnet — fixed by awaiting first.
    let extractedFlags: RiskFlag[] = []
    if (body.listingDescription?.trim()) {
      const extractionResult = await extractListingFlags(body.listingDescription).catch(() => null)
      if (extractionResult != null) {
        extractedFlags = extractionResult.flags
          .filter((f) => f.present && f.confidence >= CONFIDENCE.AMBER_FLAG_MIN)
          .map(
            (f): RiskFlag => ({
              id: f.flagId,
              severity: f.confidence >= CONFIDENCE.RED_FLAG_MIN ? 'red' : 'amber',
              label: FLAG_LABELS[f.flagId] ?? f.flagId,
              evidence: f.evidence || null,
              confidence: f.confidence,
            })
          )
      }
    }

    // Merge extracted Haiku flags with calc-engine flags.
    // Extracted flags take priority — if Haiku and the calc engine both fire
    // the same flagId, the Haiku version (with evidence) wins.
    const extractedIds = new Set(extractedFlags.map((f) => f.id))
    const mergedFlags: RiskFlag[] = [
      ...extractedFlags,
      ...calcEngineFlags.filter((f) => !extractedIds.has(f.id)),
    ]

    // ── Narrative (runs after extraction so merged flags reach Sonnet) ─────
    const narrativeInput: NarrativeInput = {
      mode: reportMode,
      address: body.propertyData.address,
      province: body.propertyData.province ?? 'ON',
      price: body.propertyData.price,
      propertyType: body.propertyData.propertyType ?? 'condo',
      beds: body.propertyData.beds,
      baths: body.propertyData.baths,
      sqft: body.propertyData.sqft ?? null,
      rentLow: rentalForCalcEngine.low,
      rentMid: rentalForCalcEngine.mid,
      rentHigh: rentalForCalcEngine.high,
      compCount: comps?.compCount ?? 0,
      compConfidence: comps?.confidence ?? 'low',
      askingRent: body.propertyData.askingRentMonthly ?? null,
      capRate: metricsResult.capRate,
      cashFlowMonthly: metricsResult.cashFlowMonthly,
      cashFlowAnnual: metricsResult.cashFlowAnnual,
      cashOnCashReturn: metricsResult.cashOnCashReturn,
      dscr: metricsResult.dscr,
      breakEvenRent: metricsResult.breakEvenRent,
      condoFeeMonthly: body.propertyData.condoFeeMonthly ?? null,
      dealScore: dealScoreResult.total,
      dealVerdict: dealScoreResult.verdict,
      riskFlags: mergedFlags,
      tier: userTier === 'free' ? 'free' : 'pro',
    }

    const narrative = await generateNarrative(narrativeInput).catch(() => null)

    const analysis: Analysis = {
      id: '',
      token: '',
      mode: reportMode,
      createdAt: new Date().toISOString(),
      metrics: metricsResult,
      dealScore: dealScoreResult,
      rentalComps: comps
        ? {
            low: comps.low,
            mid: comps.mid,
            high: comps.high,
            compCount: comps.compCount,
            confidence: comps.confidence,
            postalCode: comps.postalCode,
          }
        : null,
      riskFlags: mergedFlags,
      narrative,
      hasSanityWarnings: pyData.has_sanity_warnings,
      sunScout: pyData.sun_scout
        ? ({
            annualPeakSunHours: pyData.sun_scout.annual_peak_sun_hours,
            summerDailyHours: pyData.sun_scout.summer_daily_hours,
            winterDailyHours: pyData.sun_scout.winter_daily_hours,
            seasonalGrid: pyData.sun_scout.seasonal_grid as SunScoutResult['seasonalGrid'],
            monthlyHours: pyData.sun_scout.monthly_hours,
            sunScore: pyData.sun_scout.sun_score,
            verdict: pyData.sun_scout.verdict as SunScoutResult['verdict'],
          } satisfies SunScoutResult)
        : null,
    }

    // Persist to Supabase — non-fatal; analysis still returns even if save fails.
    const listing = buildListingFromRequest(body)
    const token = await saveAnalysis(analysis, listing, userId)
    if (token != null) {
      analysis.token = token
    }

    return reply.send(analysis)
  })

  // ── GET /:token — retrieve saved analysis by share token ───────────────────
  fastify.get<{ Params: { token: string } }>('/:token', async (req, reply) => {
    const { token } = req.params

    if (typeof token !== 'string' || token.trim().length === 0) {
      return reply.code(400).send(makeError('INVALID_TOKEN', 'A valid token is required.'))
    }

    const result = await getAnalysisByToken(token)

    if (result == null) {
      return reply
        .code(404)
        .send(makeError('ANALYSIS_NOT_FOUND', 'This report has expired or does not exist.'))
    }

    return reply.send(result)
  })
}

export default analysisRoutes
