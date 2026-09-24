/**
 * POST /analysis/:token/value — a landlord states what the property is worth,
 * and the report is re-run on that number (D-107, spec §9).
 *
 * A for-rent listing never carries a price, so the landlord report had no
 * honest purchase score (D-104). The spec's answer is that the landlord
 * supplies the value; this route persists it with the analysis and runs the
 * same pipeline POST /analysis ran, with the value in place of the
 * rent-derived estimate. Landlord mode only. Not counted against the quota —
 * it is a re-run of a report the person already has, like the facade recalc.
 *
 * Registered in app.ts with prefix "/analysis".
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import type { ReportMode } from '../types/analysis'
import { OWNER_VALUE, MORTGAGE_RATE_BOUNDS } from '../constants/thresholds'
import {
  getAnalysisByToken,
  getListingByToken,
  updateAnalysisStatus,
} from '../services/supabaseService'
import { applyValidationErrorHandler, tokenParams, ownerValueBody } from '../lib/requestSchemas'
import { runAnalysisPipeline } from './analysis'
import { denyUnlessReportOwner } from '../lib/reportOwner'
import { reportForViewer } from '../lib/reportAccess'

/** Tokens with a re-run in progress — one at a time per report. */
const inFlight = new Set<string>()

async function ownerValueRoutes(fastify: FastifyInstance): Promise<void> {
  applyValidationErrorHandler(fastify)

  fastify.post<{
    Params: { token: string }
    Body: { value: number; mortgageBalance?: number | null; mortgageRate?: number | null }
  }>(
    '/:token/value',
    { schema: { params: tokenParams, body: ownerValueBody } },
    async (req, reply) => {
      const { token } = req.params
      const denied = await denyUnlessReportOwner(req, token)
      if (denied) return reply.code(denied.status).send(makeError(denied.code, denied.message))
      const value = Math.round(req.body.value)

      if (!Number.isFinite(value) || value < OWNER_VALUE.MIN || value > OWNER_VALUE.MAX) {
        return reply
          .code(400)
          .send(
            makeError(
              'INVALID_VALUE',
              `Enter a property value between $${OWNER_VALUE.MIN.toLocaleString('en-CA')} and $${OWNER_VALUE.MAX.toLocaleString('en-CA')}.`
            )
          )
      }

      // Owned position (D-108): a balance from 0 (outright) up to the value,
      // and a contract rate in the engine's 1–25% band. Null means "purchase
      // case" and is the same as omitting it.
      const mortgageBalance =
        req.body.mortgageBalance != null ? Math.round(req.body.mortgageBalance) : null
      const mortgageRate = req.body.mortgageRate ?? null
      if (mortgageBalance != null && (mortgageBalance < 0 || mortgageBalance > value)) {
        return reply
          .code(400)
          .send(
            makeError(
              'INVALID_MORTGAGE_BALANCE',
              'The mortgage balance must be between $0 and the property value.'
            )
          )
      }
      if (
        mortgageRate != null &&
        (mortgageRate < MORTGAGE_RATE_BOUNDS.MIN || mortgageRate > MORTGAGE_RATE_BOUNDS.MAX)
      ) {
        return reply
          .code(400)
          .send(
            makeError(
              'INVALID_MORTGAGE_RATE',
              'Enter the mortgage rate as a percentage between 1 and 25.'
            )
          )
      }
      if (mortgageRate != null && mortgageBalance == null) {
        return reply
          .code(400)
          .send(
            makeError(
              'RATE_WITHOUT_BALANCE',
              'A mortgage rate only applies with a mortgage balance.'
            )
          )
      }

      if (inFlight.has(token)) {
        return reply
          .code(202)
          .send({ token, status: 'processing', message: 'This report is already re-running.' })
      }

      try {
        const found = await getAnalysisByToken(token)
        if (!found) {
          return reply.code(404).send(makeError('NOT_FOUND', 'Analysis not found or has expired.'))
        }
        const mode: ReportMode = found.analysis.mode
        if (mode !== 'landlord') {
          return reply
            .code(409)
            .send(
              makeError(
                'VALUE_NOT_APPLICABLE',
                'Only a landlord report takes a stated value — this listing already has a price.'
              )
            )
        }
        const listing = await getListingByToken(token)
        if (!listing) {
          return reply.code(404).send(makeError('NOT_FOUND', 'Analysis not found or has expired.'))
        }

        inFlight.add(token)
        try {
          const result = await runAnalysisPipeline(fastify, {
            token,
            mode,
            listing,
            ownerInputs: {
              value,
              mortgageBalance,
              mortgageRate,
              enteredAt: new Date().toISOString(),
            },
          })
          if (!result.ok) {
            return reply.code(result.status).send(makeError(result.code, result.message))
          }
          return reply.send({ token, analysis: await reportForViewer(req, result.analysis) })
        } finally {
          inFlight.delete(token)
        }
      } catch (err) {
        fastify.log.error({ err }, 'Unexpected error in POST /analysis/:token/value')
        await updateAnalysisStatus(token, 'failed', 'INTERNAL_ERROR').catch(() => {})
        return reply
          .code(500)
          .send(makeError('INTERNAL_ERROR', 'Something went wrong — try again.'))
      }
    }
  )
}

export default ownerValueRoutes
