/**
 * useTier — a failed /me is "unavailable", not "free" (audit A-10).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const useAuthMock = vi.fn()
vi.mock('./useAuth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./useAuth')>()),
  useAuth: () => useAuthMock(),
}))

import { useTier } from './useTier'

const SIGNED_IN = { session: { access_token: 'jwt' }, user: {}, loading: false }

function meResponse(tier: string): Response {
  return new Response(JSON.stringify({ id: 'u', email: 'u@x', tier, stripeCustomerId: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('useTier', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAuthMock.mockReturnValue(SIGNED_IN)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('resolves the tier the API reports', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(meResponse('pro')))
    const { result } = renderHook(() => useTier())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(result.current.status).toBe('resolved')
    expect(result.current.tier).toBe('pro')
  })

  it('reports unavailable — not free — when /me fails twice', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useTier())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500)
    })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('unavailable')
    // The placeholder is still 'free' so gates have a value; the status is
    // what tells the UI not to present it as fact.
    expect(result.current.tier).toBe('free')
  })

  it('recovers on the retry', async () => {
    let calls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      calls += 1
      return calls === 1 ? Promise.reject(new Error('blip')) : Promise.resolve(meResponse('pro'))
    })
    const { result } = renderHook(() => useTier())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500)
    })
    expect(result.current.status).toBe('resolved')
    expect(result.current.tier).toBe('pro')
  })

  it('treats a non-200 as a failure too', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }))
    const { result } = renderHook(() => useTier())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500)
    })
    expect(result.current.status).toBe('unavailable')
  })

  it('is signed-out, and free by definition, without a session', async () => {
    useAuthMock.mockReturnValue({ session: null, user: null, loading: false })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { result } = renderHook(() => useTier())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(result.current.status).toBe('signed-out')
    expect(result.current.tier).toBe('free')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('asks again on refresh', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useTier())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500)
    })
    expect(result.current.status).toBe('unavailable')
    fetchSpy.mockImplementation(() => Promise.resolve(meResponse('professional')))
    await act(async () => {
      result.current.refresh()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(result.current.status).toBe('resolved')
    expect(result.current.tier).toBe('professional')
  })
})
