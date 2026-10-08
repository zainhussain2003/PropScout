import type { FastifyInstance } from 'fastify'
import { buildInfo } from '../lib/buildInfo'

export function registerHealthRoute(app: FastifyInstance): void {
  // Host readiness probes must not consume the visitor's API allowance.
  app.get('/health', { config: { rateLimit: false } }, async () => ({
    status: 'ok',
    ts: new Date().toISOString(),
    ...buildInfo(),
  }))
}
