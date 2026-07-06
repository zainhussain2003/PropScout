/**
 * Tests for useInvestorReport.ts
 *
 * Covers:
 *   - Demo mode returns sunScout: null (no live analysis)
 *   - Live mode returns sunScout from analysis when available
 *   - Live mode returns null when analysis.sunScout is null
 *   - sunScout is included in the hook's return type shape
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInvestorReport } from './useInvestorReport'
import * as analysisService from '../lib/services/analysisService'
import { VAUGHAN_LISTING, VAUGHAN_RENTAL } from '../constants/demoData'
import type { Analysis, SunScoutResult } from '../types/analysis'
import type { ListingData } from '../types/analysis'
import type { RentalInput } from '../types/api'

// Mock analysisService to avoid real network calls
vi.mock('../lib/services/analysisService', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../lib/services/analysisService')>()
  return { ...mod, runAnalysis: vi.fn() }
})

// ── Fixtures ───────────────────────────────────────────────────────────────────

const SUN_SCOUT_FIXTURE: SunScoutResult = {
  annualPeakSunHours: 1420,
  summerDailyHours: 5.8,
  winterDailyHours: 2.1,
  seasonalGrid: { Dec: 1.9, Mar: 3.4, Jun: 6.2, Sep: 4.7 },
  monthlyHours: [56, 72, 102, 138, 165, 186, 192, 178, 141, 105, 66, 59],
  sunScore: 72,
  verdict: 'good',
}

const METRICS_FIXTURE: Analysis['metrics'] = {
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
}

const DEAL_SCORE_FIXTURE: Analysis['dealScore'] = {
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
    componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
  },
}

const ANALYSIS_WITH_SUN_SCOUT: Analysis = {
  id: 'test-id',
  token: 'test-token',
  mode: 'investor',
  createdAt: '2026-01-01T00:00:00.000Z',
  metrics: METRICS_FIXTURE,
  dealScore: DEAL_SCORE_FIXTURE,
  rentalComps: null,
  riskFlags: [],
  narrative: null,
  hasSanityWarnings: false,
  sunScout: SUN_SCOUT_FIXTURE,
}

const ANALYSIS_WITHOUT_SUN_SCOUT: Analysis = {
  ...ANALYSIS_WITH_SUN_SCOUT,
  sunScout: null,
}

// A minimal non-demo listing that triggers live mode
const LIVE_LISTING: ListingData = {
  ...VAUGHAN_LISTING,
  id: 'live-123',
}

const LIVE_RENTAL: RentalInput = {
  ...VAUGHAN_RENTAL,
}

const mockedRunAnalysis = vi.mocked(analysisService.runAnalysis)

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useInvestorReport — sunScout wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('demo mode (vaughan): sunScout is null — no live analysis', () => {
    const { result } = renderHook(() => useInvestorReport(VAUGHAN_LISTING, VAUGHAN_RENTAL))

    expect(result.current.sunScout).toBeNull()
  })

  it('demo mode (hamilton): sunScout is null — no live analysis', () => {
    const { result } = renderHook(() => {
      const hamiltonListing: ListingData = { ...VAUGHAN_LISTING, id: 'hamilton' }
      return useInvestorReport(hamiltonListing, VAUGHAN_RENTAL)
    })

    expect(result.current.sunScout).toBeNull()
  })

  it('live mode: sunScout propagates from analysis when available', async () => {
    mockedRunAnalysis.mockResolvedValue(ANALYSIS_WITH_SUN_SCOUT)

    const { result } = renderHook(() => useInvestorReport(LIVE_LISTING, LIVE_RENTAL))

    // Wait for the mount-triggered API call to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.sunScout).toEqual(SUN_SCOUT_FIXTURE)
  })

  it('live mode: sunScout is null when analysis.sunScout is null', async () => {
    mockedRunAnalysis.mockResolvedValue(ANALYSIS_WITHOUT_SUN_SCOUT)

    const { result } = renderHook(() => useInvestorReport(LIVE_LISTING, LIVE_RENTAL))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.sunScout).toBeNull()
  })

  it('live mode: sunScout is null before analysis completes', () => {
    // runAnalysis never resolves in this test — stays in-flight
    mockedRunAnalysis.mockReturnValue(new Promise(() => undefined))

    const { result } = renderHook(() => useInvestorReport(LIVE_LISTING, LIVE_RENTAL))

    expect(result.current.sunScout).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('hook result includes sunScout key', () => {
    const { result } = renderHook(() => useInvestorReport(VAUGHAN_LISTING, VAUGHAN_RENTAL))

    expect('sunScout' in result.current).toBe(true)
  })
})
