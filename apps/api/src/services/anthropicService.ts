/* eslint-disable no-console */
import Anthropic from '@anthropic-ai/sdk'
import type { ReportMode } from '../types/analysis'

// Two models are used:
//   claude-haiku-4-5-20251001 — listing description extraction (fast, cheap)
//   claude-sonnet-4-6         — narrative generation (higher quality)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface NarrativeInput {
  mode: ReportMode
  tier: 'free' | 'pro'
  address: string

  // Investment + Landlord (Report A / D)
  price?: number | null
  capRate?: number
  cashFlowMonthly?: number
  cashFlowAnnual?: number
  cashOnCash?: number
  dscr?: number
  dealScore?: number
  dealVerdict?: string
  rentMid?: number
  compCount?: number
  rentConfidence?: string
  breakEvenRent?: number
  condoFeeMonthly?: number | null
  condoFeeKnown?: boolean
  rentControlStatus?: string
  osfiResult?: string
  vacancyRate?: number
  rentTrend?: string
  riskFlagSummary?: string

  // Personal buyer (Report B)
  monthlyOwnershipCost?: number
  fmvLow?: number
  fmvHigh?: number
  pbCompCount?: number
  walkScore?: number | null
  transitScore?: number | null

  // Tenant (Report C)
  askingRent?: number
  rentLow?: number
  rentHigh?: number
  leverageLevel?: string
  leverageReason?: string
  lightScore?: number | null
}

const NARRATIVE_FALLBACK =
  'Analysis complete. Narrative temporarily unavailable — all metrics and scores above are accurate.'

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return 'N/A'
  return `$${Math.round(n).toLocaleString('en-CA')}`
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return 'N/A'
  return `${(n * 100).toFixed(decimals)}%`
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return 'N/A'
  return n.toFixed(decimals)
}

function buildInvestmentPrompt(input: NarrativeInput): string {
  const condoFee =
    input.condoFeeMonthly == null
      ? 'N/A'
      : `${fmtCurrency(input.condoFeeMonthly)}/mo (${input.condoFeeKnown ? 'confirmed' : 'estimated'})`

  const tierInstruction =
    input.tier === 'free'
      ? 'Write 1 paragraph only. 60–120 words.'
      : 'Write 3 paragraphs as specified. Maximum 280 words.'

  return `You are a senior Canadian real estate investment analyst writing a deal verdict.

PROPERTY: ${input.address}
PRICE: ${fmtCurrency(input.price)}

METRICS:
- Cap rate: ${fmtPct(input.capRate)}
- Monthly cash flow: ${fmtCurrency(input.cashFlowMonthly)}/mo (annual: ${fmtCurrency(input.cashFlowAnnual)})
- Cash-on-cash return: ${fmtPct(input.cashOnCash)}
- DSCR: ${fmtNum(input.dscr)}x
- Deal score: ${input.dealScore ?? 'N/A'}/100 — ${input.dealVerdict ?? 'N/A'}
- Estimated rent: ${fmtCurrency(input.rentMid)}/mo (${input.compCount ?? 'N/A'} comparables, confidence: ${input.rentConfidence ?? 'N/A'})
- Break-even rent: ${fmtCurrency(input.breakEvenRent)}/mo
- Condo fee: ${condoFee}
- Rent control: ${input.rentControlStatus ?? 'N/A'}
- OSFI stress test: ${input.osfiResult ?? 'N/A'}

RISK FLAGS: ${input.riskFlagSummary ?? 'None identified'}
MARKET: Vacancy ${fmtPct(input.vacancyRate)}, rent trend ${input.rentTrend ?? 'N/A'}

Write a 3-paragraph investment verdict:
1. The single most important fact — the one thing that determines whether to proceed.
2. The 2–3 specific numbers that back this up. Use dollar amounts, not just percentages.
3. One concrete next step or the exact condition under which this deal would work.

Rules: second person ("you"). Be direct. Maximum 280 words. Plain paragraphs only.
No bullet points. Do not mention PropScout. Do not say "as an AI."
Assume the reader has seen all the numbers already — add judgment, not repetition.

${tierInstruction}`
}

function buildPersonalPrompt(input: NarrativeInput): string {
  const walkScore = input.walkScore != null ? String(input.walkScore) : 'N/A'
  const transitScore = input.transitScore != null ? String(input.transitScore) : 'N/A'
  const tierInstruction =
    input.tier === 'free'
      ? 'Write 1 paragraph only. 60–120 words.'
      : 'Write 3 paragraphs as specified. Maximum 240 words.'

  return `You are a real estate advisor helping someone decide whether to buy a home for personal use.

PROPERTY: ${input.address}
ASKING PRICE: ${fmtCurrency(input.price)}
MONTHLY OWNERSHIP COST: ${fmtCurrency(input.monthlyOwnershipCost)}/mo
FAIR MARKET VALUE: ${fmtCurrency(input.fmvLow)} – ${fmtCurrency(input.fmvHigh)} based on ${input.pbCompCount ?? 'N/A'} comparable sales
WALK SCORE: ${walkScore} | TRANSIT SCORE: ${transitScore}

Write a 3-paragraph verdict:
1. Is this priced fairly relative to recent comparable sales?
2. The most important practical consideration for this buyer.
3. What they should do before making an offer.

Rules: second person. Warm but direct. Maximum 240 words. Plain paragraphs only.
Do not mention PropScout.

${tierInstruction}`
}

