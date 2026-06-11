/**
 * authService degraded-mode tests.
 *
 * When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set (as in this
 * test environment), every auth function must degrade gracefully instead of
 * throwing — a missing env previously crashed AuthProvider and blanked the
 * entire app on every route.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getSession,
  onAuthStateChange,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  resetPasswordForEmail,
  updatePassword,
} from './authService'

describe('authService without Supabase env configured', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getSession resolves to null instead of throwing', async () => {
    await expect(getSession()).resolves.toBeNull()
  })

  it('onAuthStateChange returns a no-op unsubscribe instead of throwing', () => {
    const unsubscribe = onAuthStateChange(() => undefined)
    expect(typeof unsubscribe).toBe('function')
    expect(() => unsubscribe()).not.toThrow()
  })

  it('signInWithEmail returns a friendly error', async () => {
    const result = await signInWithEmail('user@example.com')
    expect(result.error).toMatch(/unavailable/i)
  })

  it('signInWithGoogle returns a friendly error', async () => {
    const result = await signInWithGoogle()
    expect(result.error).toMatch(/unavailable/i)
  })

  it('signOut resolves without throwing', async () => {
    await expect(signOut()).resolves.toBeUndefined()
  })

  it('resetPasswordForEmail returns a friendly error', async () => {
    const result = await resetPasswordForEmail('user@example.com')
    expect(result.error).toMatch(/unavailable/i)
  })

  it('updatePassword returns a friendly error when auth is not configured', async () => {
    const result = await updatePassword('newpassword123')
    expect(result.error).toMatch(/unavailable/i)
  })
})
