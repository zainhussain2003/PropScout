import Anthropic from '@anthropic-ai/sdk'
import type { Analysis, RiskFlag } from '../types/analysis'

// Two models are used:
//   claude-haiku-4-5-20251001 — listing description extraction (fast, cheap)
//   claude-sonnet-4-6         — narrative generation (higher quality)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type NarrativeTier = 'free' | 'pro'

export interface NarrativeInput {
  // Report routing
  mode: 'investor' | 'personal' | 'tenant' | 'landlord'

  // Property basics
  address: string
  province: string
  price: number
  propertyType: string
  beds: number
  baths: number
  sqft: number | null

  // Rental market (all modes)
  rentLow: number
  rentMid: number
  rentHigh: number
  compCount: number
  compConfidence: 'low' | 'medium' | 'high'

  // Investment metrics (investor / landlord modes)
  capRate: number
  cashFlowMonthly: number
  cashFlowAnnual: number
  cashOnCashReturn: number
  dscr: number
  breakEvenRent: number
  condoFeeMonthly: number | null

  // Deal assessment
  dealScore: number
  dealVerdict: NonNullable<Analysis['dealScore']>['verdict']

  // Risk flags
  riskFlags: RiskFlag[]

  // Tier determines narrative length
  tier: NarrativeTier
}

const SYSTEM_PROMPT =
  'You are a Canadian real estate analyst. Write direct, data-driven verdicts in plain English. Use Canadian English. Reference specific dollar figures. Never use bullet points or numbered lists in your response.'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCAD(n: number): string {
  return `$${Math.round(n).toLocaleString('en-CA')}`
}

function buildFlagsList(flags: RiskFlag[]): string {
  const red = flags.filter((f) => f.severity === 'red').map((f) => f.label)
  const amber = flags.filter((f) => f.severity === 'amber').map((f) => f.label)
  if (red.length === 0 && amber.length === 0) return 'None'
  const parts: string[] = []
  if (red.length > 0) parts.push(`Red: ${red.join(', ')}`)
  if (amber.length > 0) parts.push(`Amber: ${amber.join(', ')}`)
  return parts.join(' | ')
}

function verdictLabel(v: NonNullable<Analysis['dealScore']>['verdict']): string {
  return v.replace(/_/g, ' ')
}

// ── Prompt builders ───────────────────────────────────────────────────────────

/** Report A & D — investment purchase / landlord rental */
function buildInvestorPrompt(input: NarrativeInput): string {
  const sqftPart = input.sqft != null ? `, ${input.sqft.toLocaleString('en-CA')} sqft` : ''
  const condoFeePart =
    input.condoFeeMonthly != null ? `${fmtCAD(input.condoFeeMonthly)}/mo` : 'None'
  const tierInstruction =
    input.tier === 'free'
      ? '1 short paragraph, 4–5 sentences, 60–120 words'
      : '3 paragraphs, 150–280 words'

  return `You are a senior Canadian real estate investment analyst writing a deal verdict.

PROPERTY: ${input.address}
PRICE: ${fmtCAD(input.price)}
PROVINCE: ${input.province}
TYPE: ${input.propertyType}, ${input.beds} bed / ${input.baths} bath${sqftPart}

METRICS:
- Cap rate: ${(input.capRate * 100).toFixed(2)}%
- Monthly cash flow: ${fmtCAD(input.cashFlowMonthly)}/mo (annual: ${fmtCAD(input.cashFlowAnnual)})
- Cash-on-cash return: ${(input.cashOnCashReturn * 100).toFixed(2)}%
- DSCR: ${input.dscr.toFixed(2)}x
- Deal score: ${input.dealScore}/100 — ${verdictLabel(input.dealVerdict)}
- Estimated rent: ${fmtCAD(input.rentMid)}/mo (${input.compCount} comparables, confidence: ${input.compConfidence})
- Rent range: ${fmtCAD(input.rentLow)}–${fmtCAD(input.rentHigh)}/mo
- Break-even rent: ${fmtCAD(input.breakEvenRent)}/mo
- Condo fee: ${condoFeePart}

RISK FLAGS: ${buildFlagsList(input.riskFlags)}

Write a ${tierInstruction} investment verdict:
${
  input.tier === 'free'
    ? 'The single most important fact about this deal. Use dollar amounts.'
    : `1. The single most important fact — the one thing that determines whether to proceed.
2. The 2–3 specific numbers that back this up. Use dollar amounts, not just percentages.
3. One concrete next step or the exact condition under which this deal would work.`
}

Rules: second person ("you"). Be direct. Plain paragraphs only. No bullet points. Do not mention PropScout. Do not say "as an AI." Assume the reader has seen all the numbers — add judgment, not repetition.`
}

