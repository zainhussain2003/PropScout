/**
 * useAuth — React hook + AuthContext for global auth state.
 *
 * Provides:
 *   user     — Supabase User or null
 *   session  — full Supabase Session or null
 *   loading  — true while initial session is being resolved
 *   signIn   — send magic-link to email
 *   signInGoogle — start Google OAuth flow
 *   signOut  — sign out current user
 *
 * Usage:
 *   Wrap the app in <AuthProvider> (in App.tsx).
 *   Any component can call useAuth() to read state and trigger actions.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { type User, type Session } from '@supabase/supabase-js'
import {
  getSession,
  onAuthStateChange,
  signInWithEmail,
  signInWithGoogle,
  signOut as authSignOut,
} from '../lib/services/authService'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export interface AuthContextValue extends AuthState {
  signIn: (email: string) => Promise<{ error: string | null }>
  signInGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Resolve existing session on mount
    void getSession().then((s) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    // Subscribe to future auth events
    const unsubscribe = onAuthStateChange((s) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    // Unsubscribe on cleanup to prevent memory leaks
    return unsubscribe
  }, [])

  const signIn = useCallback(async (email: string): Promise<{ error: string | null }> => {
    return signInWithEmail(email)
  }, [])

  const signInGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    return signInWithGoogle()
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    await authSignOut()
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signIn,
    signInGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Fallback for test environments and components rendered outside AuthProvider ──

const NULL_AUTH: AuthContextValue = {
  user: null,
  session: null,
  loading: false,
  signIn: async () => ({ error: null }),
  signInGoogle: async () => ({ error: null }),
  signOut: async () => {},
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useAuth — returns the current auth state and action methods.
 * Returns unauthenticated defaults when rendered outside an <AuthProvider>
 * (tests, Storybook, etc.). In production, App.tsx always wraps with AuthProvider.
 */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext) ?? NULL_AUTH
}
