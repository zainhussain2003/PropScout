import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { renderProxyTrust } from './proxyTrust'

describe('Render ingress identity', () => {
  it('validates the two observed proxy addresses and their positions', () => {
    expect(renderProxyTrust('127.0.0.1', 0)).toBe(true)
    expect(renderProxyTrust('::1', 0)).toBe(true)
    expect(renderProxyTrust('::ffff:127.0.0.1', 0)).toBe(true)
    expect(renderProxyTrust('127.0.0.1', 1)).toBe(false)
    expect(renderProxyTrust('198.51.100.9', 0)).toBe(false)
    expect(renderProxyTrust('10.1.2.3', 0)).toBe(false)
    expect(renderProxyTrust('10.1.2.3', 1)).toBe(true)
    expect(renderProxyTrust('10.1.2.3', 2)).toBe(false)
    expect(renderProxyTrust('198.51.100.9', 1)).toBe(false)
  })

  it('ignores spoofed forwarding from untrusted peers and earlier chain entries', async () => {
    const app = Fastify({ trustProxy: renderProxyTrust })
    app.get('/identity', async (req) => ({ ip: req.ip }))
    const untrusted = await app.inject({
      url: '/identity',
      remoteAddress: '198.51.100.9',
      headers: { 'x-forwarded-for': '203.0.113.4' },
    })
    expect(untrusted.json()).toEqual({ ip: '198.51.100.9' })
    const proxied = await app.inject({
      url: '/identity',
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.4, 198.51.100.9, 10.1.2.3' },
    })
    expect(proxied.json()).toEqual({ ip: '198.51.100.9' })
    await app.close()
  })

  it('retains limits per forwarded visitor instead of sharing the proxy allowance', async () => {
    const app = Fastify({ trustProxy: renderProxyTrust })
    await app.register(rateLimit, { max: 2, timeWindow: '1 minute' })
    app.get('/report', async () => ({ ok: true }))
    const request = async (ip: string): Promise<{ statusCode: number }> =>
      app.inject({
        url: '/report',
        remoteAddress: '127.0.0.1',
        headers: { 'x-forwarded-for': `${ip}, 10.1.2.3` },
      })
    expect((await request('198.51.100.1')).statusCode).toBe(200)
    expect((await request('198.51.100.1')).statusCode).toBe(200)
    expect((await request('198.51.100.1')).statusCode).toBe(429)
    expect((await request('198.51.100.2')).statusCode).toBe(200)
    await app.close()
  })
})
