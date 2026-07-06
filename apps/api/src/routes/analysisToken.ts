/**
 * GET /analysis/:token
 * Polling endpoint used by the /analyzing page and the report page.
 * Returns status while in-flight, full analysis when complete,
 * 404 if not found, 410 if expired.
 * Registered in app.ts with prefix '/analysis'.
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import { getAnalysisStatus, getAnalysisByToken } from '../services/supabaseService'

async function getAnalysisTokenRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: { token: string } }>('/:token', async (req, reply) => {
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

      return reply.send({ status: 'complete', analysis: result.analysis, listing: result.listing })
    } catch (err) {
      fastify.log.error({ err }, 'Unexpected error in GET /analysis/:token')
      return reply.code(500).send(makeError('INTERNAL_ERROR', 'Something went wrong — try again.'))
    }
  })
}

export default getAnalysisTokenRoutes
