/**
 * Rates routes — exposes Bank of Canada rate data to the React frontend.
 *
 * GET /rates/mortgage
 *   Returns the current prime rate with source metadata and an optional
 *   warning banner string for the UI.
 *
 * Registered in app.ts with prefix "/rates":
 *   await fastify.register(import('./routes/rates'), { prefix: '/rates' })
 * Fastify dynamic import requires a default export.
 */

import { type FastifyInstance } from 'fastify'
import { getMortgageRate } from '../services/bankOfCanadaService'

async function ratesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/mortgage', async (_req, reply) => {
    const rate = await getMortgageRate()
    return reply.send(rate)
  })
}

export default ratesRoutes
