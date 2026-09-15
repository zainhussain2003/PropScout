import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOwnerValue } from './useOwnerValue'
import type { Analysis } from '../types/analysis'

const setOwnerValue = vi.fn()
vi.mock('../lib/services/analysisService', () => ({
  setOwnerValue: (token: string, value: number) => setOwnerValue(token, value),
  ApiRequestError: class ApiRequestError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly status: number
    ) {
      super(message)
    }
  },
}))

const ANALYSIS = { token: 't', mode: 'landlord' } as Analysis

describe('useOwnerValue (D-107)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('posts the value and hands the fresh analysis to the page', async () => {
    setOwnerValue.mockResolvedValue(ANALYSIS)
    const onUpdated = vi.fn()
    const { result } = renderHook(() => useOwnerValue('t', onUpdated))
    await act(() => result.current.submit(800_000))
    expect(setOwnerValue).toHaveBeenCalledWith('t', 800_000)
    expect(onUpdated).toHaveBeenCalledWith(ANALYSIS)
    expect(result.current.busy).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('surfaces the API message on failure and leaves the page untouched', async () => {
    const { ApiRequestError } = await import('../lib/services/analysisService')
    setOwnerValue.mockRejectedValue(
      new ApiRequestError('INVALID_VALUE', 'Enter a value between…', 400)
    )
    const onUpdated = vi.fn()
    const { result } = renderHook(() => useOwnerValue('t', onUpdated))
    await act(() => result.current.submit(1))
    expect(onUpdated).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Enter a value between…')
  })

  it('a non-API failure gets a generic message', async () => {
    setOwnerValue.mockRejectedValue(new TypeError('boom'))
    const { result } = renderHook(() => useOwnerValue('t', vi.fn()))
    await act(() => result.current.submit(800_000))
    expect(result.current.error).toMatch(/Could not re-run the report/)
  })

  it('does nothing without a token', async () => {
    const { result } = renderHook(() => useOwnerValue(null, vi.fn()))
    await act(() => result.current.submit(800_000))
    expect(setOwnerValue).not.toHaveBeenCalled()
  })
})
