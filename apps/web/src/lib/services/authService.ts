/**
 * authService — Supabase Auth for the frontend.
 *
 * Auth is the ONE exception where the frontend calls Supabase directly.
 * All other data goes through the Fastify API.
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

function getClient(): AnonClient {
  if (_client == null) {
    const url = import.meta.env.VITE_SUPABASE_URL as string
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    _client = createClient(url, key) as AnonClient
  }
  return _client
}

/**
 * Send a magic-link OTP to the given email address.
 * The user clicks the link and lands on /auth/confirm.
 *
 * @returns { error: null } on success, { error: message } on failure
 */
export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  const { error } = await getClient().auth.signInWithOtp({
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
  const { error } = await getClient().auth.signInWithOAuth({
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
  await getClient().auth.signOut()
}

/**
 * Get the current Supabase session synchronously from the local store.
 * Returns null if no user is signed in.
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await getClient().auth.getSession()
  return data.session
}

/**
 * Subscribe to auth state changes (sign-in, sign-out, token refresh).
 *
 * @param callback - called with the new Session (or null on sign-out)
 * @returns unsubscribe function — MUST be called on component unmount to prevent leaks
 */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = getClient().auth.onAuthStateChange((_event, session) => {
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
  const { error } = await getClient().auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/auth/reset/confirm',
  })
  if (error != null) {
    return { error: error.message }
  }
  return { error: null }
}