/** Report B — personal purchase */
function buildPersonalPrompt(input: NarrativeInput): string {
  const sqftPart = input.sqft != null ? `, ${input.sqft.toLocaleString('en-CA')} sqft` : ''
  const tierInstruction =
    input.tier === 'free'
      ? '1 short paragraph, 4–5 sentences, 60–120 words'
      : '3 paragraphs, 150–240 words'

  return `You are a real estate advisor helping someone decide whether to buy a home for personal use.

PROPERTY: ${input.address}
ASKING PRICE: ${fmtCAD(input.price)}
TYPE: ${input.propertyType}, ${input.beds} bed / ${input.baths} bath${sqftPart}
MONTHLY CARRYING COST: ${fmtCAD(input.breakEvenRent)}/mo (mortgage + taxes + insurance + condo fee)
COMPARABLE SALES RANGE: Based on ${input.compCount} comparable sales (confidence: ${input.compConfidence})
RISK FLAGS: ${buildFlagsList(input.riskFlags)}

Write a ${tierInstruction} personal buyer verdict:
${
  input.tier === 'free'
    ? 'Is this priced fairly and what is the most important thing to know before making an offer? Use dollar amounts.'
    : `1. Is this priced fairly relative to recent comparable sales?
2. The most important practical consideration for this buyer.
3. What they should do before making an offer.`
}

Rules: second person. Warm but direct. Plain paragraphs only. No bullet points. Do not mention PropScout. Do not say "as an AI." Assume the reader has seen all the numbers.`
}

/** Report C — tenant evaluation */
function buildTenantPrompt(input: NarrativeInput): string {
  const leverage = ((): string => {
    const above = input.rentMid - input.rentHigh
    if (above > 100)
      return `High — asking rent is ${fmtCAD(above)} above the top of the market range`
    if (input.rentMid > input.rentHigh) return 'Moderate — asking rent is above market'
    if (input.rentMid <= input.rentLow) return 'Strong — asking rent is at or below market'
    return 'Low — asking rent is within the typical market range'
  })()

  const tierInstruction =
    input.tier === 'free'
      ? '1 short paragraph, 4–5 sentences, 60–120 words'
      : '2 paragraphs, 150–180 words'

  return `You are a tenant advisor reviewing a rental listing.

UNIT: ${input.address}
ASKING RENT: ${fmtCAD(input.rentMid)}/mo
MARKET RANGE: ${fmtCAD(input.rentLow)}–${fmtCAD(input.rentHigh)}/mo (${input.compCount} comparables, confidence: ${input.compConfidence})
LEVERAGE: ${leverage}
FLAGS: ${buildFlagsList(input.riskFlags)}

Write a ${tierInstruction} tenant verdict:
${
  input.tier === 'free'
    ? 'Is this priced fairly? Should they negotiate? What is the one thing they must confirm before signing? Use dollar amounts.'
    : `1. Is this priced fairly? Should they negotiate, and to what target rent?
2. The one thing they must confirm before signing.`
}

Rules: second person. Direct. Plain paragraphs only. No bullet points. Do not mention PropScout. Do not say "as an AI." Assume the reader has seen all the numbers.`
}

// ── Output validation ─────────────────────────────────────────────────────────

const BANNED_PHRASES = ['as an AI', 'as an ai', 'I cannot', 'PropScout', 'language model']
const DOLLAR_RE = /\$[\d,]+/

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function validateNarrative(
  text: string,
  tier: NarrativeTier,
  mode: NarrativeInput['mode']
): boolean {
  const words = countWords(text)
  const [minWords, maxWords] = ((): [number, number] => {
    if (tier === 'free') return [60, 120]
    if (mode === 'tenant') return [150, 180]
    if (mode === 'personal') return [150, 240]
    return [150, 320] // investor / landlord
  })()

  if (words < minWords || words > maxWords) return false
  if (BANNED_PHRASES.some((p) => text.includes(p))) return false
  if (!DOLLAR_RE.test(text)) return false
  return true
}

// ── Narrative generation ──────────────────────────────────────────────────────

