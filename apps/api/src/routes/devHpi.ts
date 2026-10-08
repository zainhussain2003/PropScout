import type { FastifyInstance } from 'fastify'
import { devHpiEnabled, readDevHpi } from '../services/devHpiService'

function localHost(host: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${host}`).hostname)
  } catch {
    return false
  }
}

export default async function devHpiRoutes(app: FastifyInstance): Promise<void> {
  if (!devHpiEnabled()) return
  app.get<{ Querystring: { market?: string; housingType?: string; month?: string } }>(
    '/benchmarks',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            market: { type: 'string', minLength: 1, maxLength: 200 },
            housingType: {
              type: 'string',
              enum: ['Composite', 'Single Family', 'Townhouse', 'Apartment'],
            },
            month: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$' },
          },
        },
      },
    },
    async (request, reply) => {
      const localIp = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.ip)
      let allowedOrigin = !request.headers.origin
      try {
        if (request.headers.origin)
          allowedOrigin = localHost(new URL(request.headers.origin).hostname)
      } catch {
        allowedOrigin = false
      }
      if (!devHpiEnabled() || !localIp || !localHost(request.hostname) || !allowedOrigin) {
        return reply.code(404).send({ error: 'Not found' })
      }
      reply.header('Cache-Control', 'no-store')
      try {
        return await readDevHpi(request.query)
      } catch {
        // Do not log Python stderr: it may contain private source values.
        return reply.code(503).send({ error: 'Local benchmark database unavailable' })
      }
    }
  )
}
