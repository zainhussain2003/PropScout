/**
 * useFlagOverrides — manages risk-flag dismissals for a given analysis token.
 *
 * Loads existing overrides on mount, exposes `dismiss(flagId)` and
 * `undismiss(flagId)` with optimistic updates + API persistence. On API
 * failure, the optimistic change is rolled back and an error is surfaced.
 *
 * The hook is no-op (no API calls, empty set, all callbacks resolve) when
 * `token` is null or the literal string 'demo' — keeps demo flows free of
 * network noise.
 */

import { useCallback, useEffect, useState } from 'react'
import { listOverrides, addOverride, removeOverride } from '../lib/services/overrideService'

interface UseFlagOverridesResult {
  overrides: Set<string>
  loading: boolean
  error: string | null
  dismiss: (flagId: string) => Promise<void>
  undismiss: (flagId: string) => Promise<void>
}

const NOOP = (): Promise<void> => Promise.resolve()

export function useFlagOverrides(token: string | null): UseFlagOverridesResult {
  const [overrides, setOverrides] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const isLive = token != null && token !== '' && token !== 'demo'

  useEffect(() => {
    if (!isLive) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    void listOverrides(token!).then((ids) => {
      if (cancelled) return
      setOverrides(new Set(ids))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [token, isLive])

  const dismiss = useCallback(
    async (flagId: string): Promise<void> => {
      if (!isLive) return
      // Optimistic
      setOverrides((prev) => {
        const next = new Set(prev)
        next.add(flagId)
        return next
      })
      try {
        await addOverride(token!, flagId)
        setError(null)
      } catch (err) {
        setOverrides((prev) => {
          const next = new Set(prev)
          next.delete(flagId)
          return next
        })
        setError(err instanceof Error ? err.message : 'Could not save dismissal.')
      }
    },
    [token, isLive]
  )

  const undismiss = useCallback(
    async (flagId: string): Promise<void> => {
      if (!isLive) return
      setOverrides((prev) => {
        const next = new Set(prev)
        next.delete(flagId)
        return next
      })
      try {
        await removeOverride(token!, flagId)
        setError(null)
      } catch (err) {
        setOverrides((prev) => {
          const next = new Set(prev)
          next.add(flagId)
          return next
        })
        setError(err instanceof Error ? err.message : 'Could not un-dismiss flag.')
      }
    },
    [token, isLive]
  )

  return {
    overrides,
    loading,
    error,
    dismiss: isLive ? dismiss : NOOP,
    undismiss: isLive ? undismiss : NOOP,
  }
}
