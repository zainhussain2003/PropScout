/**
 * MagicLinkConfirmedPage — where a magic link lands.
 * Route: /auth/confirm
 * Design source: auth-stubs.jsx::MagicLinkConfirmed
 *
 * Supabase JS v2 reads the code or token out of the URL on client init and
 * fires onAuthStateChange when a session exists. When the link is bad it does
 * not: it redirects here with the reason in the URL fragment —
 * `#error=access_denied&error_code=otp_expired&error_description=…`.
 *
 * This page used to say "Signed in successfully" the moment it mounted,
 * before any session existed, and then — ignoring the fragment — waited six
 * seconds and guessed "this link may have expired" (audit A-08). On the first
 * production sign-in (2026-09-12) an already-used link produced exactly that
 * sequence: a success screen, then a guess, while the URL carried the answer.
 *
 * Now: read the fragment first and say what the provider said; otherwise show
 * "confirming" until a session arrives; and only after a generous wait, say we
 * have not heard back — which is what we know — rather than "expired".
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StubState } from '../components/states/StubState'
import { getSession, onAuthStateChange } from '../lib/services/authService'

/** How long to wait for the auth client before saying nothing came back. */
export const CONFIRM_STALL_MS = 15_000

type ConfirmState =
  | { kind: 'checking' }
  | { kind: 'signedIn' }
  | { kind: 'providerError'; code: string; description: string }
  | { kind: 'stalled' }

/** Supabase puts auth errors in the fragment, not the query. */
export function parseAuthErrorFromHash(hash: string): { code: string; description: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const error = params.get('error')
  if (error == null) return null
  return {
    code: params.get('error_code') ?? error,
    description: params.get('error_description') ?? '',
  }
}

/** What to tell a person for each provider error we know how to explain. */
export function describeAuthError(
  code: string,
  description: string
): {
  headline: string
  body: string
} {
  if (code === 'otp_expired') {
    return {
      headline: 'This link has expired or was already used.',
      body: 'Sign-in links work once and expire ten minutes after they are sent. Request a new one and open it in this browser.',
    }
  }
  if (code === 'access_denied') {
    return {
      headline: 'The sign-in service refused this link.',
      body: description || 'Request a new link and try again.',
    }
  }
  return {
    headline: 'Sign-in did not complete.',
    body: description || `The sign-in service reported: ${code}.`,
  }
}

export function MagicLinkConfirmedPage(): JSX.Element {
  const navigate = useNavigate()
  const [state, setState] = useState<ConfirmState>(() => {
    const err = parseAuthErrorFromHash(window.location.hash)
    return err != null ? { kind: 'providerError', ...err } : { kind: 'checking' }
  })

  useEffect(() => {
    if (state.kind !== 'checking') return

    let done = false
    const arrive = (): void => {
      if (done) return
      done = true
      setState({ kind: 'signedIn' })
      navigate('/account', { replace: true })
    }

    // The client may have finished exchanging the token before this
    // subscription existed; ask once as well as listening.
    void getSession().then((s) => {
      if (s != null) arrive()
    })
    const unsub = onAuthStateChange((session) => {
      if (session != null) arrive()
    })

    const timeout = setTimeout(() => {
      if (!done) setState({ kind: 'stalled' })
    }, CONFIRM_STALL_MS)

    return () => {
      unsub()
      clearTimeout(timeout)
    }
  }, [state.kind, navigate])

  const frame = (child: JSX.Element): JSX.Element => (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--gutter)',
      }}
    >
      {child}
    </div>
  )

  if (state.kind === 'providerError') {
    const copy = describeAuthError(state.code, state.description)
    return frame(
      <StubState
        icon="x"
        tone="fail"
        eyebrow="Sign-in failed"
        headline={copy.headline}
        body={copy.body}
        primary={{ label: 'Request a new link', onClick: () => navigate('/') }}
      />
    )
  }

  if (state.kind === 'stalled') {
    return frame(
      <StubState
        icon="flag"
        tone="caution"
        eyebrow="Still waiting"
        headline="We haven't heard back from the sign-in service."
        body="The link may have been used already, or the connection dropped. If you are signed in, your account page will say so; otherwise request a new link."
        primary={{ label: 'Check my account', onClick: () => navigate('/account') }}
        secondary={{ label: 'Request a new link', onClick: () => navigate('/') }}
      />
    )
  }

  if (state.kind === 'signedIn') {
    return frame(
      <StubState
        icon="check"
        tone="pass"
        eyebrow="You're in"
        headline="Signed in."
        body="Taking you to your account…"
        primary={{ label: 'Go to my account', onClick: () => navigate('/account') }}
      />
    )
  }

  return frame(
    <StubState
      icon="key"
      tone="neutral"
      eyebrow="Signing in"
      headline="Confirming your link…"
      body="One moment."
    />
  )
}
