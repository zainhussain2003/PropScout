/**
 * Unit tests for anthropicService.ts — generateNarrative
 *
 * Covers:
 *   - Returns a string on success
 *   - Calls the Anthropic API with claude-sonnet-4-6
 *   - Returns null (non-fatal) when the API throws
 *   - Free tier uses shorter max_tokens than pro tier
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

const FREE_INPUT: NarrativeInput = {
  address: '5702 Buttermill Ave, Vaughan, ON',
  price: 729900,
  propertyType: 'condo',
  beds: 3,
  baths: 2,
  sqft: 1050,
  rentLow: 2700,
  rentMid: 2900,
  rentHigh: 3200,
  capRate: 0.0197,
  cashFlowMonthly: -2126.82,
  dscr: 0.36,
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

  it('returns a string on success', async () => {
    const expectedText =
      'At $729,900, this Vaughan condo generates deeply negative cash flow of -$2,127/mo on a deal score of 7/100.'
    getMockCreate().mockResolvedValueOnce(makeAnthropicResponse(expectedText))

    const result = await generateNarrative(FREE_INPUT)

    expect(typeof result).toBe('string')
    expect(result).toBe(expectedText)
  })

  it('calls the Anthropic API with model claude-sonnet-4-6', async () => {
    getMockCreate().mockResolvedValueOnce(makeAnthropicResponse('Some narrative text.'))

    await generateNarrative(FREE_INPUT)

    expect(getMockCreate()).toHaveBeenCalledTimes(1)
    const callArgs = getMockCreate().mock.calls[0][0] as { model: string; max_tokens: number }
    expect(callArgs.model).toBe('claude-sonnet-4-6')
  })

  it('returns null (non-fatal) when the API throws', async () => {
    getMockCreate().mockRejectedValueOnce(new Error('API rate limit exceeded'))

    const result = await generateNarrative(FREE_INPUT)

    expect(result).toBeNull()
  })

  it('uses smaller max_tokens for free tier than pro tier', async () => {
    getMockCreate().mockResolvedValue(makeAnthropicResponse('Text'))

    await generateNarrative(FREE_INPUT)
    const freeTokens = (getMockCreate().mock.calls[0][0] as { max_tokens: number }).max_tokens

    jest.clearAllMocks()
    getMockCreate().mockResolvedValue(makeAnthropicResponse('Text'))

    await generateNarrative(PRO_INPUT)
    const proTokens = (getMockCreate().mock.calls[0][0] as { max_tokens: number }).max_tokens

    expect(freeTokens).toBeLessThan(proTokens)
  })

  it('returns null when the API response contains no text block', async () => {
    getMockCreate().mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 'abc', name: 'foo', input: {} }],
      model: 'claude-sonnet-4-6',
    })

    const result = await generateNarrative(FREE_INPUT)

    expect(result).toBeNull()
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
