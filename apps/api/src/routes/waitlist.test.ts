/**
 * Functionality tests for POST /waitlist.
 *
 * Covers:
 *   - 400 when body is missing email or province
 *   - 400 when email is invalid format
 *   - 400 when province is blank
 *   - 200 on valid submission
 *   - Passes normalised email + province to addToWaitlist
 *   - Upsert errors are swallowed (non-fatal)
 */

jest.mock('../services/supabaseService', () => ({
  addToWaitlist: jest.fn().mockResolvedValue(undefined),
}))

import Fastify, { type FastifyInstance } from 'fastify'
import waitlistRoutes from './waitlist'
import { addToWaitlist } from '../services/supabaseService'

const mockAddToWaitlist = addToWaitlist as jest.Mock

// ── Setup ─────────────────────────────────────────────────────────────────────

let app: FastifyInstance

beforeEach(async () => {
  jest.clearAllMocks()
  app = Fastify({ logger: false })
  await app.register(waitlistRoutes)
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function post(body: unknown): Promise<{ status: number; json: unknown }> {
  const res = await app.inject({
    method: 'POST',
    url: '/',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify(body),
  })
  return { status: res.statusCode, json: res.json() as unknown }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /waitlist', () => {
  it('returns 400 when body is empty', async () => {
    const { status } = await post({})
    expect(status).toBe(400)
  })

  it('returns 400 when email is missing', async () => {
    const { status } = await post({ province: 'BC' })
    expect(status).toBe(400)
  })

  it('returns 400 when province is missing', async () => {
    const { status } = await post({ email: 'test@example.com' })
    expect(status).toBe(400)
  })

  it('returns 400 for an invalid email format', async () => {
    const { status, json } = await post({ email: 'not-an-email', province: 'BC' })
    expect(status).toBe(400)
    expect((json as { code: string }).code).toBe('INVALID_EMAIL')
  })

  it('returns 400 for a blank province', async () => {
    const { status, json } = await post({ email: 'test@example.com', province: '  ' })
    expect(status).toBe(400)
    expect((json as { code: string }).code).toBe('INVALID_PROVINCE')
  })

  it('returns 200 and calls addToWaitlist on valid input', async () => {
    const { status, json } = await post({ email: 'User@EXAMPLE.COM', province: 'bc' })
    expect(status).toBe(200)
    expect((json as { success: boolean }).success).toBe(true)
    expect(mockAddToWaitlist).toHaveBeenCalledWith('user@example.com', 'BC')
  })

  it('returns 200 even when addToWaitlist throws (non-fatal)', async () => {
    mockAddToWaitlist.mockRejectedValueOnce(new Error('DB unreachable'))
    const { status } = await post({ email: 'test@example.com', province: 'AB' })
    // Route catches the error and still returns 200 so the user sees the confirmation screen
    expect(status).toBe(200)
  })
})
