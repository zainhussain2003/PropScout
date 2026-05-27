/**
 * useAnalysis — manages the state for a single investment analysis run.
 *
 * Returns:
 *   analysis  — the completed Analysis object, or null before the first run.
 *   loading   — true while the request is in-flight.
 *   error     — user-facing error string, or null if no error.
 *   run       — triggers a new analysis; resets state before each call.
 */

import { useState } from 'react'
import { runAnalysis, ApiRequestError } from '../lib/services/analysisService'
import type { PropertyInput, FinancingInput, RentalInput } from '../types/api'
import type { Analysis } from '../types/analysis'

export interface UseAnalysisResult {
  analysis: Analysis | null
  loading: boolean
  error: string | null
  run: (property: PropertyInput, financing: FinancingInput, rental: RentalInput) => Promise<void>
}

export function useAnalysis(): UseAnalysisResult {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (
    property: PropertyInput,
    financing: FinancingInput,
    rental: RentalInput
  ): Promise<void> => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const result = await runAnalysis(property, financing, rental)
      setAnalysis(result)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message)
      } else {
        setError('Analysis failed — please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return { analysis, loading, error, run }
}
