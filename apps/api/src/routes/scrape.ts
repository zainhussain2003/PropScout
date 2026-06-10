/**
 * Scrape route — POST /scrape
 *
 * Proxies a Realtor.ca (or supported) listing URL to the Python calc-engine's
 * /scrape/ endpoint. Normalises error responses so the frontend can decide
 * whether to show the province waitlist, the manual-entry fallback, or the
 * scraped listing data.
 *
 * Error codes returned to frontend:
 *   province_not_supported → 400  (show waitlist modal)
 *   scrape_failed          → 422  (show manual entry)
 *   SCRAPE_SERVICE_UNAVAILABLE → 503 (show generic error)
 *
 * Registered in app.ts with prefix "/scrape":
 *   await fastify.register(import('./routes/scrape'), { prefix: '/scrape' })
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'

const CALC_ENGINE_URL = process.env.CALC_ENGINE_URL ?? 'http://localhost:8000'

interface ScrapeRequestBody {
  url: string
}

/** Shape returned by the Python calc-engine on error */
interface CalcEngineScrapeError {
  error: string
  province?: string
  [key: string]: unknown
}

function isScrapeRequestBody(body: unknown): body is ScrapeRequestBody {
  return typeof body === 'object' && body !== null && 'url' in body && typeof (body as Record<string, unknown>)['url'] === 'string'
}

async function scrapeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/', async (req, reply) => {
    if (!isScrapeRequestBody(req.body)) {
      return reply
        .code(400)
        .send(makeError('INVALID_REQUEST', 'A "url" string is required in the request body.'))
    }

    const { url } = req.body

    if (url.trim().length === 0) {
      return reply
        .code(400)
        .send(makeError('INVALID_URL', 'URL cannot be empty.'))
    }

    let calcResponse: Response
    try {
      calcResponse = await fetch(`${CALC_ENGINE_URL}/scrape/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    } catch (err) {
      fastify.log.error({ err }, 'Calc engine unreachable during scrape')
      return reply
        .code(503)
        .send(
          makeError(
            'SCRAPE_SERVICE_UNAVAILABLE',
            'The scraping service is temporarily unavailable — try again in a moment or enter the details manually.',
            String(err)
          )
        )
    }

    // Parse the response body (could be error or success)
    let responseBody: unknown
    try {
      responseBody = await calcResponse.json()
    } catch {
      const text = await calcResponse.text().catch(() => '')
      fastify.log.error({ status: calcResponse.status, body: text }, 'Calc engine scrape returned unparseable response')
      return reply
        .code(502)
        .send(
          makeError(
            'SCRAPE_INVALID_RESPONSE',
            'Received an unexpected response from the scraping service — try again or enter details manually.',
            text
          )
        )
    }

    // Handle known calc-engine error shapes
    if (!calcResponse.ok) {
      const errBody = responseBody as CalcEngineScrapeError

      if (errBody.error === 'province_not_supported') {
        fastify.log.info({ province: errBody.province }, 'Scrape rejected — province not supported')
        return reply.code(400).send({
          error: true,
          code: 'PROVINCE_NOT_SUPPORTED',
          message: 'PropScout currently covers Ontario only. Enter your email to be notified when we expand.',
          province: errBody.province ?? null,
        })
      }

      if (errBody.error === 'scrape_failed') {
        fastify.log.warn({ url }, 'Scrape failed — prompting manual entry')
        return reply
          .code(422)
          .send(
            makeError(
              'SCRAPE_FAILED',
              'Could not read that listing — enter the details manually and we will run the analysis.',
            )
          )
      }

      // Unknown error from calc engine
      fastify.log.error({ status: calcResponse.status, body: errBody }, 'Calc engine scrape returned unknown error')
      return reply
        .code(500)
        .send(
          makeError(
            'SCRAPE_ERROR',
            'An error occurred while reading that listing — try again or enter the details manually.',
            JSON.stringify(errBody)
          )
        )
    }

    // Success — return scraped listing data to frontend
    return reply.code(200).send(responseBody)
  })
}

export default scrapeRoutes
