import Anthropic from '@anthropic-ai/sdk'
import type { Analysis } from '../types/analysis'

// Two models are used:
//   claude-haiku-4-5-20251001 — listing description extraction (fast, cheap)
//   claude-sonnet-4-6         — narrative generation (higher quality)

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface NarrativeInput {
  address: string
  capRate: number
  cashFlowMonthly: number
  dscr: number
  dealVerdict: Analysis['dealScore'] extends null ? never : NonNullable<Analysis['dealScore']>['verdict']
  riskFlagSummary: string
  tier: 'free' | 'pro'
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
  // TODO: implement prompt — see spec Section 12 for gold-standard examples
  throw new Error('generateNarrative: not yet implemented')
}

/**
 * Extract structured flags from a listing description using Claude Haiku.
 * Returns a JSON object of flag keys and confidence scores.
 *
 * Never feed raw description text into deal score calculations.
 * All text must pass through this extraction pipeline first (spec Section 19).
 */
export async function extractListingFlags(description: string): Promise<Record<string, unknown>> {
  // TODO: implement extraction prompt — see spec Section 19
  throw new Error('extractListingFlags: not yet implemented')
}

export { client as anthropicClient }
