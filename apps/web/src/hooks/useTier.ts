/**
 * useTier — resolves the current user's subscription tier.
 *
 * In development, VITE_MOCK_TIER overrides the real tier so you can preview
 * different paywall states without a Stripe subscription.
 *
 * Flow:
 *   1. If VITE_MOCK_TIER is set, return it immediately (dev shortcut)
 *   2. If no user is signed in, return 'free'
 *   3. Once signed in, fetch /me and return the tier from Supabase
 *
 * Returns:
 *   tier     — 'free' | 'pro' | 'professional' | 'team'
 *   loading  — true while the /me call is in flight
 *   status   — what `tier` is worth: 'signed-out' (free by definition),
 *              'loading', 'resolved' (the API said so), or 'unavailable'
 *              (the API could not be reached — `tier` is a placeholder)
 *   refresh  — ask the API again
 *
 * `tier` stays 'free' when /me fails, because the gates need a value and the
 * server enforces the real entitlements anyway. But that placeholder used to be
 * indistinguishable from a real answer, so a paying user whose /me call failed
 * saw locks and upgrade prompts as if they had never paid (audit A-10). The
 * status is what lets the UI say "we couldn't confirm your plan" instead.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

export type Tier = 'free' | 'pro' | 'professional' | 'team'
export type TierStatus = 'signed-out' | 'loading' | 'resolved' | 'unavailable'

/** One quiet retry before admitting the plan could not be confirmed. */
const RETRY_DELAY_MS = 2_000

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'
const MOCK_TIER = import.meta.env.DEV
  ? (import.meta.env.VITE_MOCK_TIER as Tier | undefined)
  : undefined

interface MeResponse {
  id: string
  email: string
  tier: Tier
  stripeCustomerId: string | null
}

export function useTier(): {
  tier: Tier
  loading: boolean
  status: TierStatus
  refresh: () => void
} {
  const { session, loading: authLoading } = useAuth()
  const [tier, setTier] = useState<Tier>('free')
  const [status, setStatus] = useState<TierStatus>(MOCK_TIER ? 'resolved' : 'loading')
  const [attempt, setAttempt] = useState(0)

  const refresh = useCallback((): void => setAttempt((n) => n + 1), [])

  useEffect(() => {
    if (MOCK_TIER) {
      setTier(MOCK_TIER)
      setStatus('resolved')
      return
    }

    if (authLoading) return

    if (!session) {
      setTier('free')
      setStatus('signed-out')
      return
    }

    let cancelled = false
    setStatus('loading')

    const ask = async (): Promise<boolean> => {
      try {
        const res = await fetch(`${BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return false
        const data = (await res.json()) as MeResponse
        if (cancelled) return true
        setTier(data.tier)
        setStatus('resolved')
        return true
      } catch {
        return false
      }
    }

    void (async () => {
      if (await ask()) return
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      if (cancelled) return
      if (await ask()) return
      if (!cancelled) setStatus('unavailable')
    })()

    return () => {
      cancelled = true
    }
  }, [session, authLoading, attempt])

  return { tier, loading: status === 'loading', status, refresh }
}
