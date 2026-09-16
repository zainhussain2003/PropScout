/**
 * Anonymous visitor identity for the guest allowance (D-116).
 *
 * The server issues the id — a random UUID in a first-party HttpOnly cookie —
 * and the server counts against it; nothing the page's JavaScript holds is
 * the authority. It is a soft entitlement boundary for one free report, not
 * anti-fraud identity: a cleared cookie starts over, and that is accepted.
 * No fingerprinting, no IP joins.
 *
 * Cross-site: the web app and the API are on different sites in production,
 * so the cookie is SameSite=None; Secure there and Lax on http localhost
 * (same site by port). The client must send fetches with credentials.
 */

import { randomUUID } from 'crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
// Module augmentation for req.cookies / reply.setCookie.
import '@fastify/cookie'
import { GUEST } from '../constants/tiers'

export const GUEST_COOKIE = 'ps_guest'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The visitor's id from the cookie, or null when absent or malformed. */
export function readGuestId(req: FastifyRequest): string | null {
  const raw = (req.cookies as Record<string, string | undefined> | undefined)?.[GUEST_COOKIE]
  return raw != null && UUID_RE.test(raw) ? raw.toLowerCase() : null
}

/** The visitor's id, issuing one (and setting the cookie) when there is none. */
export function ensureGuestId(req: FastifyRequest, reply: FastifyReply): string {
  const existing = readGuestId(req)
  if (existing != null) return existing
  const id = randomUUID()
  const production = process.env.NODE_ENV === 'production'
  reply.setCookie(GUEST_COOKIE, id, {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/',
    maxAge: GUEST.COOKIE_MAX_AGE_SECONDS,
  })
  return id
}

/** Whether the wall is switched on (D-116: off until auth email is reliable). */
export function guestLimitEnabled(): boolean {
  return process.env.GUEST_ANALYSIS_LIMIT_ENABLED === 'true'
}
