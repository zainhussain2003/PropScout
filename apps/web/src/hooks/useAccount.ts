/**
 * useAccount — the signed-in user's real identity and usage, from GET /me.
 *
 * Exists because the account page used to render a hardcoded fixture: a name
 * and email that belonged to nobody, eight analyses with real Toronto
 * addresses and dollar figures, three paid invoices, and a "8 of 10 used"
 * quota derived from the length of that array. Every one of those was
 * presented to a signed-in user as their own record.
 *
 * Everything here is either real or null. A null is rendered as an honest
 * unknown by the caller — never as a placeholder that looks like data.
 */

import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface AccountIdentity {
  email: string
  /** Supabase `user_metadata.full_name`, when the user has set one. */
  name: string | null
  /** Initials from the name, else the email's first character. Never invented. */
  initials: string
  /** ISO timestamp of account creation, or null when /me could not be read. */
  createdAt: string | null
}

export interface AccountState {
  /** Null while loading, or when nobody is signed in. */
  identity: AccountIdentity | null
  /**
   * Analyses run this calendar month, or null when the figure is unavailable
   * (request failed, or no session). Null must render as "unavailable", not 0 —
   * zero is a claim that the user has run none.
   */
  analysesThisMonth: number | null
  loading: boolean
}

interface MeResponse {
  id: string
  email: string
  tier: string
  analysesThisMonth?: number
  createdAt?: string | null
}

/** First letters of a name, else the email's initial. Upper-cased, max two. */
function initialsFrom(name: string | null, email: string): string {
  if (name != null && name.trim() !== '') {
    const parts = name.trim().split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
  }
  return email[0]?.toUpperCase() ?? '?'
}

export function useAccount(): AccountState {
  const { session, loading: authLoading } = useAuth()
  const [analysesThisMonth, setAnalyses] = useState<number | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const email = session?.user?.email ?? null
  const metadata = session?.user?.user_metadata as { full_name?: string } | undefined
  const name = metadata?.full_name ?? null

  useEffect(() => {
    if (authLoading) return
    if (!session) {
      setAnalyses(null)
      setCreatedAt(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as MeResponse
        if (cancelled) return
        // Absent rather than zero when the API predates these fields, so an
        // older deployment reads as "unavailable" instead of "none run".
        setAnalyses(typeof data.analysesThisMonth === 'number' ? data.analysesThisMonth : null)
        setCreatedAt(data.createdAt ?? null)
      })
      .catch(() => {
        // Non-fatal: the page shows the figure as unavailable.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [session, authLoading])

  return {
    identity:
      email != null ? { email, name, initials: initialsFrom(name, email), createdAt } : null,
    analysesThisMonth,
    loading: authLoading || loading,
  }
}
