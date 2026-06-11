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

/**
 * Extract structured flags from a listing description using Claude Haiku.
 * Returns a JSON object of flag keys and confidence scores.
 *
 * Never feed raw description text into deal score calculations.
 * All text must pass through this extraction pipeline first (spec Section 19).
 */
export async function extractListingFlags(_description: string): Promise<Record<string, unknown>> {
  // TODO: implement extraction prompt — see spec Section 19
  throw new Error('extractListingFlags: not yet implemented')
}

export { client as anthropicClient }
