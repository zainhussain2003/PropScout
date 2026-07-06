/**
 * POST /analysis/:token/sunscout — recalculate SunScout for a user-chosen
 * facade bearing.
 *
 * The main analysis pipeline assumes a south-facing primary facade (180°).
 * This route turns that assumption into an input: it reads the analysis's
 * stored coordinates, asks the calc engine's lightweight /analysis/sunscout
 * endpoint for the new orientation (no extraction, no narrative re-run), and
 * persists the result so reloads keep the chosen orientation.
 *
 * Registered in app.ts with prefix "/analysis".
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import { getAnalysisByToken, updateAnalysisByToken } from '../services/supabaseService'
import { toSunScout, type PySunScout } from './analysis'

const CALC_ENGINE_URL = process.env.CALC_ENGINE_URL ?? 'http://localhost:8000'

async function sunscoutRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Params: { token: string }; Body: { facadeBearing?: number } }>(
    '/:token/sunscout',
    async (req, reply) => {
      const { token } = req.params
      const bearing = req.body?.facadeBearing ?? 180

      if (typeof bearing !== 'number' || Number.isNaN(bearing) || bearing < 0 || bearing > 360) {
        return reply
          .code(400)
          .send(makeError('INVALID_BEARING', 'Facade bearing must be between 0 and 360 degrees.'))
      }

      try {
        const found = await getAnalysisByToken(token)
        if (!found) {
          return reply.code(404).send(makeError('NOT_FOUND', 'Analysis not found or has expired.'))
        }

        const coords = found.analysis.coordinates
        if (coords == null) {
          return reply
            .code(422)
            .send(
              makeError(
                'NO_COORDINATES',
                'This analysis has no location data — sun modelling is unavailable.'
              )
            )
        }

        let pyResponse: Response
        try {
          pyResponse = await fetch(`${CALC_ENGINE_URL}/analysis/sunscout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: coords.lat, lng: coords.lng, azimuth_deg: bearing }),
          })
        } catch (err) {
          fastify.log.error({ err }, 'Calc engine unreachable for sunscout recalc')
          return reply
            .code(503)
            .send(makeError('CALC_ENGINE_UNAVAILABLE', 'Sun modelling temporarily unavailable.'))
        }

        if (!pyResponse.ok) {
          return reply
            .code(502)
            .send(makeError('CALC_ENGINE_ERROR', 'Sun modelling failed — try again.'))
        }

        const pyData = (await pyResponse.json()) as { sun_scout: PySunScout | null }
        const sunScout = toSunScout(pyData.sun_scout)

        // Persist so a reload keeps the chosen orientation. Non-fatal: the
        // recalculated data is still returned even if the save fails.
        try {
          await updateAnalysisByToken(token, { ...found.analysis, sunScout })
        } catch (err) {
          fastify.log.error({ err }, 'Failed to persist recalculated sunScout')
        }

        return reply.send({ sunScout })
      } catch (err) {
        fastify.log.error({ err }, 'Unexpected error in POST /analysis/:token/sunscout')
        return reply
          .code(500)
          .send(makeError('INTERNAL_ERROR', 'Something went wrong — try again.'))
      }
    }
  )
}

export default sunscoutRoutes
