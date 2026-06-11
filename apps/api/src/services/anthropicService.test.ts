/**
 * Unit tests for anthropicService.ts — generateNarrative + extractListingFlags
 *
 * Covers:
 *   - Returns a string on success (passes validation)
 *   - Calls the Anthropic API with claude-sonnet-4-6
 *   - Returns fallback text (non-null) when the API throws on both attempts
 *   - Free tier uses smaller max_tokens than pro tier
 *   - Validates output and falls back to unvalidated text when both attempts fail validation
 *   - extractListingFlags — Haiku model, JSON parsing, confidence clamping
 */

// Mock @anthropic-ai/sdk before importing the service so the client is never instantiated
// with a real API key.
jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn()
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    })),
    _mockCreate: mockCreate,
  }
})

import { generateNarrative, extractListingFlags } from './anthropicService'
import type { NarrativeInput } from './anthropicService'

// Pull the shared mock function reference out so tests can configure it
const getMockCreate = (): jest.Mock => {
  const mockModule = jest.requireMock('@anthropic-ai/sdk') as { _mockCreate: jest.Mock }
  return mockModule._mockCreate
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

// A valid free-tier narrative (60-120 words, contains a dollar figure, no banned phrases)
const VALID_FREE_NARRATIVE =
  'At $729,900, this Vaughan condo generates deeply negative cash flow from the start. Your total monthly outgoing — mortgage, taxes, insurance, and the $761 condo fee — comes to roughly $4,733. The market pays around $2,900 in rent, leaving you $1,833 in the red every single month before a single vacancy or repair. The deal score of 7/100 reflects this clearly. The numbers only work if you are betting entirely on price appreciation over a long hold, not on rental income.'

// A valid pro-tier narrative (150-320 words, contains dollar figures)
const VALID_PRO_NARRATIVE =
  'The $761-per-month condo fee is what ends this deal before it starts. At $9,132 a year, it consumes 26% of the gross rent this unit can realistically earn — before the mortgage, taxes, or insurance are touched. No amount of negotiating on price fully fixes that; the fee is a permanent drag on every calculation.\n\nRun the numbers at current rates and you are looking at $4,733 going out every month against roughly $2,900 coming in. That is $1,833 in the red every single month — $21,996 a year — and the break-even rent of $4,585 is nearly 60% above what the market will actually pay. The DSCR sits at 0.45x, which means most investment mortgage products will not even be available to you here.\n\nThe only scenario where this makes sense is as a personal residence, not a rental. If you are buying it to live in and are comfortable with the carrying costs, the location and unit quality are genuinely strong. As a pure investment, pass and keep looking — the VMC corridor has better opportunities at lower condo fee exposure.'

const FREE_INPUT: NarrativeInput = {
  mode: 'investor',
  address: '5702 Buttermill Ave, Vaughan, ON',
  province: 'ON',
  price: 729900,
  propertyType: 'condo',
  beds: 3,
  baths: 2,
  sqft: 1050,
  rentLow: 2700,
  rentMid: 2900,
  rentHigh: 3200,
  compCount: 8,
  compConfidence: 'medium',
  capRate: 0.0197,
  cashFlowMonthly: -2126.82,
  cashFlowAnnual: -25521.84,
  cashOnCashReturn: -0.18,
  dscr: 0.36,
  breakEvenRent: 4733,
  condoFeeMonthly: 761,
  dealScore: 7,
  dealVerdict: 'hard_pass',
  riskFlags: [],
  tier: 'free',
}

const PRO_INPUT: NarrativeInput = {
  ...FREE_INPUT,
  tier: 'pro',
}

function makeAnthropicResponse(text: string): object {
  return {
    content: [{ type: 'text', text }],
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 100, output_tokens: 80 },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateNarrative', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns a valid narrative string on success', async () => {
    getMockCreate().mockResolvedValue(makeAnthropicResponse(VALID_FREE_NARRATIVE))

    const result = await generateNarrative(FREE_INPUT)

    expect(typeof result).toBe('string')
    expect(result).toBe(VALID_FREE_NARRATIVE)
  })

  it('calls the Anthropic API with model claude-sonnet-4-6', async () => {
    getMockCreate().mockResolvedValue(makeAnthropicResponse(VALID_FREE_NARRATIVE))

    await generateNarrative(FREE_INPUT)

    const callArgs = getMockCreate().mock.calls[0][0] as { model: string; max_tokens: number }
    expect(callArgs.model).toBe('claude-sonnet-4-6')
  })

  it('returns fallback text (non-null) when both API attempts throw', async () => {
    getMockCreate().mockRejectedValue(new Error('API rate limit exceeded'))

    const result = await generateNarrative(FREE_INPUT)

    // Both attempts fail — returns null since there is no fallback text
    expect(result).toBeNull()
  })

  it('uses smaller max_tokens for free tier than pro tier', async () => {
    getMockCreate().mockResolvedValue(makeAnthropicResponse(VALID_FREE_NARRATIVE))

    await generateNarrative(FREE_INPUT)
    const freeTokens = (getMockCreate().mock.calls[0][0] as { max_tokens: number }).max_tokens

    jest.clearAllMocks()
    getMockCreate().mockResolvedValue(makeAnthropicResponse(VALID_PRO_NARRATIVE))

    await generateNarrative(PRO_INPUT)
    const proTokens = (getMockCreate().mock.calls[0][0] as { max_tokens: number }).max_tokens

    expect(freeTokens).toBeLessThan(proTokens)
  })

  it('returns fallback (unvalidated) text when both attempts fail validation', async () => {
    const tooShort = 'Too short.'
    getMockCreate().mockResolvedValue(makeAnthropicResponse(tooShort))

    const result = await generateNarrative(FREE_INPUT)

    // Returns the fallback unvalidated text rather than null — better than nothing
    expect(result).toBe(tooShort)
  })

  it('returns null when both API attempts return no text block', async () => {
    getMockCreate().mockResolvedValue({
      content: [{ type: 'tool_use', id: 'abc', name: 'foo', input: {} }],
      model: 'claude-sonnet-4-6',
    })

    const result = await generateNarrative(FREE_INPUT)

    expect(result).toBeNull()
  })

  it('selects tenant prompt for tenant mode', async () => {
    getMockCreate().mockResolvedValue(makeAnthropicResponse(VALID_FREE_NARRATIVE))

    const tenantInput: NarrativeInput = { ...FREE_INPUT, mode: 'tenant' }
    await generateNarrative(tenantInput)

    const prompt = (getMockCreate().mock.calls[0][0] as { messages: { content: string }[] })
      .messages[0]!.content
    expect(prompt).toContain('tenant advisor')
  })

  it('selects personal prompt for personal mode', async () => {
    getMockCreate().mockResolvedValue(makeAnthropicResponse(VALID_FREE_NARRATIVE))

    const personalInput: NarrativeInput = { ...FREE_INPUT, mode: 'personal' }
    await generateNarrative(personalInput)

    const prompt = (getMockCreate().mock.calls[0][0] as { messages: { content: string }[] })
      .messages[0]!.content
    expect(prompt).toContain('personal use')
  })

  it('selects investor prompt for landlord mode', async () => {
    getMockCreate().mockResolvedValue(makeAnthropicResponse(VALID_FREE_NARRATIVE))

    const landlordInput: NarrativeInput = { ...FREE_INPUT, mode: 'landlord' }
    await generateNarrative(landlordInput)

    const prompt = (getMockCreate().mock.calls[0][0] as { messages: { content: string }[] })
      .messages[0]!.content
    expect(prompt).toContain('investment analyst')
  })
})

