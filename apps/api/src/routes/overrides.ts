/**
 * Risk-flag overrides — user can dismiss flags they've evaluated and
 * decided don't apply. Dismissals are persisted here (flag_overrides) and take
 * effect two ways, which agree:
 *   - Live: the report UI restores each dismissed flag's deduction to the deal
 *     score immediately (adjustDealScoreForOverrides in apps/web), recomputing
 *     from the score subtotal so it never depends on the stored total.
 *   - On re-run: POST /analysis forwards the dismissed flag IDs to the calc
 *     engine, which drops their deduction so the stored deal_score converges on
 *     the same value. Dismissed flags are still returned (shown greyed out),
 *     just no longer deducted. The live recompute is idempotent w.r.t. this, so
 *     the two paths can't double-count.
 *
 * Routes (mounted with prefix /analysis):
 *   GET    /:token/overrides              → { overrides: string[] }
 *   POST   /:token/overrides              → { ok: true } (body: { flagId })
 *   DELETE /:token/overrides/:flagId      → { ok: true }
 *
 * The token here is the analysis share_token (same one used by GET/POST
 * /analysis/:token).
 *
 * AUTHORIZATION. Reading is token-scoped: which flags were dismissed is part
 * of the report's content, so anyone who can view the report can see it.
 * WRITING requires an authenticated session whose user owns the analysis.
 *
 * The share token is deliberately NOT proof of ownership. It is a bearer
 * capability the owner hands to people they want to show the report to, and it
 * previously authorized writes — so a recipient could dismiss or restore risk
 * flags on someone else's analysis, which changes the stored deal score on the
 * next re-run (POST /analysis forwards dismissed ids to the calc engine). That
 * was the audit's open P0.
 *
 * An analysis with no owner (`user_id` null — created without a session) can
 * therefore never be written to: nobody can prove they created it, because the
 * only credential is the token every viewer holds. It is refused rather than
 * treated as unowned-and-writable.
 *
 * Note that RLS on `flag_overrides` cannot help here: the API holds the
 * service-role key, which bypasses it. The check has to be in the route.
 */

import { type FastifyInstance, type FastifyRequest } from 'fastify'
import { makeError } from '../types/api'
import {
  getFlagOverrides,
  addFlagOverride,
  deleteFlagOverride,
  getAnalysisOwnerByToken,
} from '../services/supabaseService'
import { resolveUser } from '../lib/requireUser'

interface TokenParam {
  token: string
}

interface TokenFlagParams {
  token: string
  flagId: string
}

interface PostBody {
  flagId?: string
}

/**
 * Why the caller may not write, or null when they may.
 *
 * Deliberately a plain value rather than a sent reply: the first version
 * returned `reply.code(401).send(...)` and relied on that being non-null, but
 * `send()` resolved to undefined, so `denied != null` was false and the handler
 * sent a 401 **and then performed the write anyway**. An authorization gate
 * must not depend on a framework's return-value semantics — the caller now
 * decides to send, and there is nothing to mistake for "allowed".
 */
interface Denial {
  status: 401 | 403 | 404
  code: string
  message: string
}

/**
 * Check that the caller is signed in AND owns the analysis behind `token`.
 *
 * Ordering is deliberate: authentication is checked before the analysis is
 * looked up, so an unauthenticated caller learns nothing about whether a token
 * exists.
 */
async function denyUnlessOwner(req: FastifyRequest, token: string): Promise<Denial | null> {
  const auth = await resolveUser(req)
  if (!auth.ok) {
    return {
      status: 401,
      code: 'UNAUTHORIZED',
      message:
        auth.reason === 'missing'
          ? 'Sign in to change risk flags on this report.'
          : 'Your session has expired — sign in again.',
    }
  }

  const owner = await getAnalysisOwnerByToken(token)
  if (owner == null) {
    return { status: 404, code: 'NOT_FOUND', message: 'Analysis not found for this token.' }
  }

  if (owner.userId == null || owner.userId !== auth.userId) {
    // Same response either way: an analysis with no owner and someone else's
    // analysis are both "not yours", and distinguishing them would tell a
    // link-holder whether the report has an account behind it.
    return {
      status: 403,
      code: 'NOT_OWNER',
      message: 'Only the person who created this report can change its risk flags.',
    }
  }

  return null
}

async function overridesRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET ────────────────────────────────────────────────────────────────────
  fastify.get<{ Params: TokenParam }>('/:token/overrides', async (req, reply) => {
    const { token } = req.params
    if (!token) {
      return reply.code(400).send(makeError('MISSING_TOKEN', 'Token is required.'))
    }

    const overrides = await getFlagOverrides(token)
    return reply.send({ overrides })
  })

  // ── POST ───────────────────────────────────────────────────────────────────
  fastify.post<{ Params: TokenParam; Body: PostBody }>('/:token/overrides', async (req, reply) => {
    const { token } = req.params
    const flagId = req.body?.flagId

    if (!token) {
      return reply.code(400).send(makeError('MISSING_TOKEN', 'Token is required.'))
    }
    if (!flagId || typeof flagId !== 'string') {
      return reply
        .code(400)
        .send(makeError('MISSING_FLAG_ID', 'flagId is required in the request body.'))
    }

    const denied = await denyUnlessOwner(req, token)
    if (denied) {
      return reply.code(denied.status).send(makeError(denied.code, denied.message))
    }

    const ok = await addFlagOverride(token, flagId)
    if (!ok) {
      return reply.code(404).send(makeError('NOT_FOUND', 'Analysis not found for this token.'))
    }

    return reply.send({ ok: true })
  })

  // ── DELETE ─────────────────────────────────────────────────────────────────
  fastify.delete<{ Params: TokenFlagParams }>('/:token/overrides/:flagId', async (req, reply) => {
    const { token, flagId } = req.params

    if (!token) {
      return reply.code(400).send(makeError('MISSING_TOKEN', 'Token is required.'))
    }
    if (!flagId) {
      return reply.code(400).send(makeError('MISSING_FLAG_ID', 'flagId is required.'))
    }

    const denied = await denyUnlessOwner(req, token)
    if (denied) {
      return reply.code(denied.status).send(makeError(denied.code, denied.message))
    }

    const ok = await deleteFlagOverride(token, flagId)
    if (!ok) {
      return reply.code(404).send(makeError('NOT_FOUND', 'Analysis not found for this token.'))
    }

    return reply.send({ ok: true })
  })
}

export default overridesRoutes
