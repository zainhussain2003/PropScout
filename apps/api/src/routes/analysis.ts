/**
 * Analysis route — accepts camelCase input from the React frontend,
 * converts it to snake_case before forwarding to the Python calc engine,
 * transforms the snake_case response into camelCase, and returns it.
 *
 * Input format handled:
 *   - camelCase (from React frontend via analysisService.ts)
 *     e.g. { propertyData: { annualTaxes: 3326 }, financing: { downPaymentPct: 0.2 } }
 *   - snake_case (legacy / direct callers, passed through unchanged)
 *     e.g. { property_data: { annual_taxes: 3326 }, financing: { down_payment_pct: 0.2 } }
 *
 * Registered in app.ts with prefix "/analysis":
 *   await fastify.register(import('./routes/analysis'), { prefix: '/analysis' })
 * Fastify dynamic import requires a default export.
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import type { InvestmentMetrics, DealScore, DealScoreBreakdown, Analysis } from '../types/analysis'

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

function toSnakeRequest(body: CamelAnalysisRequest): SnakeAnalysisRequest {
  const p = body.propertyData
  const f = body.financing
  const r = body.rental
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

// ── Route ─────────────────────────────────────────────────────────────────────

async function analysisRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/', async (req, reply) => {
    // Detect format: camelCase frontend input is converted to snake_case
    // before forwarding; snake_case input (legacy / direct) passes through.
    const snakeBody: unknown = isCamelCaseRequest(req.body) ? toSnakeRequest(req.body) : req.body

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

    const analysis: Analysis = {
      id: '', // populated by Supabase when persistence is wired
      token: '', // populated when share-link generation is wired
      mode: 'investor',
      createdAt: new Date().toISOString(),
      metrics: toMetrics(pyData.metrics),
      dealScore: toDealScore(pyData.deal_score),
      rentalComps: null, // populated when comps are wired
      riskFlags: pyData.risk_flags.map((f) => ({
        id: String(f.id ?? ''),
        severity: (f.severity as 'red' | 'amber') ?? 'amber',
        label: String(f.label ?? ''),
        evidence: (f.evidence as string | null) ?? null,
        confidence: Number(f.confidence ?? 0),
      })),
      narrative: null, // populated when AI narrative is wired
      hasSanityWarnings: pyData.has_sanity_warnings,
    }

    return reply.send(analysis)
  })
}

export default analysisRoutes
