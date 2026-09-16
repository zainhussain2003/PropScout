/**
 * GET /analysis/:token
 * Polling endpoint used by the /analyzing page and the report page.
 * Returns status while in-flight, full analysis when complete,
 * 404 if not found, 410 if expired.
 * Registered in app.ts with prefix '/analysis'.
 *
 * Authorization is optional: send a bearer token and the response carries
 * `canOverride`, telling the report whether this viewer may change risk flags.
 * Without it the report is still readable — that is the point of a share link —
 * but the dismiss controls stay hidden rather than appearing and then failing.
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import {
  getAnalysisStatus,
  getAnalysisByToken,
  getAnalysisOwnerByToken,
  getAnalysisGuestId,
  countGuestAnalyses,
} from '../services/supabaseService'
import { resolveUser } from '../lib/requireUser'
import { applyValidationErrorHandler, tokenParams } from '../lib/requestSchemas'
import { readGuestId, guestLimitEnabled } from '../lib/guestSession'
import { GUEST } from '../constants/tiers'

async function getAnalysisTokenRoutes(fastify: FastifyInstance): Promise<void> {
  applyValidationErrorHandler(fastify)

  fastify.get<{ Params: { token: string } }>(
    '/:token',
    { schema: { params: tokenParams } },
    async (req, reply) => {
      const { token } = req.params

      try {
        // Step 1 — cheap status-only query
        const status = await getAnalysisStatus(token)

        if (status === null) {
          return reply.code(404).send(makeError('NOT_FOUND', 'Analysis not found.'))
        }

        // Step 2 — branch on status
        if (status === 'pending' || status === 'processing' || status === 'failed') {
          return reply.send({ status })
        }

        // status === 'complete' — fetch full analysis
        const result = await getAnalysisByToken(token)

        if (!result) {
          // Race condition or expiry between status check and fetch
          return reply.code(410).send(makeError('EXPIRED', 'This analysis has expired.'))
        }

        // Whether THIS viewer owns the analysis. Mirrors exactly what
        // overrides.ts enforces, so the UI cannot offer a write the API refuses:
        // an unowned analysis is never writable, because the share token is the
        // only credential and every viewer holds it.
        const auth = await resolveUser(req)
        const owner = auth.ok ? await getAnalysisOwnerByToken(token) : null
        const canOverride = auth.ok && owner?.userId != null && owner.userId === auth.userId

        // A guest viewing their own report (D-116): say what the allowance is
        // and whether the wall is on, so the page can invite sign-in honestly.
        let guest: { used: number; limit: number; limitEnabled: boolean } | null = null
        if (!auth.ok) {
          const guestId = readGuestId(req)
          if (guestId != null && (await getAnalysisGuestId(token)) === guestId) {
            const used = await countGuestAnalyses(guestId)
            guest = {
              used: used ?? 1,
              limit: GUEST.FREE_ANALYSES,
              limitEnabled: guestLimitEnabled(),
            }
          }
        }

        return reply.send({
          status: 'complete',
          analysis: result.analysis,
          listing: result.listing,
          canOverride,
          guest,
        })
      } catch (err) {
        fastify.log.error({ err }, 'Unexpected error in GET /analysis/:token')
        return reply
          .code(500)
          .send(makeError('INTERNAL_ERROR', 'Something went wrong — try again.'))
      }
    }
  )
}

export default getAnalysisTokenRoutes