function buildTenantPrompt(input: NarrativeInput): string {
  const lightScore = input.lightScore != null ? String(input.lightScore) : 'N/A'
  const tierInstruction =
    input.tier === 'free'
      ? 'Write 1 paragraph only. 60–120 words.'
      : 'Write 2 paragraphs as specified.'

  // Do we actually have comparable rentals? Only claim "no market data" when we
  // genuinely don't — otherwise anchor the verdict on the median + comp count.
  const hasComps = (input.compCount ?? 0) > 0
  const marketBlock = hasComps
    ? `MARKET MEDIAN: ${fmtCurrency(input.rentMid)}/mo across ${input.compCount} comparable rentals (range ${fmtCurrency(input.rentLow)} – ${fmtCurrency(input.rentHigh)}/mo)`
    : `MARKET DATA: none — no comparable rentals for this area yet`

  const marketRule = hasComps
    ? 'You HAVE market data: compare the asking rent to the median and cite the number of comparables. Do NOT say market data is unavailable.'
    : 'You have NO comparable rentals — say plainly that market rent cannot be benchmarked yet, and do not invent a target number.'

  return `You are a tenant advisor reviewing a rental listing.

UNIT: ${input.address}
ASKING RENT: ${fmtCurrency(input.askingRent)}/mo
${marketBlock}
LEVERAGE: ${input.leverageLevel ?? 'N/A'} — ${input.leverageReason ?? 'N/A'}
FLAGS: ${input.riskFlagSummary ?? 'None identified'}
SUNSCOUT: ${lightScore}/100

Write a 2-paragraph verdict:
1. Is this priced fairly? Should they negotiate, and to what target?
2. The one thing they must confirm before signing.

Rules: second person. Direct. Maximum 180 words. Plain paragraphs only.
Do not mention PropScout. ${marketRule}

${tierInstruction}`
}

/**
 * Generate an AI narrative for a property analysis report.
 *
 * Free tier: 1 paragraph, 60–120 words.
 * Pro and above: 2–3 paragraphs, 150–320 words.
 *
 * Never call this function directly from a route handler.
 * Always call through this service file.
 */
export async function generateNarrative(input: NarrativeInput): Promise<string> {
  try {
    let prompt: string
    if (input.mode === 'investor' || input.mode === 'landlord') {
      prompt = buildInvestmentPrompt(input)
    } else if (input.mode === 'personal') {
      prompt = buildPersonalPrompt(input)
    } else {
      prompt = buildTenantPrompt(input)
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = response.content[0]
    if (!block || block.type !== 'text') {
      console.error(`generateNarrative: non-text content block for mode=${input.mode}`)
      return NARRATIVE_FALLBACK
    }

    return block.text
  } catch (err) {
    console.error(`generateNarrative: error for mode=${input.mode}, tier=${input.tier}:`, err)
    return NARRATIVE_FALLBACK
  }
}

/**
 * Extract structured flags from a listing description using Claude Haiku.
 * Returns a JSON object of flag keys and confidence scores.
 *
 * Never feed raw description text into deal score calculations.
 * All text must pass through this extraction pipeline first (spec Section 19).
 */
export async function extractListingFlags(description: string): Promise<Record<string, unknown>> {
  if (!description || !description.trim()) {
    return {}
  }

  const prompt = `Analyze this real estate listing description and extract structured flags.

Output ONLY valid JSON — no explanation, no preamble, no markdown fences.
For each flag, if there is no clear signal in the description, omit it
entirely. Default to omitting rather than guessing.

Each included flag must have this shape:
{ "confidence": <0-100>, "evidence": "<short quote from text, or null>" }

Flags to look for:
- glass_door_bedroom
- is_basement_unit
- parking_unclear
- unverified_bedroom
- special_assessment_risk
- tenanted
- str_history
- utilities_included
- utilities_extra
- needs_work
- pets_allowed
- no_pets

Listing description:
${description}`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = response.content[0]
    if (!block || block.type !== 'text') {
      return {}
    }

    let raw = block.text.trim()
    // Strip accidental markdown fences — the model occasionally adds them despite instructions
    raw = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error(
        `extractListingFlags: JSON parse failed, raw length=${raw.length}, preview="${raw.slice(0, 200)}"`
      )
      return {}
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {}
    }

    return parsed as Record<string, unknown>
  } catch (err) {
    console.error(
      `extractListingFlags: API error for description length=${description.length}:`,
      err
    )
    return {}
  }
}

export { client as anthropicClient }
