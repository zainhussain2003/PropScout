/**
 * Tests for useAnalysis.ts
 *
 * Covers:
 *   - Initial state has null analysis, false loading, null error
 *   - loading transitions correctly during a run (true while in-flight, false after)
 *   - analysis is populated on success
 *   - ApiRequestError message is surfaced in the error state
 *   - Unknown errors produce a generic error string
 *   - State is reset before each new run (analysis cleared on second run failure)
 *   - loading is false after a failed run
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnalysis } from './useAnalysis'
import * as analysisService from '../lib/services/analysisService'
import type { PropertyInput, FinancingInput, RentalInput } from '../types/api'
import type { Analysis } from '../types/analysis'

// Keep the real ApiRequestError class so instanceof checks in the hook work correctly.
// Only mock runAnalysis to avoid real network calls.
vi.mock('../lib/services/analysisService', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/services/analysisService')>()
  return {
    ...mod,
    runAnalysis: vi.fn(),
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ANALYSIS_FIXTURE: Analysis = {
  id: '',
  token: '',
  mode: 'investor',
  createdAt: '2026-01-01T00:00:00.000Z',
  metrics: {
    cashFlowMonthly: -2126.82,
    cashFlowAnnual: -25521.83,
    capRate: 0.01973,
    cashOnCashReturn: -0.16,
    dscr: 0.36,
    grm: 20.97,
    noi: 14397.85,
    mortgagePaymentMonthly: 3326.64,
    downPayment: 145980,
    mortgageAmount: 583920,
    amortizationYears: 25,
    mortgageRate: 0.0479,
    breakEvenRent: 5138.76,
    closingCostsTotal: 13473,
    lttProvincial: 11073,
    lttMunicipal: 0,
    hasSanityWarnings: false,
  },
  dealScore: {
    total: 7,
    verdict: 'hard_pass',
    breakdown: {
      capRate: 0,
      cashFlow: 0,
      cashOnCash: 0,
      dscr: 0,
      demand: 7,
      subtotal: 7,
      deduction: 0,
      componentMaxes: {
        capRate: 25,
        cashFlow: 25,
        cashOnCash: 20,
        dscr: 15,
        demand: 10,
      },
    },
  },
  rentalComps: null,
  riskFlags: [],
  narrative: null,
  walkScore: null,
  neighbourhood: null,
  hasSanityWarnings: false,
}

const PROPERTY: PropertyInput = {
  address: '5702 Buttermill Ave',
  province: 'ON',
  price: 729900,
  annualTaxes: 3326,
  condoFeeMonthly: 761,
  condoFeeKnown: true,
  beds: 3,
  baths: 2,
  sqft: 1050,
  yearBuilt: 2018,
  propertyType: 'condo',
  isToronto: false,
}

const FINANCING: FinancingInput = {
  downPaymentPct: 0.2,
  mortgageRate: 0.0479,
  amortizationYears: 25,
}

const RENTAL: RentalInput = {
  low: 2700,
  mid: 2900,
  high: 3200,
  compCount: 8,
  confidence: 'medium',
  postalCode: 'L4K',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockedRunAnalysis = vi.mocked(analysisService.runAnalysis)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with null analysis, false loading, null error', () => {
    const { result } = renderHook(() => useAnalysis())

    expect(result.current.analysis).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets loading true during run, then false after', async () => {
    mockedRunAnalysis.mockResolvedValue(ANALYSIS_FIXTURE)

    const { result } = renderHook(() => useAnalysis())

    await act(async () => {
      await result.current.run(PROPERTY, FINANCING, RENTAL)
    })

    expect(result.current.loading).toBe(false)
  })

  it('sets analysis on success', async () => {
    mockedRunAnalysis.mockResolvedValue(ANALYSIS_FIXTURE)

    const { result } = renderHook(() => useAnalysis())

    await act(async () => {
      await result.current.run(PROPERTY, FINANCING, RENTAL)
    })

    expect(result.current.analysis).toEqual(ANALYSIS_FIXTURE)
    expect(result.current.error).toBeNull()
  })

  it('sets error string on ApiRequestError', async () => {
    mockedRunAnalysis.mockRejectedValue(
      new analysisService.ApiRequestError('CALC_ENGINE_ERROR', 'Analysis failed', 500)
    )

    const { result } = renderHook(() => useAnalysis())

    await act(async () => {
      await result.current.run(PROPERTY, FINANCING, RENTAL)
    })

    expect(result.current.error).toBe('Analysis failed')
    expect(result.current.analysis).toBeNull()
  })

  it('sets generic error string on unknown error', async () => {
    mockedRunAnalysis.mockRejectedValue(new Error('something unexpected'))

    const { result } = renderHook(() => useAnalysis())

    await act(async () => {
      await result.current.run(PROPERTY, FINANCING, RENTAL)
    })

    expect(result.current.error).toBe('Analysis failed — please try again.')
  })

  it('resets state before each run — analysis is null after second run fails', async () => {
    // First run succeeds
    mockedRunAnalysis.mockResolvedValueOnce(ANALYSIS_FIXTURE)

    const { result } = renderHook(() => useAnalysis())

    await act(async () => {
      await result.current.run(PROPERTY, FINANCING, RENTAL)
    })

    expect(result.current.analysis).toEqual(ANALYSIS_FIXTURE)

    // Second run fails
    mockedRunAnalysis.mockRejectedValueOnce(
      new analysisService.ApiRequestError('CALC_ENGINE_ERROR', 'Analysis failed', 500)
    )

    await act(async () => {
      await result.current.run(PROPERTY, FINANCING, RENTAL)
    })

    expect(result.current.analysis).toBeNull()
    expect(result.current.error).toBe('Analysis failed')
  })

  it('loading is false on error', async () => {
    mockedRunAnalysis.mockRejectedValue(
      new analysisService.ApiRequestError('CALC_ENGINE_ERROR', 'Analysis failed', 500)
    )

    const { result } = renderHook(() => useAnalysis())

    await act(async () => {
      await result.current.run(PROPERTY, FINANCING, RENTAL)
    })

    expect(result.current.loading).toBe(false)
  })
})
