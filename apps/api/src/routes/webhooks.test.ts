/**
 * Functionality tests for the Stripe webhook route.
 *
 * Covers:
 *   - Returns 400 when Stripe-Signature header is missing
 *   - Returns 400 when the signature is invalid
 *   - Returns 200 and activates subscription on checkout.session.completed
 *   - Returns 200 and updates status on customer.subscription.updated
 *   - Returns 200 and cancels subscription on customer.subscription.deleted
 *   - Returns 200 for unknown event types (no-op)
 */

jest.mock('../services/supabaseService', () => ({
  updateUserTier: jest.fn().mockResolvedValue(undefined),
  upsertSubscription: jest.fn().mockResolvedValue(undefined),
  updateSubscriptionStatus: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../services/stripeService', () => ({
  constructWebhookEvent: jest.fn(),
}))

import Fastify, { type FastifyInstance } from 'fastify'
import webhookRoutes from './webhooks'
import {
  updateUserTier,
  upsertSubscription,
  updateSubscriptionStatus,
} from '../services/supabaseService'
import { constructWebhookEvent } from '../services/stripeService'
import type Stripe from 'stripe'

const mockConstructEvent = constructWebhookEvent as jest.Mock
const mockUpdateUserTier = updateUserTier as jest.Mock
const mockUpsertSubscription = upsertSubscription as jest.Mock
const mockUpdateStatus = updateSubscriptionStatus as jest.Mock

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(type: string, data: object): Stripe.Event {
  return { type, data: { object: data } } as unknown as Stripe.Event
}

/** Inject a webhook request with proper content-type and optional signature. */
async function injectWebhook(
  app: FastifyInstance,
  signature: string | null,
  body = '{}'
): Promise<ReturnType<FastifyInstance['inject']>> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (signature) headers['stripe-signature'] = signature
  return app.inject({ method: 'POST', url: '/stripe', headers, payload: body })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let app: FastifyInstance

beforeEach(async () => {
  jest.clearAllMocks()
  app = Fastify({ logger: false })
  // Mirror the raw-body parser from app.ts so rawBody is populated
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    try {
      const parsed: unknown = JSON.parse((body as Buffer).toString())
      ;(_req as typeof _req & { rawBody?: Buffer }).rawBody = body as Buffer
      done(null, parsed)
    } catch (err) {
      done(err as Error, undefined)
    }
  })
  await app.register(webhookRoutes)
  await app.ready()
})

afterEach(async () => {
  await app.close()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /stripe webhook', () => {
  it('returns 400 when Stripe-Signature header is missing', async () => {
    const res = await injectWebhook(app, null)
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when the signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })
    const res = await injectWebhook(app, 'invalid-sig')
    expect(res.statusCode).toBe(400)
  })

  it('returns 200 and activates subscription on checkout.session.completed', async () => {
    const event = makeEvent('checkout.session.completed', {
      mode: 'subscription',
      client_reference_id: 'user-abc',
      customer: 'cus_123',
      subscription: 'sub_456',
      metadata: { userId: 'user-abc', tier: 'pro' },
    })
    mockConstructEvent.mockReturnValue(event)

    const res = await injectWebhook(app, 'valid-sig')

    expect(res.statusCode).toBe(200)
    expect(mockUpdateUserTier).toHaveBeenCalledWith('user-abc', 'pro', 'cus_123')
    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      'user-abc',
      'pro',
      'sub_456',
      'active',
      null
    )
  })

  it('returns 200 and updates status on customer.subscription.updated', async () => {
    const event = makeEvent('customer.subscription.updated', {
      id: 'sub_456',
      status: 'past_due',
      current_period_end: 1893456000,
    })
    mockConstructEvent.mockReturnValue(event)

    const res = await injectWebhook(app, 'valid-sig')

    expect(res.statusCode).toBe(200)
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'sub_456',
      'past_due',
      new Date(1893456000 * 1000)
    )
  })

  it('returns 200 and cancels subscription on customer.subscription.deleted', async () => {
    const event = makeEvent('customer.subscription.deleted', {
      id: 'sub_456',
      status: 'canceled',
      current_period_end: 1893456000,
    })
    mockConstructEvent.mockReturnValue(event)

    const res = await injectWebhook(app, 'valid-sig')

    expect(res.statusCode).toBe(200)
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'sub_456',
      'canceled',
      new Date(1893456000 * 1000)
    )
  })

  it('returns 200 for an unhandled event type', async () => {
    const event = makeEvent('payment_intent.created', { id: 'pi_123' })
    mockConstructEvent.mockReturnValue(event)

    const res = await injectWebhook(app, 'valid-sig')

    expect(res.statusCode).toBe(200)
    expect(mockUpdateUserTier).not.toHaveBeenCalled()
    expect(mockUpsertSubscription).not.toHaveBeenCalled()
  })
})
