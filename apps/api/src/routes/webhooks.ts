/**
 * Stripe webhook handler — POST /webhooks/stripe
 *
 * Security:
 *   - Every request is verified with stripe.webhooks.constructEvent() before
 *     any processing happens. Requests with an invalid signature are rejected
 *     with 400 and logged.
 *   - Raw body access is required for signature verification. Fastify must be
 *     configured with addContentTypeParser for 'application/json' to preserve
 *     the raw body. This is done in app.ts before route registration.
 *
 * Events handled:
 *   checkout.session.completed  — new subscription created
 *   customer.subscription.updated — tier change or renewal
 *   customer.subscription.deleted — cancellation / expiry
 */

import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify'
import type Stripe from 'stripe'
import { constructWebhookEvent } from '../services/stripeService'
import {
  updateUserTier,
  upsertSubscription,
  updateSubscriptionStatus,
} from '../services/supabaseService'

type RawBodyRequest = FastifyRequest & { rawBody?: Buffer }

const TIER_MAP: Record<string, 'pro' | 'professional' | 'team'> = {
  pro: 'pro',
  professional: 'professional',
  team: 'team',
}

async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/stripe', async (req: FastifyRequest, reply: FastifyReply) => {
    const rawReq = req as RawBodyRequest
    const signature = req.headers['stripe-signature']
    if (!signature || Array.isArray(signature)) {
      fastify.log.warn('Stripe webhook: missing or malformed Stripe-Signature header')
      return reply.status(400).send({ error: 'Missing Stripe-Signature' })
    }

    if (!rawReq.rawBody) {
      fastify.log.warn('Stripe webhook: rawBody not available')
      return reply.status(400).send({ error: 'Raw body unavailable' })
    }

    let event: Stripe.Event
    try {
      event = constructWebhookEvent(rawReq.rawBody, signature)
    } catch (err) {
      fastify.log.warn({ err }, 'Stripe webhook signature verification failed')
      return reply.status(400).send({ error: 'Invalid signature' })
    }

    try {
      await handleEvent(event, fastify)
    } catch (err) {
      fastify.log.error({ err, eventType: event.type }, 'Stripe webhook handler threw')
      // Return 200 anyway so Stripe doesn't retry — we've logged the failure
    }

    return reply.status(200).send({ received: true })
  })
}

async function handleEvent(event: Stripe.Event, fastify: FastifyInstance): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const userId = session.client_reference_id ?? session.metadata?.userId
      const tier = session.metadata?.tier as 'pro' | 'professional' | 'team' | undefined
      const stripeCustomerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id
      const stripeSubscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

      if (!userId || !tier || !TIER_MAP[tier] || !stripeSubscriptionId) {
        fastify.log.warn(
          { session: session.id },
          'checkout.session.completed: missing required metadata'
        )
        break
      }

      await updateUserTier(userId, TIER_MAP[tier], stripeCustomerId)
      await upsertSubscription(userId, TIER_MAP[tier], stripeSubscriptionId, 'active', null)
      fastify.log.info({ userId, tier }, 'Subscription activated')
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const status = sub.status
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

      await updateSubscriptionStatus(sub.id, status, periodEnd)
      fastify.log.info({ subId: sub.id, status }, 'Subscription updated')
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await updateSubscriptionStatus(
        sub.id,
        'canceled',
        sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
      )
      fastify.log.info({ subId: sub.id }, 'Subscription cancelled — user downgraded to free')
      break
    }

    default:
      // Ignore unhandled event types
      break
  }
}

export default webhookRoutes