function selectPrompt(input: NarrativeInput): string {
  switch (input.mode) {
    case 'personal':
      return buildPersonalPrompt(input)
    case 'tenant':
      return buildTenantPrompt(input)
    case 'investor':
    case 'landlord':
    default:
      return buildInvestorPrompt(input)
  }
}

/**
 * Generate an AI narrative for a property analysis report.
 *
 * Free tier: 1 paragraph, 60–120 words.
 * Pro and above: 2–3 paragraphs (length varies by mode).
 *
 * Validates output and retries once on failure.
 * Returns null if both attempts fail — narrative failure must never crash the report.
 */
export async function generateNarrative(input: NarrativeInput): Promise<string | null> {
  const prompt = selectPrompt(input)
  const maxTokens = input.tier === 'free' ? 200 : 700

  async function attempt(): Promise<string | null> {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = response.content[0]
      if (block.type !== 'text') return null
      return block.text.trim()
    } catch {
      return null
    }
  }

  const first = await attempt()
  if (first != null && validateNarrative(first, input.tier, input.mode)) return first

  // Retry once on validation failure or API error
  const second = await attempt()
  if (second != null && validateNarrative(second, input.tier, input.mode)) return second

  // Return whatever we have rather than null, so the report has something to show
  return second ?? first
}

// ── Flag types returned by Haiku extraction ──────────────────────────────────

export interface FlagExtractionResult {
  flags: ExtractionFlag[]
  rawResponse: string
}

export interface ExtractionFlag {
  flagId: string
  present: boolean
  confidence: number
  evidence: string
}

const EXTRACTION_PROMPT_TEMPLATE = `You are a Canadian real estate listing analyst. Extract structured investment risk flags from the listing description below.

For each flag type, output whether it is present, your confidence (0–100), and a brief quoted evidence string from the description. If a flag is not mentioned or cannot be inferred, set present: false and confidence: 0.

Flag types to detect:
- basement_suite: Evidence of a legal or illegal basement unit (income potential or fire risk)
- short_term_rental: Evidence of AirBnB / Vrbo use or STR-optimized setup
- shared_laundry: Laundry is shared with other units or in common area
- coin_laundry: Pay-per-use laundry (lower quality signal)
- street_parking_only: No dedicated parking, street parking only
- first_floor_unit: Unit is on the ground floor (security, privacy concern)
- condo_fee_includes_utilities: Condo fee covers heat, hydro, or water (affects NOI)
- tenant_occupied: Unit currently has a tenant (rent control implications)
- power_of_sale: Listing is a power of sale or foreclosure
- as_is_where_is: Property sold as-is, seller makes no representations
- no_representation: Seller has no knowledge of property condition
- grow_op_history: History of marijuana grow operation or remediation
- remediation_done: Environmental or mold remediation has been completed
- flooding_history: Past flooding, water damage, or sump pump failures mentioned
- noise_concern: Near highway, subway, airport, or industrial area

Return ONLY a JSON array. No explanation, no markdown, no preamble.
Format:
[{"flagId":"flag_name","present":true,"confidence":85,"evidence":"exact quote or empty string"},...]

LISTING DESCRIPTION:
{{DESCRIPTION}}`

/**
 * Extract structured flags from a listing description using Claude Haiku.
 *
 * Returns an array of extraction flags with confidence scores.
 * The logic gate in the analysis pipeline applies the 85%/60% thresholds
 * to decide which flags reach the deal score calculation (spec Section 19).
 *
 * Returns null (non-fatal) if the API call fails.
 */
export async function extractListingFlags(
  description: string
): Promise<FlagExtractionResult | null> {
  if (!description.trim()) return null

  const prompt = EXTRACTION_PROMPT_TEMPLATE.replace('{{DESCRIPTION}}', description.slice(0, 4000))

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = response.content[0]
    if (!block || block.type !== 'text') return null

    const raw = block.text.trim()

    let parsed: ExtractionFlag[]
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as ExtractionFlag[]
    } catch {
      return null
    }

    if (!Array.isArray(parsed)) return null

    const flags: ExtractionFlag[] = parsed
      .filter((f) => typeof f === 'object' && f !== null && typeof f.flagId === 'string')
      .map((f) => ({
        flagId: String(f.flagId),
        present: Boolean(f.present),
        confidence: Math.min(100, Math.max(0, Number(f.confidence) || 0)),
        evidence: typeof f.evidence === 'string' ? f.evidence : '',
      }))

    return { flags, rawResponse: raw }
  } catch {
    return null
  }
}

export { client as anthropicClient }
