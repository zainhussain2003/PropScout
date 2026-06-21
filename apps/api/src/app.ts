import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'
// Load project-root .env — works from apps/api/src in dev and dist in prod
dotenvConfig({ path: resolve(__dirname, '../../../.env') })

import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'

const fastify = Fastify({
  logger: true,
})

async function main(): Promise<void> {
  // ── Plugins ────────────────────────────────────────────────────────────────

  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })

  // Rate limit — relaxed in dev, tightened before production deploy
  await fastify.register(rateLimit, {
    max: process.env.NODE_ENV === 'production' ? 10 : 200,
    timeWindow: '1 minute',
  })

  // ── Routes ─────────────────────────────────────────────────────────────────

  await fastify.register(import('./routes/rates'), { prefix: '/rates' })

  await fastify.register(import('./routes/analysis'), { prefix: '/analysis' })

  await fastify.register(import('./routes/analysisToken'), { prefix: '/analysis' })

  await fastify.register(import('./routes/scrape'), { prefix: '/scrape' })

  // Routes registered as each is built:
  // await fastify.register(import('./routes/webhooks'), { prefix: '/webhooks' })

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
