import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import type { FastifyRequest } from 'fastify'

const fastify = Fastify({
  logger: true,
})

async function main(): Promise<void> {
  // ── Plugins ────────────────────────────────────────────────────────────────

  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })

  // Rate limit — 10 requests per minute per IP on all routes
  // The analysis endpoint is the most exposed surface
  await fastify.register(rateLimit, {
    max: 10,
    timeWindow: '1 minute',
  })

  // Preserve raw body for Stripe webhook signature verification.
  // Must be registered before routes so the rawBody field is populated.
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    function (
      _req: FastifyRequest,
      body: Buffer,
      done: (err: Error | null, result: unknown) => void
    ) {
      try {
        const parsed: unknown = JSON.parse(body.toString())
        // Attach raw buffer for routes that need it (Stripe webhook)
        ;(_req as FastifyRequest & { rawBody?: Buffer }).rawBody = body
        done(null, parsed)
      } catch (err) {
        done(err as Error, undefined)
      }
    }
  )

  // ── Routes ─────────────────────────────────────────────────────────────────

  await fastify.register(import('./routes/rates'), { prefix: '/rates' })

  await fastify.register(import('./routes/analysis'), { prefix: '/analysis' })

  await fastify.register(import('./routes/scrape'), { prefix: '/scrape' })

  await fastify.register(import('./routes/billing'), { prefix: '/billing' })

  await fastify.register(import('./routes/webhooks'), { prefix: '/webhooks' })

  await fastify.register(import('./routes/me'), { prefix: '/me' })

  fastify.get('/health', async (_req, _reply) => {
    return { status: 'ok', ts: new Date().toISOString() }
  })

  // ── Start ───────────────────────────────────────────────────────────────────

  const PORT = Number(process.env.PORT ?? 3001)

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

main().catch((err) => {
  fastify.log.error(err)
  process.exit(1)
})
