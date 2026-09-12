/**
 * Resolve the caller's Supabase user from an Authorization header.
 *
 * The same eight-line block was inlined in /me, both billing routes and the
 * PDF route before this existed. Overrides needed a fifth copy, and an
 * authorization check is the wrong thing to keep copying: a divergence between
 * copies is a hole, not a style inconsistency.
 *
 * Returns a discriminated result rather than throwing, so each route decides
 * its own status code and message — the PDF route, for instance, treats a
 * missing session differently from an invalid one.
 */

import { type FastifyRequest } from 'fastify'
import { getSupabase } from '../services/supabaseService'

export type AuthResult =
  /** No Authorization header, or not a Bearer token. */
  | { ok: false; reason: 'missing' }
  /** A token was supplied but Supabase rejected it (expired, tampered, wrong project). */
  | { ok: false; reason: 'invalid' }
  | { ok: true; userId: string; email: string }

/**
 * Read and verify the bearer token on a request.
 *
 * Verification goes to Supabase (`auth.getUser`), so a JWT is never trusted on
 * the strength of its own claims.
 */
export async function resolveUser(req: FastifyRequest): Promise<AuthResult> {
  const header = req.headers.authorization
  if (header == null || !header.startsWith('Bearer ')) {
    return { ok: false, reason: 'missing' }
  }

  const token = header.slice(7).trim()
  if (token === '') return { ok: false, reason: 'missing' }

  try {
    const { data, error } = await getSupabase().auth.getUser(token)
    if (error != null || data.user == null) return { ok: false, reason: 'invalid' }
    return { ok: true, userId: data.user.id, email: data.user.email ?? '' }
  } catch {
    // A transport failure must not read as a valid session.
    return { ok: false, reason: 'invalid' }
  }
}
