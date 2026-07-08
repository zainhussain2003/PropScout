const mockMessagesCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: { create: mockMessagesCreate },
  })),
}))

import { extractListingFlags, generateNarrative, type NarrativeInput } from './anthropicService'

function makeTextResponse(text: string): { content: Array<{ type: string; text: string }> } {
  return { content: [{ type: 'text', text }] }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('extractListingFlags', () => {
  it('valid description with clear signals → flags parsed correctly, confidence and evidence present', async () => {
    const flags = {
      is_basement_unit: { confidence: 92, evidence: 'finished lower level' },
      pets_allowed: { confidence: 88, evidence: 'pets welcome' },
    }
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(JSON.stringify(flags)))

    const result = await extractListingFlags('Beautiful finished lower level unit. Pets welcome!')

    expect(result).toEqual(flags)
    const basement = result.is_basement_unit as { confidence: number; evidence: string }
    expect(basement.confidence).toBe(92)
    expect(basement.evidence).toBe('finished lower level')
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
  })

  it('empty string → returns {} without calling the API', async () => {
    const result = await extractListingFlags('')
    expect(result).toEqual({})
    expect(mockMessagesCreate).not.toHaveBeenCalled()
  })

  it('whitespace-only string → returns {} without calling the API', async () => {
    const result = await extractListingFlags('   \n\t  ')
    expect(result).toEqual({})
    expect(mockMessagesCreate).not.toHaveBeenCalled()
  })

  it('model returns valid JSON with no flags → returns {}', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse('{}'))
    const result = await extractListingFlags('Beautiful condo in downtown Toronto.')
    expect(result).toEqual({})
  })

  it('model returns JSON wrapped in markdown fences → still parses correctly', async () => {
    const flags = { needs_work: { confidence: 95, evidence: 'sold as-is' } }
    const fenced = '```json\n' + JSON.stringify(flags) + '\n```'
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(fenced))

    const result = await extractListingFlags('Sold as-is, priced to sell.')
    expect(result).toEqual(flags)
  })

  it('model returns malformed JSON → returns {}, does not throw', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse('{ not: valid json }'))
    await expect(extractListingFlags('Some listing description.')).resolves.toEqual({})
  })

  it('API throws network error → returns {}, does not throw', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('Network error'))
    await expect(extractListingFlags('Some listing description.')).resolves.toEqual({})
  })
})

const FALLBACK =
  'Analysis complete. Narrative temporarily unavailable — all metrics and scores above are accurate.'

const BASE_INVESTOR: NarrativeInput = {
  mode: 'investor',
  tier: 'pro',
  address: '5702 Buttermill Ave, Vaughan, ON',
  price: 729_900,
  capRate: 0.025,
  cashFlowMonthly: -1833,
  cashFlowAnnual: -21_996,
  cashOnCash: -0.125,
  dscr: 0.45,
  dealScore: 9,
  dealVerdict: 'hard_pass',
  rentMid: 2900,
  compCount: 8,
  rentConfidence: 'medium',
  breakEvenRent: 4585,
  condoFeeMonthly: 761,
  condoFeeKnown: true,
  rentControlStatus: 'applies',
  osfiResult: 'fails at stress rate',
  vacancyRate: 0.03,
  rentTrend: 'flat',
  riskFlagSummary: 'condo_fee_high',
}

describe('generateNarrative', () => {
  it('investor mode, pro tier → calls Sonnet, returns narrative string', async () => {
    const narrative = 'The $761-per-month condo fee ends this deal before it starts.'
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(narrative))

    const result = await generateNarrative(BASE_INVESTOR)

    expect(result).toBe(narrative)
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
    const call = mockMessagesCreate.mock.calls[0][0] as { model: string }
    expect(call.model).toBe('claude-sonnet-4-6')
  })

  it('personal mode, pro tier → prompt contains personal use marker', async () => {
    const narrative = 'This property is priced fairly for the area.'
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(narrative))

    const result = await generateNarrative({
      mode: 'personal',
      tier: 'pro',
      address: '10 Elm St, Toronto, ON',
      price: 850_000,
      monthlyOwnershipCost: 4200,
      fmvLow: 820_000,
      fmvHigh: 880_000,
      pbCompCount: 5,
      walkScore: 88,
      transitScore: 72,
    })

    expect(result).toBe(narrative)
    const prompt = (mockMessagesCreate.mock.calls[0][0] as { messages: Array<{ content: string }> })
      .messages[0].content
    expect(prompt).toContain('personal use')
  })

  it('tenant mode, pro tier → prompt contains tenant and asking rent markers', async () => {
    const narrative = 'Do not sign at $2,150.'
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(narrative))

    const result = await generateNarrative({
      mode: 'tenant',
      tier: 'pro',
      address: 'Unit 3705, 50 Brian Harrison Way, Toronto, ON',
      askingRent: 2150,
      rentLow: 1900,
      rentHigh: 2100,
      leverageLevel: 'high',
      leverageReason: '24 competing units',
      riskFlagSummary: 'glass_door_bedroom, unverified_bedroom',
      lightScore: 62,
    })

    expect(result).toBe(narrative)
    const prompt = (mockMessagesCreate.mock.calls[0][0] as { messages: Array<{ content: string }> })
      .messages[0].content
    expect(prompt).toContain('tenant advisor')
    expect(prompt).toContain('ASKING RENT')
  })

  it('tenant mode with comps → prompt cites the median + comp count, not "no market data"', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse('Above median — negotiate.'))

    await generateNarrative({
      mode: 'tenant',
      tier: 'pro',
      address: '1242-8 Hillsdale Ave E, Toronto, ON',
      askingRent: 3100,
      rentMid: 2900,
      rentLow: 2600,
      rentHigh: 3200,
      compCount: 5,
      riskFlagSummary: 'None identified',
      lightScore: 58,
    })

    const prompt = (mockMessagesCreate.mock.calls[0][0] as { messages: Array<{ content: string }> })
      .messages[0].content
    expect(prompt).toContain('MARKET MEDIAN')
    expect(prompt).toContain('5 comparable rentals')
    expect(prompt).toContain('Do NOT say market data is unavailable')
    expect(prompt).not.toContain('no comparable rentals for this area yet')
  })

  it('free tier → prompt contains 1 paragraph instruction', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse('Short verdict.'))

    await generateNarrative({ ...BASE_INVESTOR, tier: 'free' })

    const prompt = (mockMessagesCreate.mock.calls[0][0] as { messages: Array<{ content: string }> })
      .messages[0].content
    expect(prompt).toContain('1 paragraph')
  })

  it('API throws → returns fallback string, does not throw', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('API timeout'))
    const result = await generateNarrative(BASE_INVESTOR)
    expect(result).toBe(FALLBACK)
  })

  it('content[0] is not a text block → returns fallback string, does not throw', async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', id: 'tu_1', name: 'test_tool', input: {} }],
    })
    const result = await generateNarrative(BASE_INVESTOR)
    expect(result).toBe(FALLBACK)
  })
})
