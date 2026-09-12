/**
 * AnalyzingPage — polling behaviour.
 *
 * The page had no test at all, which is how it shipped polling forever. The
 * shape of the bug: `updateAnalysisStatus` in the API is a no-op and
 * `getAnalysisStatus` derives state from whether `calculated_metrics` is set,
 * so a run that died server-side leaves a row reading 'pending' indefinitely.
 * This page polled it every two seconds for as long as the tab stayed open,
 * showing a progress bar the whole time.
 *
 * Timers are faked so three minutes of polling takes milliseconds.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const triggerAnalysis = vi.fn()
const fetchReport = vi.fn()
const navigate = vi.fn()
const useAuthMock = vi.fn(() => ({ session: null, loading: false }))

vi.mock('../lib/services/analysisService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/services/analysisService')>()),
  triggerAnalysis: (token: string, mode: string, accessToken: string | null = null) =>
    triggerAnalysis(token, mode, accessToken),
  fetchReport: (token: string) => fetchReport(token),
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))

import { AnalyzingPage } from './analyzing'

const POLL_MS = 2_000
const TIMEOUT_MS = 3 * 60 * 1_000

function renderAnalyzing(): void {
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/analyzing', search: '?token=tok-1&mode=investor' }]}
    >
      <AnalyzingPage />
    </MemoryRouter>
  )
}

/** Advance fake timers and flush the promises each tick starts. */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('AnalyzingPage — polling is bounded', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    triggerAnalysis.mockReset()
    fetchReport.mockReset()
    navigate.mockReset()
    triggerAnalysis.mockResolvedValue(undefined)
    // The stuck case: the API keeps answering "pending" because a failure is
    // not recorded anywhere.
    fetchReport.mockResolvedValue({ status: 'pending' })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stops polling and hands control back after the timeout', async () => {
    renderAnalyzing()
    await advance(POLL_MS * 2)
    expect(fetchReport).toHaveBeenCalled()
    expect(screen.queryByText(/taking longer than it should/i)).not.toBeInTheDocument()

    await advance(TIMEOUT_MS)

    expect(await screen.findByText(/taking longer than it should/i)).toBeInTheDocument()

    // The load-bearing assertion: polling has actually STOPPED. Rendering a
    // message while a 2s interval keeps firing would look fixed and not be.
    const callsAtTimeout = fetchReport.mock.calls.length
    await advance(POLL_MS * 30)
    expect(fetchReport.mock.calls.length).toBe(callsAtTimeout)
  })

  it('does not claim the analysis failed', async () => {
    // We stopped checking; we do not know that it failed, and it may still
    // finish. "Analysis could not complete" is the error state and is a
    // different, stronger claim.
    renderAnalyzing()
    await advance(TIMEOUT_MS + POLL_MS)

    expect(await screen.findByText(/taking longer than it should/i)).toBeInTheDocument()
    expect(screen.queryByText(/Analysis could not complete/i)).not.toBeInTheDocument()
    expect(document.body.textContent ?? '').toMatch(/may still finish on its own/i)
  })

  it('keeps polling right up to the bound', async () => {
    // The bound must not fire early — a real analysis takes 25–60s and the
    // user must not be interrupted mid-run.
    renderAnalyzing()
    await advance(TIMEOUT_MS - POLL_MS * 2)

    expect(screen.queryByText(/taking longer than it should/i)).not.toBeInTheDocument()
    expect(fetchReport.mock.calls.length).toBeGreaterThan(50)
  })

  it('navigates to the report as soon as it completes, without waiting for the bound', async () => {
    fetchReport.mockResolvedValue({ status: 'complete' })
    renderAnalyzing()
    await advance(POLL_MS * 2)

    expect(navigate).toHaveBeenCalledWith('/r/tok-1')
    expect(screen.queryByText(/taking longer than it should/i)).not.toBeInTheDocument()
  })

  it('shows the error state when the API reports a real failure', async () => {
    // Dead in production today because 'failed' is never persisted, but the
    // branch is live the moment it is — and it must stay distinct from the
    // timeout state.
    fetchReport.mockResolvedValue({ status: 'failed' })
    renderAnalyzing()
    await advance(POLL_MS * 2)

    expect(await screen.findByText(/Analysis could not complete/i)).toBeInTheDocument()
    expect(screen.queryByText(/taking longer than it should/i)).not.toBeInTheDocument()
  })

  it('resumes polling when the user checks again', async () => {
    renderAnalyzing()
    await advance(TIMEOUT_MS + POLL_MS)
    const callsAtTimeout = fetchReport.mock.calls.length

    await act(async () => {
      screen.getByRole('button', { name: /check again/i }).click()
    })
    await advance(POLL_MS * 2)

    expect(fetchReport.mock.calls.length).toBeGreaterThan(callsAtTimeout)
    expect(screen.queryByText(/taking longer than it should/i)).not.toBeInTheDocument()
  })
})

// ── Free-tier quota (D-071) ───────────────────────────────────────────────────

// Hoisted, so the polling group above runs with it too: no session there,
// which is the guest path those tests always exercised.
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

