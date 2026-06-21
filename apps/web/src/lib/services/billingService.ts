/**
 * billingService — Stripe checkout and billing portal via the Fastify API.
 *
 * The frontend never calls Stripe directly. This service calls the Fastify
 * /billing routes which create Stripe sessions server-side and return URLs.
 *
 * Exports:
 *   startCheckout    — redirect to Stripe Checkout for a tier upgrade
 *   openBillingPortal — redirect to Stripe Billing Portal to manage subscription
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

export type Tier = 'pro' | 'professional' | 'team'

export class BillingError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'BillingError'
  }
}

/**
 * Start a Stripe Checkout session for the given tier.
 * Redirects the browser to the Stripe Checkout page on success.
 *
 * @param tier - which subscription to purchase
 * @param accessToken - Supabase session access_token from useAuth()
 */
export async function startCheckout(tier: Tier, accessToken: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/billing/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ tier }),
  })

  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { message?: string; code?: string }
    throw new BillingError(
      json.code ?? 'CHECKOUT_FAILED',
      json.message ?? 'Could not start checkout — please try again.'
    )
  }

  const { url } = (await response.json()) as { url: string }
  window.location.href = url
}

/**
 * Open the Stripe Billing Portal so the user can manage or cancel their subscription.
 * Redirects the browser to the portal on success.
 *
 * @param accessToken - Supabase session access_token from useAuth()
 */
export async function openBillingPortal(accessToken: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/billing/portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { message?: string; code?: string }
    throw new BillingError(
      json.code ?? 'PORTAL_FAILED',
      json.message ?? 'Could not open billing portal — please try again.'
    )
  }

  const { url } = (await response.json()) as { url: string }
  window.location.href = url
}
