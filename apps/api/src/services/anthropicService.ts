import Anthropic from '@anthropic-ai/sdk'
import type { Analysis, RiskFlag } from '../types/analysis'

// Two models are used:
//   claude-haiku-4-5-20251001 — listing description extraction (fast, cheap)
//   claude-sonnet-4-6         — narrative generation (higher quality)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type NarrativeTier = 'free' | 'pro'

export interface NarrativeInput {
  address: string
  price: number
  propertyType: string
  beds: number
  baths: number
  sqft: number | null
  rentLow: number
  rentMid: number
  rentHigh: number
  capRate: number
  cashFlowMonthly: number
  dscr: number
  dealScore: number
  dealVerdict: NonNullable<Analysis['dealScore']>['verdict']
  riskFlags: RiskFlag[]
  tier: NarrativeTier
}

/**
 * Build a summary of red risk flags for inclusion in the narrative prompt.
 * Returns "None" if no red flags are present.
 */
function buildFlagsSummary(flags: RiskFlag[]): string {
  const redFlags = flags.filter((f) => f.severity === 'red')
  if (redFlags.length === 0) return 'None'
  return redFlags.map((f) => f.label).join(', ')
}

/**
 * Build the user-facing narrative prompt for an investor report.
 * Free tier: brief 1-paragraph (60–120 words).
 * Pro tier: full 2–3 paragraph narrative (150–320 words).
 */
function buildInvestorPrompt(input: NarrativeInput): string {
  const {
    address,
    price,
    propertyType,
    beds,
    baths,
    sqft,
    rentLow,
    rentMid,
    rentHigh,
    capRate,
    cashFlowMonthly,
    dscr,
    dealScore,
    dealVerdict,
    riskFlags,
    tier,
  } = input

  const sqftPart = sqft != null ? `, ${sqft.toLocaleString('en-CA')} sqft` : ''
  const flagsSummary = buildFlagsSummary(riskFlags)
  const tierInstruction =
    tier === 'free'
      ? 'brief 1-paragraph investor narrative (60–120 words)'
      : 'full 2–3 paragraph investor narrative (150–320 words)'

  return `Analyse this property for an investor:
Address: ${address}
Price: $${price.toLocaleString('en-CA')}
Property type: ${propertyType}, ${beds} bed / ${baths} bath${sqftPart}
Asking rent range: $${rentLow.toLocaleString('en-CA')}–$${rentHigh.toLocaleString('en-CA')}/mo (mid: $${rentMid.toLocaleString('en-CA')})
Cap rate: ${(capRate * 100).toFixed(2)}%
Monthly cash flow: $${cashFlowMonthly.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
DSCR: ${dscr.toFixed(2)}x
Deal score: ${dealScore}/100 — ${dealVerdict.replace(/_/g, ' ')}
Risk flags: ${flagsSummary}

Write a ${tierInstruction} about whether this is a good investment. Focus on the numbers. Do NOT start with "I" or "This property". Canadian English.`
}

const NARRATIVE_SYSTEM_PROMPT =
  'You are a Canadian real estate investment analyst. Write concise, data-driven investment narrative. Use Canadian English. Be direct about the deal quality. Reference specific numbers.'

/**
 * Generate an AI narrative for a property analysis report.
 *
 * Free tier: 1 paragraph, 60–120 words.
 * Pro and above: 2–3 paragraphs, 150–320 words.
 *
 * Returns null if the API call fails — narrative failure must never crash the report.
 * Never call this function directly from a route handler.
 * Always call through this service file.
 */
export async function generateNarrative(input: NarrativeInput): Promise<string | null> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: input.tier === 'free' ? 200 : 600,
      system: NARRATIVE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildInvestorPrompt(input),
        },
      ],
    })

    const block = response.content[0]
    if (block.type !== 'text') return null
    return block.text.trim()
  } catch (err) {
    // Narrative failure is non-fatal — the report still loads without it
    return null
  }
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