const startCheckout = vi.fn()
vi.mock('../lib/services/billingService', () => ({
  startCheckout: (tier: string, token: string) => startCheckout(tier, token),
}))

import { ApiRequestError } from '../lib/services/analysisService'

const AUTH_NONE = { session: null, loading: false }
const AUTH_LOADING = { session: null, loading: true }
const AUTH_SIGNED_IN = { session: { access_token: 'jwt-1' }, loading: false }

function limitReached(): ApiRequestError {
  return new ApiRequestError('FREE_LIMIT_REACHED', "You've used all 10 free analyses.", 402, {
    used: 10,
    limit: 10,
    resetsAt: '2026-10-01T00:00:00.000Z',
  })
}

describe('AnalyzingPage — free-tier quota', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-12T12:00:00Z'))
    triggerAnalysis.mockReset()
    fetchReport.mockReset()
    navigate.mockReset()
    startCheckout.mockReset()
    useAuthMock.mockReturnValue(AUTH_NONE)
    triggerAnalysis.mockResolvedValue(undefined)
    fetchReport.mockResolvedValue({ status: 'pending' })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends the session with the trigger so the analysis is attributed and counted', async () => {
    useAuthMock.mockReturnValue(AUTH_SIGNED_IN)
    renderAnalyzing()
    await advance(POLL_MS)
    expect(triggerAnalysis).toHaveBeenCalledWith('tok-1', 'investor', 'jwt-1')
  })

  it('triggers as a guest when there is no session', async () => {
    renderAnalyzing()
    await advance(POLL_MS)
    expect(triggerAnalysis).toHaveBeenCalledWith('tok-1', 'investor', null)
  })

  it('waits for the session to resolve before triggering', async () => {
    // The defect this pins: firing on mount, before AuthProvider has read the
    // stored session, ran every signed-in user's first report as a guest —
    // unattributed, uncounted, un-ownable.
    useAuthMock.mockReturnValue(AUTH_LOADING)
    const { rerender } = render(
      <MemoryRouter
        initialEntries={[{ pathname: '/analyzing', search: '?token=tok-1&mode=investor' }]}
      >
        <AnalyzingPage />
      </MemoryRouter>
    )
    await advance(POLL_MS)
    expect(triggerAnalysis).not.toHaveBeenCalled()

    useAuthMock.mockReturnValue(AUTH_SIGNED_IN)
    rerender(
      <MemoryRouter
        initialEntries={[{ pathname: '/analyzing', search: '?token=tok-1&mode=investor' }]}
      >
        <AnalyzingPage />
      </MemoryRouter>
    )
    await advance(POLL_MS)
    expect(triggerAnalysis).toHaveBeenCalledWith('tok-1', 'investor', 'jwt-1')
  })

  it('shows the hard-limit gate with the API figures when the quota is used up', async () => {
    useAuthMock.mockReturnValue(AUTH_SIGNED_IN)
    triggerAnalysis.mockRejectedValue(limitReached())
    renderAnalyzing()
    await advance(POLL_MS)

    const text = document.body.textContent ?? ''
    expect(text).toMatch(/10 of 10/)
    // 2026-09-12 → 2026-10-01 is 19 days, from the API's resetsAt — not a
    // hardcoded "32 days".
    expect(text).toMatch(/19 days/)
    expect(text).not.toMatch(/32 days/)
    // It is not an error and polling never starts.
    expect(screen.queryByText(/Analysis could not complete/i)).not.toBeInTheDocument()
    expect(fetchReport).not.toHaveBeenCalled()
  })

  it('starts Pro checkout from the gate with the current session', async () => {
    useAuthMock.mockReturnValue(AUTH_SIGNED_IN)
    triggerAnalysis.mockRejectedValue(limitReached())
    startCheckout.mockResolvedValue(undefined)
    renderAnalyzing()
    await advance(POLL_MS)

    await act(async () => {
      screen.getByRole('button', { name: /upgrade now/i }).click()
    })
    expect(startCheckout).toHaveBeenCalledWith('pro', 'jwt-1')
  })

  it('surfaces a checkout failure instead of swallowing it', async () => {
    useAuthMock.mockReturnValue(AUTH_SIGNED_IN)
    triggerAnalysis.mockRejectedValue(limitReached())
    startCheckout.mockRejectedValue(new Error('Billing is unavailable right now'))
    renderAnalyzing()
    await advance(POLL_MS)

    await act(async () => {
      screen.getByRole('button', { name: /upgrade now/i }).click()
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(/Billing is unavailable/)
  })

  it('still shows the plain error state for any other trigger failure', async () => {
    useAuthMock.mockReturnValue(AUTH_SIGNED_IN)
    triggerAnalysis.mockRejectedValue(new ApiRequestError('NOT_FOUND', 'Analysis not found.', 404))
    renderAnalyzing()
    await advance(POLL_MS)
    expect(await screen.findByText(/Analysis could not complete/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upgrade now/i })).not.toBeInTheDocument()
  })
})
