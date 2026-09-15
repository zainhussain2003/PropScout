/**
 * useOwnerValue — a landlord states the property's value and the report is
 * re-run on it (D-107). Wraps analysisService.setOwnerValue: busy while the
 * pipeline runs (comps, engine, narrative — several seconds), an error the
 * form can show, and the fresh Analysis handed to the page on success.
 */

import { useCallback, useState } from 'react'
import type { Analysis } from '../types/analysis'
import { ApiRequestError, setOwnerValue } from '../lib/services/analysisService'
import type { OwnerValueSubmission } from '../components/landlord/OwnerValueForm'

interface UseOwnerValueResult {
  submit: (submission: OwnerValueSubmission) => Promise<void>
  busy: boolean
  error: string | null
}

export function useOwnerValue(
  token: string | null,
  onUpdated: (analysis: Analysis) => void
): UseOwnerValueResult {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    async (submission: OwnerValueSubmission): Promise<void> => {
      if (token == null || busy) return
      setBusy(true)
      setError(null)
      try {
        const analysis = await setOwnerValue(token, submission)
        onUpdated(analysis)
      } catch (err) {
        setError(
          err instanceof ApiRequestError
            ? err.message
            : 'Could not re-run the report — try again in a moment.'
        )
      } finally {
        setBusy(false)
      }
    },
    [token, busy, onUpdated]
  )

  return { submit, busy, error }
}
