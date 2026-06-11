/**
 * Billing routes — Stripe checkout and billing portal.
 *
 * POST /billing/checkout
 *   Requires: Authorization: Bearer <supabase_jwt>
 *   Body: { tier: 'pro' | 'professional' | 'team' }
 *   Returns: { url: string } — the Stripe Checkout URL to redirect to
 *
 * POST /billing/portal
 *   Requires: Authorization: Bearer <supabase_jwt>
 *   Returns: { url: string } — the Stripe Billing Portal URL to redirect to
 *
 * These routes create Stripe sessions server-side and return the redirect URL.
 * The frontend never talks to Stripe directly.
 */

import { type FastifyInstance } from 'fastify'
import { makeError } from '../types/api'
import { createCheckoutSession, createBillingPortalSession } from '../services/stripeService'
import { getUserById } from '../services/supabaseService'
import { getSupabase } from '../services/supabaseService'

interface BillingCheckoutBody {
  tier: 'pro' | 'professional' | 'team'
}

interface BillingCheckoutReply {
  url: string
}

async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /billing/checkout
  fastify.post<{ Body: BillingCheckoutBody; Reply: BillingCheckoutReply }>(
    '/checkout',
    async (req, reply) => {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send(makeError('UNAUTHORIZED', 'Authentication required') as never)
      }
      const token = authHeader.slice(7)

      const { data: authData, error: authError } = await getSupabase().auth.getUser(token)
      if (authError || !authData.user) {
        return reply
          .status(401)
          .send(makeError('UNAUTHORIZED', 'Invalid or expired session') as never)
      }

      const { tier } = req.body
      if (!['pro', 'professional', 'team'].includes(tier)) {
        return reply.status(400).send(makeError('INVALID_TIER', 'Invalid tier') as never)
      }

      const user = await getUserById(authData.user.id)

      let url: string
      try {
        url = await createCheckoutSession(
          authData.user.id,
          authData.user.email ?? '',
          tier,
          user?.stripe_customer_id
        )
      } catch (err) {
        fastify.log.error(err, 'createCheckoutSession failed')
        return reply
          .status(500)
          .send(
            makeError('CHECKOUT_FAILED', 'Could not start checkout — please try again') as never
          )
      }

      return reply.send({ url })
    }
  )

  // POST /billing/portal
  fastify.post<{ Reply: BillingCheckoutReply }>('/portal', async (req, reply) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send(makeError('UNAUTHORIZED', 'Authentication required') as never)
    }
    const token = authHeader.slice(7)

    const { data: authData, error: authError } = await getSupabase().auth.getUser(token)
    if (authError || !authData.user) {
      return reply
        .status(401)
        .send(makeError('UNAUTHORIZED', 'Invalid or expired session') as never)
    }

    const user = await getUserById(authData.user.id)
    if (!user?.stripe_customer_id) {
      return reply
        .status(400)
        .send(
          makeError(
            'NO_SUBSCRIPTION',
            'No active subscription found — upgrade to Pro first'
          ) as never
        )
    }

    let url: string
    try {
      url = await createBillingPortalSession(user.stripe_customer_id)
    } catch (err) {
      fastify.log.error(err, 'createBillingPortalSession failed')
      return reply
        .status(500)
        .send(
          makeError('PORTAL_FAILED', 'Could not open billing portal — please try again') as never
        )
    }

    return reply.send({ url })
  })
}

export default billingRoutes
