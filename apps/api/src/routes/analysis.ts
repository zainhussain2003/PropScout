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
import type { Listing } from '../types/property'
import { FREE_TIER } from '../constants/tiers'
import { CONFIDENCE } from '../constants/thresholds'

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
}

// ── camelCase → snake_case input conversion ───────────────────────────────────

function isCamelCaseRequest(body: unknown): body is CamelAnalysisRequest {
  return typeof body === 'object' && body !== null && 'propertyData' in body
}

function toSnakeRequest(
  body: CamelAnalysisRequest,
  rentalOverride?: CamelAnalysisRequest['rental']
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

    const postalCode = body.rental.postalCode
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
    const snakeBody = toSnakeRequest(body, rentalForCalcEngine)

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

    // ── Haiku flag extraction (parallel with narrative) ────────────────────
    // Run extraction and narrative concurrently — both are non-fatal.
    const reportMode = (body.mode as Analysis['mode']) ?? 'investor'

    // Build calc-engine risk flags before merging
    const calcEngineFlags: RiskFlag[] = pyData.risk_flags.map((f) => ({
      id: String(f.id ?? ''),
      severity: (f.severity as 'red' | 'amber') ?? 'amber',
      label: String(f.label ?? ''),
      evidence: (f.evidence as string | null) ?? null,
      confidence: Number(f.confidence ?? 0),
    }))

    const metricsResult = toMetrics(pyData.metrics)
    const dealScoreResult = toDealScore(pyData.deal_score)

    const narrativeInput: NarrativeInput = {
      address: body.propertyData.address,
      price: body.propertyData.price,
      propertyType: body.propertyData.propertyType ?? 'condo',
      beds: body.propertyData.beds,
      baths: body.propertyData.baths,
      sqft: body.propertyData.sqft ?? null,
      rentLow: rentalForCalcEngine.low,
      rentMid: rentalForCalcEngine.mid,
      rentHigh: rentalForCalcEngine.high,
      capRate: metricsResult.capRate,
      cashFlowMonthly: metricsResult.cashFlowMonthly,
      dscr: metricsResult.dscr,
      dealScore: dealScoreResult.total,
      dealVerdict: dealScoreResult.verdict,
      riskFlags: calcEngineFlags,
      tier: userTier === 'free' ? 'free' : 'pro',
    }

    const [narrativeSettled, extractionSettled] = await Promise.allSettled([
      generateNarrative(narrativeInput),
      body.listingDescription?.trim()
        ? extractListingFlags(body.listingDescription)
        : Promise.resolve(null),
    ])

    // Merge extracted Haiku flags with calc-engine flags.
    // Extracted flags take priority — if Haiku and the calc engine both fire
    // the same flagId, the Haiku version (with evidence) wins.
    let extractedFlags: RiskFlag[] = []
    if (extractionSettled.status === 'fulfilled' && extractionSettled.value != null) {
      extractedFlags = extractionSettled.value.flags
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

    const extractedIds = new Set(extractedFlags.map((f) => f.id))
    const mergedFlags: RiskFlag[] = [
      ...extractedFlags,
      ...calcEngineFlags.filter((f) => !extractedIds.has(f.id)),
    ]

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
      narrative:
        narrativeSettled.status === 'fulfilled' && narrativeSettled.value != null
          ? narrativeSettled.value
          : null,
      hasSanityWarnings: pyData.has_sanity_warnings,
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
