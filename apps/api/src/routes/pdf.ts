/**
 * GET /analysis/:token/pdf — PDF export (spec Section 14, beta decision D-126).
 *
 * During public beta the report token is sufficient to export the PDF.
 * The legacy paid-mode branch still verifies the Supabase session and tier.
 * The PDF is Puppeteer's capture of the live web report.
 *
 * Registered in app.ts with prefix "/analysis".
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import {
  getSupabase,
  getUserById,
  upsertUser,
  getAnalysisByToken,
} from '../services/supabaseService'
import { generateReportPdf } from '../services/pdfService'
import { applyValidationErrorHandler, tokenParams } from '../lib/requestSchemas'
import { betaFreeAccess } from '../constants/tiers'

const PDF_TIERS = new Set(['pro', 'professional', 'team'])

async function pdfRoutes(fastify: FastifyInstance): Promise<void> {
  applyValidationErrorHandler(fastify)

  fastify.get<{ Params: { token: string } }>(
    '/:token/pdf',
    { schema: { params: tokenParams } },
    async (req, reply) => {
      const authHeader = req.headers.authorization
      if (!betaFreeAccess() && !authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send(makeError('UNAUTHORIZED', 'Sign in to export PDFs.'))
      }

      try {
        if (!betaFreeAccess() && authHeader?.startsWith('Bearer ')) {
          const jwt = authHeader.slice(7)
          const { data: authData, error: authError } = await getSupabase().auth.getUser(jwt)
          if (authError || !authData.user) {
            return reply.code(401).send(makeError('UNAUTHORIZED', 'Invalid or expired session.'))
          }

          await upsertUser(authData.user.id, authData.user.email ?? '')
          const user = await getUserById(authData.user.id)
          if (!user || !PDF_TIERS.has(user.tier)) {
            return reply
              .code(403)
              .send(makeError('UPGRADE_REQUIRED', 'PDF export is an Investor Pro feature.'))
          }
        }

        const { token } = req.params
        const found = await getAnalysisByToken(token)
        if (!found) {
          return reply.code(404).send(makeError('NOT_FOUND', 'Analysis not found or has expired.'))
        }

        const pdf = await generateReportPdf(token, found)
        if (pdf == null) {
          return reply
            .code(502)
            .send(makeError('PDF_FAILED', 'Could not generate the PDF — try again in a moment.'))
        }

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="propscout-report-${token}.pdf"`)
          .send(pdf)
      } catch (err) {
        fastify.log.error({ err }, 'Unexpected error in GET /analysis/:token/pdf')
        return reply
          .code(500)
          .send(makeError('INTERNAL_ERROR', 'Something went wrong — try again.'))
      }
    }
  )
}

export default pdfRoutes
