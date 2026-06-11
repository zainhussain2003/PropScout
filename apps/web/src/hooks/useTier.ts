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
 */

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

export type Tier = 'free' | 'pro' | 'professional' | 'team'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'
const MOCK_TIER = import.meta.env.VITE_MOCK_TIER as Tier | undefined

interface MeResponse {
  id: string
  email: string
  tier: Tier
  stripeCustomerId: string | null
}

export function useTier(): { tier: Tier; loading: boolean } {
  const { session, loading: authLoading } = useAuth()
  const [tier, setTier] = useState<Tier>('free')
  const [loading, setLoading] = useState(!MOCK_TIER)

  useEffect(() => {
    if (MOCK_TIER) {
      setTier(MOCK_TIER)
      setLoading(false)
      return
    }

    if (authLoading) return

    if (!session) {
      setTier('free')
      setLoading(false)
      return
    }

    setLoading(true)
    void fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as MeResponse
        setTier(data.tier)
      })
      .catch(() => {
        // Non-fatal — stay on 'free' tier if /me fails
      })
      .finally(() => {
        setLoading(false)
      })
  }, [session, authLoading])

  return { tier, loading }
}
