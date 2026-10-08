import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { registerHealthRoute } from './health'

test('host probes stay healthy while application requests remain rate limited', async () => {
  const app = Fastify()
  await app.register(rateLimit, { max: 2, timeWindow: '1 minute' })
  registerHealthRoute(app)
  app.get('/limited', async () => ({ ok: true }))
  try {
    for (let i = 0; i < 15; i++) {
      const health = await app.inject('/health')
      expect(health.statusCode).toBe(200)
      expect(health.json().status).toBe('ok')
    }
    expect((await app.inject('/limited')).statusCode).toBe(200)
    expect((await app.inject('/limited')).statusCode).toBe(200)
    expect((await app.inject('/limited')).statusCode).toBe(429)
    expect((await app.inject('/health')).statusCode).toBe(200)
  } finally {
    await app.close()
  }
})
