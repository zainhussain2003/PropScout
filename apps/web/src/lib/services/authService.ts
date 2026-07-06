/**
 * authService — Supabase Auth for the frontend.
 *
 * Auth is the ONE exception where the frontend calls Supabase directly.
 * All other data goes through the Fastify API.
 *
 * When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured the
 * service degrades gracefully: sessions resolve to null and sign-in attempts
 * return a friendly error — the app must NEVER crash because auth is
 * unconfigured (the previous behaviour blanked every page).
 *
 * Exports:
 *   signInWithEmail   — magic link via OTP
 *   signInWithGoogle  — Google OAuth
 *   signOut           — sign out current session
 *   getSession        — returns current Session or null
 *   onAuthStateChange — subscribe to auth events; returns unsubscribe fn
 *   resetPasswordForEmail — send password reset email
 */

import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

type AnonClient = SupabaseClient<never, 'public', never>
let _client: AnonClient | null = null
let _initFailed = false

const AUTH_UNAVAILABLE = 'Sign-in is temporarily unavailable — please try again later.'

/**
 * Lazily create the Supabase client. Returns null (and logs once) when the
 * environment variables are missing or client construction fails.
 */
function getClient(): AnonClient | null {
  if (_client != null) return _client
  if (_initFailed) return null

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  if (!url || !key) {
    _initFailed = true
    console.error(
      '[authService] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — auth disabled'
    )
    return null
  }

  try {
    _client = createClient(url, key) as AnonClient
    return _client
  } catch (err) {
    _initFailed = true
    console.error('[authService] Supabase client init failed — auth disabled', err)
    return null
  }
}

/**
 * Send a magic-link OTP to the given email address.
 * The user clicks the link and lands on /auth/confirm.
 *
 * @returns { error: null } on success, { error: message } on failure
 */
export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  const client = getClient()
  if (client == null) return { error: AUTH_UNAVAILABLE }
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + '/auth/confirm',
    },
  })
  if (error != null) {
    return { error: error.message }
  }
  return { error: null }
}

/**
 * Start Google OAuth sign-in flow.
 * Redirects the browser; on return the user lands on /auth/confirm.
 *
 * @returns { error: null } on success (redirect happens), { error: message } on failure
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const client = getClient()
  if (client == null) return { error: AUTH_UNAVAILABLE }
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth/confirm',
    },
  })
  if (error != null) {
    return { error: error.message }
  }
  return { error: null }
}

/**
 * Sign the current user out and clear the local session.
 */
export async function signOut(): Promise<void> {
  const client = getClient()
  if (client == null) return
  await client.auth.signOut()
}

/**
 * Get the current Supabase session.
 * Returns null if no user is signed in or auth is not configured.
 */
export async function getSession(): Promise<Session | null> {
  const client = getClient()
  if (client == null) return null
  try {
    const { data } = await client.auth.getSession()
    return data.session
  } catch (err) {
    console.error('[authService] getSession failed', err)
    return null
  }
}

/**
 * Subscribe to auth state changes (sign-in, sign-out, token refresh).
 * No-op (returns a no-op unsubscribe) when auth is not configured.
 *
 * @param callback - called with the new Session (or null on sign-out)
 * @returns unsubscribe function — MUST be called on component unmount to prevent leaks
 */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const client = getClient()
  if (client == null) return () => undefined
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => subscription.unsubscribe()
}

/**
 * Send a password reset email.
 * User clicks the link and lands on /auth/reset/confirm.
 *
 * @returns { error: null } on success, { error: message } on failure
 */
export async function resetPasswordForEmail(email: string): Promise<{ error: string | null }> {
  const client = getClient()
  if (client == null) return { error: AUTH_UNAVAILABLE }
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/auth/reset/confirm',
  })
  if (error != null) {
    return { error: error.message }
  }
  return { error: null }
}

/**
 * Update the current user's password.
 * Only valid when the user has an active password-recovery session
 * (i.e. they clicked the reset-password link from their email and landed
 * on /auth/reset/confirm, where Supabase auto-detected the recovery code).
 *
 * @returns { error: null } on success, { error: message } on failure
 */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const client = getClient()
  if (client == null) return { error: AUTH_UNAVAILABLE }
  const { error } = await client.auth.updateUser({ password: newPassword })
  if (error != null) {
    return { error: error.message }
  }
  return { error: null }
}
