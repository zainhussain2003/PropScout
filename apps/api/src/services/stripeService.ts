/**
 * stripeService — Stripe subscription and billing portal.
 *
 * Exports:
 *   createCheckoutSession — start a subscription checkout flow
 *   createBillingPortalSession — open the Stripe billing portal
 *   constructWebhookEvent — verify + parse a Stripe webhook
 *
 * Price IDs are read from environment variables so they can differ between
 * staging and production without code changes.
 *
 * Tier → Price ID mapping (set in .env):
 *   STRIPE_PRICE_PRO           — Investor Pro $10/mo
 *   STRIPE_PRICE_PROFESSIONAL  — Professional $59/mo
 *   STRIPE_PRICE_TEAM          — Team $299/mo
 */

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_IDS: Record<'pro' | 'professional' | 'team', string> = {
  pro: process.env.STRIPE_PRICE_PRO ?? '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL ?? '',
  team: process.env.STRIPE_PRICE_TEAM ?? '',
}

/**
 * Create a Stripe Checkout session for a subscription tier.
 *
 * @param userId - Supabase user ID stored as client_reference_id for the webhook
 * @param email - pre-fill the customer email on the checkout page
 * @param tier - which subscription tier the user is upgrading to
 * @param stripeCustomerId - if the user already has a Stripe customer ID, reuse it
 * @returns the Stripe Checkout session URL to redirect the browser to
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  tier: 'pro' | 'professional' | 'team',
  stripeCustomerId?: string | null
): Promise<string> {
  const priceId = PRICE_IDS[tier]
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for tier: ${tier}`)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer: stripeCustomerId ?? undefined,
    customer_email: stripeCustomerId ? undefined : email,
    client_reference_id: userId,
    success_url: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/welcome-to-pro`,
    cancel_url: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/checkout/cancelled`,
    metadata: { userId, tier },
  })

  if (!session.url) {
    throw new Error('Stripe returned a session with no URL')
  }

  return session.url
}

/**
 * Create a Stripe Billing Portal session so the user can manage their subscription.
 *
 * @param stripeCustomerId - the user's Stripe customer ID (required)
 * @returns the billing portal URL to redirect the browser to
 */
export async function createBillingPortalSession(stripeCustomerId: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/account`,
  })
  return session.url
}

/**
 * Verify the Stripe-Signature header and parse the raw body into a typed event.
 * Always call this before processing any webhook payload.
 *
 * @throws if the signature is invalid or the secret is misconfigured
 */
export function constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
}

export { stripe }
