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

/**
 * Thrown when Stripe is not configured for this environment.
 *
 * Billing is deliberately dormant until the account is set up: the keys are
 * absent in local `.env` and in the Railway API service. Without this, an
 * unconfigured environment fails deep inside the Stripe SDK with an opaque error,
 * which reads like a broken product rather than a feature that is not switched on
 * yet. Callers turn this into a 503 with an honest message.
 *
 * See docs/ACCESS_SETUP.md §1 for what to create and where the values go.
 */
export class StripeNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Stripe is not configured — missing: ${missing.join(', ')}`)
    this.name = 'StripeNotConfiguredError'
  }
}

const PRICE_IDS: Record<'pro' | 'professional' | 'team', string> = {
  pro: process.env.STRIPE_PRICE_PRO ?? '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL ?? '',
  team: process.env.STRIPE_PRICE_TEAM ?? '',
}

/** Env vars that must be non-empty before any Stripe call can succeed. */
function missingConfig(tier?: 'pro' | 'professional' | 'team'): string[] {
  const missing: string[] = []
  if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY')
  if (tier && !PRICE_IDS[tier]) {
    missing.push(`STRIPE_PRICE_${tier.toUpperCase()}`)
  }
  return missing
}

/**
 * True when Stripe has enough configuration to attempt a call.
 * Lets routes and the frontend hide billing entirely rather than offering a
 * button that cannot work.
 */
export function isStripeConfigured(): boolean {
  return missingConfig().length === 0
}

/**
 * Lazily construct the Stripe client.
 *
 * Deliberately not constructed at module load: this module is imported by the
 * route tree at boot, and building a Stripe client with an empty key made the
 * failure surface at an unrelated moment. Constructing on first use keeps an
 * unconfigured environment booting cleanly.
 */
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  const missing = missingConfig()
  if (missing.length > 0) throw new StripeNotConfiguredError(missing)
  if (_stripe === null) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
  }
  return _stripe
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

  const session = await getStripe().checkout.sessions.create({
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
  const session = await getStripe().billingPortal.sessions.create({
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
  return getStripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
}
