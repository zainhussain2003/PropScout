/**
 * MagicLinkConfirmedPage — says what the auth client said, not what a timer
 * guessed (audit A-08; production sign-in, 2026-09-12).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const getSession = vi.fn()
let authListener: ((session: unknown) => void) | null = null
vi.mock('../lib/services/authService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/services/authService')>()),
  getSession: () => getSession(),
  onAuthStateChange: (cb: (session: unknown) => void) => {
    authListener = cb
    return () => {
      authListener = null
    }
  },
}))

const navigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))

import {
  MagicLinkConfirmedPage,
  CONFIRM_STALL_MS,
  parseAuthErrorFromHash,
  describeAuthError,
} from './MagicLinkConfirmedPage'

function renderPage(): void {
  render(
    <MemoryRouter>
      <MagicLinkConfirmedPage />
    </MemoryRouter>
  )
}

describe('MagicLinkConfirmedPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    navigate.mockReset()
    getSession.mockReset()
    getSession.mockResolvedValue(null)
    window.location.hash = ''
    authListener = null
  })

  afterEach(() => {
    vi.useRealTimers()
    window.location.hash = ''
  })

  it('shows "confirming", not "signed in", while nothing has arrived', () => {
    renderPage()
    expect(screen.getByText(/Confirming your link/)).toBeInTheDocument()
    expect(screen.queryByText(/Signed in/)).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('reports the provider error from the URL fragment immediately — no six-second guess', () => {
    // Exactly what an already-used link produced on 2026-09-12.
    window.location.hash =
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    renderPage()
    expect(screen.getByText(/expired or was already used/)).toBeInTheDocument()
    expect(screen.getByText(/work once and expire ten minutes/)).toBeInTheDocument()
    expect(screen.queryByText(/Confirming/)).not.toBeInTheDocument()
  })

  it('navigates to the account when the auth client reports a session', async () => {
    renderPage()
    await act(async () => {
      authListener?.({ access_token: 'jwt' })
    })
    expect(navigate).toHaveBeenCalledWith('/account', { replace: true })
  })

  it('also picks up a session the client established before the page subscribed', async () => {
    getSession.mockResolvedValue({ access_token: 'jwt' })
    renderPage()
    await act(async () => {
      await Promise.resolve()
    })
    expect(navigate).toHaveBeenCalledWith('/account', { replace: true })
  })

  it('after a long wait says it has not heard back — not that the link expired', async () => {
    renderPage()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CONFIRM_STALL_MS + 100)
    })
    expect(screen.getByText(/haven.t heard back/)).toBeInTheDocument()
    expect(screen.queryByText(/expired/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Check my account/ })).toBeInTheDocument()
  })

  it('does not call it stalled before the wait is up', async () => {
    renderPage()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_500)
    })
    expect(screen.queryByText(/haven.t heard back/)).not.toBeInTheDocument()
    expect(screen.getByText(/Confirming your link/)).toBeInTheDocument()
  })
})

describe('parseAuthErrorFromHash / describeAuthError', () => {
  it('parses Supabase’s fragment format', () => {
    expect(
      parseAuthErrorFromHash(
        '#error=access_denied&error_code=otp_expired&error_description=Bad+link'
      )
    ).toEqual({ code: 'otp_expired', description: 'Bad link' })
  })

  it('returns null when there is no error', () => {
    expect(parseAuthErrorFromHash('')).toBeNull()
    expect(parseAuthErrorFromHash('#access_token=abc&type=magiclink')).toBeNull()
  })

  it('falls back to the provider’s description for an unknown code', () => {
    expect(describeAuthError('weird_code', 'Something specific').body).toBe('Something specific')
    expect(describeAuthError('weird_code', '').body).toMatch(/weird_code/)
  })
})
