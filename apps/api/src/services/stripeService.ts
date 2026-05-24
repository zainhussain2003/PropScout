import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * Create a Stripe Checkout session for a Pro subscription.
 */
export async function createCheckoutSession(
  _userId: string,
  _email: string,
  _tier: 'pro' | 'professional' | 'team'
): Promise<string> {
  // TODO: implement — returns checkout URL
  throw new Error('createCheckoutSession: not yet implemented')
}

/**
 * Verify a Stripe webhook signature.
 * Always call this before processing any webhook event.
 */
export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

export { stripe }
