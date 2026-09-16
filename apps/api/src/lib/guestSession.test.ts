import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { ensureGuestId, readGuestId, guestLimitEnabled, GUEST_COOKIE } from './guestSession'

describe('guestSession (D-116)', () => {
  const ID = '123e4567-e89b-12d3-a456-426614174000'

  async function run(
    cookieHeader?: string
  ): Promise<{ body: { id: string; read: string | null }; setCookie: string }> {
    const app = Fastify()
    await app.register(cookie)
    app.get('/', async (req, reply) => {
      const read = readGuestId(req)
      const id = ensureGuestId(req, reply)
      return { id, read }
    })
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    })
    await app.close()
    return { body: res.json(), setCookie: String(res.headers['set-cookie'] ?? '') }
  }

  it('reads a well-formed cookie and issues nothing', async () => {
    const { body, setCookie } = await run(`${GUEST_COOKIE}=${ID.toUpperCase()}`)
    expect(body.read).toBe(ID)
    expect(body.id).toBe(ID)
    expect(setCookie).toBe('')
  })

  it('ignores a malformed cookie and issues a fresh HttpOnly id', async () => {
    const { body, setCookie } = await run(`${GUEST_COOKIE}=not-a-uuid`)
    expect(body.read).toBeNull()
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain('Max-Age=31536000')
  })

  it('the wall is off unless GUEST_ANALYSIS_LIMIT_ENABLED is exactly "true"', () => {
    delete process.env.GUEST_ANALYSIS_LIMIT_ENABLED
    expect(guestLimitEnabled()).toBe(false)
    process.env.GUEST_ANALYSIS_LIMIT_ENABLED = '1'
    expect(guestLimitEnabled()).toBe(false)
    process.env.GUEST_ANALYSIS_LIMIT_ENABLED = 'true'
    expect(guestLimitEnabled()).toBe(true)
    delete process.env.GUEST_ANALYSIS_LIMIT_ENABLED
  })
})
