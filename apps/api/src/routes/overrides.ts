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
 * /analysis/:token). Anyone with the share token can manage overrides for
 * that analysis — same trust model as viewing the report.
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import { getFlagOverrides, addFlagOverride, deleteFlagOverride } from '../services/supabaseService'

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

    const ok = await deleteFlagOverride(token, flagId)
    if (!ok) {
      return reply.code(404).send(makeError('NOT_FOUND', 'Analysis not found for this token.'))
    }

    return reply.send({ ok: true })
  })
}

export default overridesRoutes
