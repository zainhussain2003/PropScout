/**
 * Functionality tests for the billing routes.
 *
 * Covers:
 *   POST /billing/checkout
 *     - Returns 401 when no Authorization header is present
 *     - Returns 401 when JWT is invalid
 *     - Returns checkout URL on success
 *     - Returns 400 for an invalid tier value
 *   POST /billing/portal
 *     - Returns 401 when unauthenticated
 *     - Returns 400 when user has no stripe_customer_id
 *     - Returns portal URL on success
 */

jest.mock('../services/supabaseService', () => ({
  getSupabase: jest.fn(),
  getUserById: jest.fn(),
  upsertUser: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../services/stripeService', () => ({
  createCheckoutSession: jest.fn(),
  createBillingPortalSession: jest.fn(),
  // Real class, not a stub: billing.ts branches on `instanceof`, so a jest.fn()
  // here would make the dormant-billing path untestable.
  StripeNotConfiguredError: class StripeNotConfiguredError extends Error {
    constructor(missing: string[]) {
      super(`Stripe is not configured — missing: ${missing.join(', ')}`)
      this.name = 'StripeNotConfiguredError'
    }
  },
}))

import Fastify, { type FastifyInstance } from 'fastify'
import billingRoutes from './billing'
import { getSupabase, getUserById } from '../services/supabaseService'
import {
  StripeNotConfiguredError,
  createCheckoutSession,
  createBillingPortalSession,
} from '../services/stripeService'

const mockGetSupabase = getSupabase as jest.Mock
const mockGetUserById = getUserById as jest.Mock
const mockCreateCheckout = createCheckoutSession as jest.Mock
const mockCreatePortal = createBillingPortalSession as jest.Mock

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAuthMock(valid: boolean, userId = 'user-abc'): object {
  const user = valid ? { id: userId, email: 'test@example.com' } : null
  const error = valid ? null : { message: 'Invalid JWT' }
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error }),
    },
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let app: FastifyInstance

beforeEach(async () => {
  jest.clearAllMocks()
  app = Fastify({ logger: false })
  await app.register(billingRoutes)
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

// ── POST /checkout ─────────────────────────────────────────────────────────────

describe('POST /checkout', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/checkout',
      payload: { tier: 'pro' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when the JWT is invalid', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(false))
    const res = await app.inject({
      method: 'POST',
      url: '/checkout',
      headers: { authorization: 'Bearer bad-token' },
      payload: { tier: 'pro' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns checkout URL on success', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    mockGetUserById.mockResolvedValue({
      id: 'user-abc',
      email: 'test@example.com',
      tier: 'free',
      stripe_customer_id: null,
    })
    mockCreateCheckout.mockResolvedValue('https://checkout.stripe.com/pay/test')

    const res = await app.inject({
      method: 'POST',
      url: '/checkout',
      headers: { authorization: 'Bearer valid-token' },
      payload: { tier: 'pro' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { url: string }
    expect(body.url).toBe('https://checkout.stripe.com/pay/test')
    expect(mockCreateCheckout).toHaveBeenCalledWith('user-abc', 'test@example.com', 'pro', null)
  })

  it('returns 400 for an invalid tier value', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    const res = await app.inject({
      method: 'POST',
      url: '/checkout',
      headers: { authorization: 'Bearer valid-token' },
      payload: { tier: 'enterprise' },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ── POST /portal ───────────────────────────────────────────────────────────────

describe('POST /portal', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/portal',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when user has no stripe_customer_id', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    mockGetUserById.mockResolvedValue({
      id: 'user-abc',
      email: 'test@example.com',
      tier: 'free',
      stripe_customer_id: null,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/portal',
      headers: { authorization: 'Bearer valid-token' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns portal URL when user has a stripe_customer_id', async () => {
    mockGetSupabase.mockReturnValue(makeAuthMock(true))
    mockGetUserById.mockResolvedValue({
      id: 'user-abc',
      email: 'test@example.com',
      tier: 'pro',
      stripe_customer_id: 'cus_123',
    })
    mockCreatePortal.mockResolvedValue('https://billing.stripe.com/session/test')

    const res = await app.inject({
      method: 'POST',
      url: '/portal',
      headers: { authorization: 'Bearer valid-token' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { url: string }
    expect(body.url).toBe('https://billing.stripe.com/session/test')
    expect(mockCreatePortal).toHaveBeenCalledWith('cus_123')
  })

  // ── Billing dormant (Stripe not configured) ─────────────────────────────────

  describe('when Stripe is not configured', () => {
    it('returns 503 BILLING_UNAVAILABLE from /checkout, not a 500', async () => {
      mockGetSupabase.mockReturnValue(makeAuthMock(true))
      mockGetUserById.mockResolvedValue({ stripe_customer_id: null })
      mockCreateCheckout.mockRejectedValue(new StripeNotConfiguredError(['STRIPE_SECRET_KEY']))

      const res = await app.inject({
        method: 'POST',
        url: '/checkout',
        headers: { authorization: 'Bearer valid-token' },
        payload: { tier: 'pro' },
      })

      // Paid plans simply are not open yet — that is not a server fault, and a 500
      // would read as a broken product rather than a feature not switched on.
      expect(res.statusCode).toBe(503)
      const body = JSON.parse(res.body)
      expect(body.code).toBe('BILLING_UNAVAILABLE')
      expect(body.message).toMatch(/free tier still works/i)
    })

    it('still returns 500 for a genuine Stripe failure', async () => {
      mockGetSupabase.mockReturnValue(makeAuthMock(true))
      mockGetUserById.mockResolvedValue({ stripe_customer_id: null })
      mockCreateCheckout.mockRejectedValue(new Error('Stripe API is down'))

      const res = await app.inject({
        method: 'POST',
        url: '/checkout',
        headers: { authorization: 'Bearer valid-token' },
        payload: { tier: 'pro' },
      })

      expect(res.statusCode).toBe(500)
      expect(JSON.parse(res.body).code).toBe('CHECKOUT_FAILED')
    })
  })
})
