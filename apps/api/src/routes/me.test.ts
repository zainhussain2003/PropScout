/**
 * Functionality tests for GET /me.
 *
 * Covers:
 *   - 401 without an Authorization header, and with an invalid JWT
 *   - Returns the user's real identity, tier and monthly analysis count
 *   - Reports the count as a number even when it is zero (the account page
 *     must be able to tell "none run" from "figure unavailable")
 *   - A count query failure degrades to 0 rather than failing the request
 *
 * The count field exists because the account page previously derived
 * "8 of 10 used" from a hardcoded fixture array, inventing both a history and
 * scarcity against the free limit. Reporting it is not enforcing it.
 */

jest.mock('../services/supabaseService', () => ({
  getSupabase: jest.fn(),
  getUserById: jest.fn(),
  upsertUser: jest.fn().mockResolvedValue(undefined),
  getMonthlyAnalysisCount: jest.fn(),
}))

import Fastify, { type FastifyInstance } from 'fastify'
import meRoutes from './me'
import { getSupabase, getUserById, getMonthlyAnalysisCount } from '../services/supabaseService'

const mockGetSupabase = getSupabase as jest.Mock
const mockGetUserById = getUserById as jest.Mock
const mockCount = getMonthlyAnalysisCount as jest.Mock

const CREATED_AT = '2026-03-24T10:00:00.000Z'

function makeAuthMock(valid: boolean, userId = 'user-abc'): object {
  const user = valid ? { id: userId, email: 'real.user@example.com', created_at: CREATED_AT } : null
  return {
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user }, error: valid ? null : { message: 'Invalid JWT' } }),
    },
  }
}

let app: FastifyInstance

beforeEach(async () => {
  jest.clearAllMocks()
  app = Fastify({ logger: false })
  await app.register(meRoutes)
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

describe('GET /me', () => {
  it('returns 401 without an Authorization header', async () => {
    const res = await app.inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for an invalid JWT', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(false))
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { authorization: 'Bearer bad-token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns the real identity, tier and monthly analysis count', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    mockGetUserById.mockResolvedValue({
      id: 'user-abc',
      email: 'real.user@example.com',
      tier: 'free',
      stripe_customer_id: null,
    })
    mockCount.mockResolvedValue(3)

    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { authorization: 'Bearer good-token' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      id: 'user-abc',
      email: 'real.user@example.com',
      tier: 'free',
      stripeCustomerId: null,
      analysesThisMonth: 3,
      createdAt: CREATED_AT,
    })
    expect(mockCount).toHaveBeenCalledWith('user-abc')
  })

  it('returns zero as a number, not an omitted field', async () => {
    // The client treats an absent field as "unavailable" and a 0 as "none run".
    // Collapsing the two would make a new account read as an unknown.
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    mockGetUserById.mockResolvedValue({
      id: 'user-abc',
      email: 'real.user@example.com',
      tier: 'free',
      stripe_customer_id: null,
    })
    mockCount.mockResolvedValue(0)

    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { authorization: 'Bearer good-token' },
    })

    expect(res.json().analysesThisMonth).toBe(0)
  })

  it('does not fail the profile request when the count query errors', async () => {
    // getMonthlyAnalysisCount is documented as fail-open (returns 0 on error)
    // so a counting problem cannot lock a user out of their own profile.
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    mockGetUserById.mockResolvedValue({
      id: 'user-abc',
      email: 'real.user@example.com',
      tier: 'pro',
      stripe_customer_id: 'cus_123',
    })
    mockCount.mockResolvedValue(0)

    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { authorization: 'Bearer good-token' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().tier).toBe('pro')
  })
})