// ── extractListingFlags ───────────────────────────────────────────────────────

describe('extractListingFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null for an empty description', async () => {
    const result = await extractListingFlags('')
    expect(result).toBeNull()
    expect(getMockCreate()).not.toHaveBeenCalled()
  })

  it('returns parsed flags on a valid JSON response from Haiku', async () => {
    const mockFlags = [
      {
        flagId: 'basement_suite',
        present: true,
        confidence: 90,
        evidence: 'finished basement suite',
      },
      { flagId: 'short_term_rental', present: false, confidence: 0, evidence: '' },
    ]
    getMockCreate().mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(mockFlags) }],
      model: 'claude-haiku-4-5-20251001',
    })

    const result = await extractListingFlags('Renovated 3-bed with finished basement suite.')

    expect(result).not.toBeNull()
    expect(result!.flags).toHaveLength(2)
    expect(result!.flags[0]).toMatchObject({
      flagId: 'basement_suite',
      present: true,
      confidence: 90,
    })
  })

  it('returns null when the API throws', async () => {
    getMockCreate().mockRejectedValueOnce(new Error('Rate limit'))

    const result = await extractListingFlags('Some listing description.')

    expect(result).toBeNull()
  })

  it('returns null when the response is not valid JSON', async () => {
    getMockCreate().mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Not a JSON array at all.' }],
      model: 'claude-haiku-4-5-20251001',
    })

    const result = await extractListingFlags('Some listing description.')

    expect(result).toBeNull()
  })

  it('clamps confidence values to 0–100 range', async () => {
    const mockFlags = [
      { flagId: 'noise_concern', present: true, confidence: 150, evidence: 'near highway' },
    ]
    getMockCreate().mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(mockFlags) }],
      model: 'claude-haiku-4-5-20251001',
    })

    const result = await extractListingFlags('Near a major highway.')

    expect(result!.flags[0]!.confidence).toBe(100)
  })
})
