/**
 * authService degraded-mode tests.
 *
 * Verifies every auth function degrades gracefully when VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY are unset — a missing env previously crashed
 * AuthProvider and blanked the entire app on every route.
 *
 * The env is stubbed empty per-test, then the authService module is reloaded
 * (it caches its client at module scope), so this passes regardless of the
 * env's real state on the machine running the suite.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type AuthService = typeof import('./authService')

async function loadDegradedAuthService(): Promise<AuthService> {
  vi.stubEnv('VITE_SUPABASE_URL', '')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
  vi.resetModules()
  return await import('./authService')
}

describe('authService without Supabase env configured', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('getSession resolves to null instead of throwing', async () => {
    const { getSession } = await loadDegradedAuthService()
    await expect(getSession()).resolves.toBeNull()
  })

  it('onAuthStateChange returns a no-op unsubscribe instead of throwing', async () => {
    const { onAuthStateChange } = await loadDegradedAuthService()
    const unsubscribe = onAuthStateChange(() => undefined)
    expect(typeof unsubscribe).toBe('function')
    expect(() => unsubscribe()).not.toThrow()
  })

  it('signInWithEmail returns a friendly error', async () => {
    const { signInWithEmail } = await loadDegradedAuthService()
    const result = await signInWithEmail('user@example.com')
    expect(result.error).toMatch(/unavailable/i)
  })

  it('signInWithGoogle returns a friendly error', async () => {
    const { signInWithGoogle } = await loadDegradedAuthService()
    const result = await signInWithGoogle()
    expect(result.error).toMatch(/unavailable/i)
  })

  it('signOut resolves without throwing', async () => {
    const { signOut } = await loadDegradedAuthService()
    await expect(signOut()).resolves.toBeUndefined()
  })

  it('resetPasswordForEmail returns a friendly error', async () => {
    const { resetPasswordForEmail } = await loadDegradedAuthService()
    const result = await resetPasswordForEmail('user@example.com')
    expect(result.error).toMatch(/unavailable/i)
  })

  it('updatePassword returns a friendly error when auth is not configured', async () => {
    const { updatePassword } = await loadDegradedAuthService()
    const result = await updatePassword('newpassword123')
    expect(result.error).toMatch(/unavailable/i)
  })
})
