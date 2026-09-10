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
  it('returns byte-for-byte identical investor prose for identical inputs without calling Claude', async () => {
    const first = await generateNarrative(BASE_INVESTOR)
    const second = await generateNarrative({ ...BASE_INVESTOR })

    expect(second).toBe(first)
    expect(first).toContain('hard pass')
    expect(first).toContain('−$1,833')
    expect(first).toContain('2.50%')
    expect(first).not.toContain('$300,000')
    expect(mockMessagesCreate).not.toHaveBeenCalled()
  })

  it('does not vary deterministic prose by subscription tier', async () => {
    const pro = await generateNarrative(BASE_INVESTOR)
    const free = await generateNarrative({ ...BASE_INVESTOR, tier: 'free' })
    expect(free).toBe(pro)
  })

  it('personal mode states exactly which evidence is available', async () => {
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

    expect(result).toContain('$820,000 to $880,000')
    expect(result).toContain('5 comparable sales')
    expect(result).toContain('$4,200/month')
    expect(result).toContain('walk score 88 and transit score 72')
  })

  it('tenant mode uses the supplied median as the only negotiation reference', async () => {
    const result = await generateNarrative({
      mode: 'tenant',
      tier: 'pro',
      address: 'Unit 3705, 50 Brian Harrison Way, Toronto, ON',
      askingRent: 2150,
      rentMid: 2000,
      rentLow: 1900,
      rentHigh: 2100,
      compCount: 14,
      leverageLevel: 'high',
      leverageReason: '24 competing units',
      riskFlagSummary: 'glass_door_bedroom, unverified_bedroom',
      lightScore: 62,
    })

    expect(result).toContain('$2,150/month')
    expect(result).toContain('$2,000 market median from 14 comparable rentals')
    expect(result).toContain('Use the supplied market median of $2,000/month')
    expect(mockMessagesCreate).not.toHaveBeenCalled()
  })

  it('tenant mode refuses to invent a benchmark when comps are unavailable', async () => {
    const result = await generateNarrative({
      mode: 'tenant',
      tier: 'pro',
      address: '1242-8 Hillsdale Ave E, Toronto, ON',
      askingRent: 3100,
      rentMid: 2900,
      rentLow: 2600,
      rentHigh: 3200,
      compCount: 0,
    })

    expect(result).toContain('no comparable rentals were available')
    expect(result).toContain('Do not use an invented target')
    expect(result).not.toContain('$2,900')
  })

  it('tenant mode explains when asking rent is unknown', async () => {
    const result = await generateNarrative({
      mode: 'tenant',
      tier: 'free',
      address: '8 Hillsdale Ave E, Toronto, ON',
      rentMid: 2900,
      compCount: 5,
    })
    expect(result).toContain('did not provide a usable asking rent')
    expect(result).not.toContain('$0')
  })

  it('landlord mode has its own stable positioning language', async () => {
    const input: NarrativeInput = {
      ...BASE_INVESTOR,
      mode: 'landlord',
      askingRent: 3100,
      rentMid: 3050,
      compCount: 9,
    }
    const result = await generateNarrative(input)
    expect(result).toContain('current landlord economics')
    expect(result).toContain('$3,100/month against a $3,050 median')
    expect(await generateNarrative({ ...input })).toBe(result)
  })
})
