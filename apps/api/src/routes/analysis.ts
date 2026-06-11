/**
 * Analysis routes — POST /analysis and GET /analysis/:token
 *
 * POST /analysis
 *   Accepts camelCase input from the React frontend, converts it to snake_case
 *   before forwarding to the Python calc engine, fetches rental comps from
 *   Supabase, persists the result, and returns a camelCase analysis with a
 *   share token.
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
import type { InvestmentMetrics, DealScore, DealScoreBreakdown, Analysis } from '../types/analysis'
import { saveAnalysis, getAnalysisByToken, fetchRentalComps } from '../services/supabaseService'
import { generateNarrative } from '../services/anthropicService'
import type { NarrativeInput } from '../services/anthropicService'
import type { Listing } from '../types/property'

const CALC_ENGINE_URL = process.env.CALC_ENGINE_URL ?? 'http://localhost:8000'

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
    description: null,
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

    const reportMode = (body.mode as Analysis['mode']) ?? 'investor'

    const analysis: Analysis = {
      id: '',
      token: '',
      mode: reportMode,
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
            postalCode: comps.postalCode,
          }
        : null,
      riskFlags: pyData.risk_flags.map((f) => ({
        id: String(f.id ?? ''),
        severity: (f.severity as 'red' | 'amber') ?? 'amber',
        label: String(f.label ?? ''),
        evidence: (f.evidence as string | null) ?? null,
        confidence: Number(f.confidence ?? 0),
      })),
      narrative: null,
      hasSanityWarnings: pyData.has_sanity_warnings,
    }

    // Generate AI narrative — non-fatal: if it fails, analysis still returns with narrative: null.
    // Always generate free-tier narrative at MVP; Pro gating wired when auth is complete.
    if (analysis.metrics != null && analysis.dealScore != null) {
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
        capRate: analysis.metrics.capRate,
        cashFlowMonthly: analysis.metrics.cashFlowMonthly,
        dscr: analysis.metrics.dscr,
        dealScore: analysis.dealScore.total,
        dealVerdict: analysis.dealScore.verdict,
        riskFlags: analysis.riskFlags,
        tier: 'free',
      }

      const [narrativeResult] = await Promise.allSettled([generateNarrative(narrativeInput)])
      if (narrativeResult.status === 'fulfilled' && narrativeResult.value != null) {
        analysis.narrative = narrativeResult.value
      }
    }

    // Persist to Supabase — non-fatal; analysis still returns even if save fails.
    const userId = body.userId ?? null
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
