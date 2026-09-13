/**
 * stripeService — configuration errors are configuration errors.
 *
 * On the first signed-in production run (2026-09-12) "Upgrade" returned 500
 * "Could not start checkout — please try again". The secret key was set, so
 * the route's 503 path did not fire; the price ID for the tier was not, and
 * that case threw a plain Error. Retrying a missing env var cannot help, so
 * it must be the same StripeNotConfiguredError the route already turns into
 * an honest "paid plans are not open yet".
 */

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  jest.resetModules()
})

async function loadService(
  env: Record<string, string | undefined>
): Promise<typeof import('./stripeService')> {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  jest.resetModules()
  return import('./stripeService')
}

describe('createCheckoutSession — missing configuration', () => {
  it('throws StripeNotConfiguredError naming the price ID when only the secret key is set', async () => {
    const svc = await loadService({
      STRIPE_SECRET_KEY: 'sk_test_placeholder',
      STRIPE_PRICE_PRO: undefined,
    })
    await expect(
      svc.createCheckoutSession('user-1', 'u@example.com', 'pro')
    ).rejects.toBeInstanceOf(svc.StripeNotConfiguredError)
    await expect(svc.createCheckoutSession('user-1', 'u@example.com', 'pro')).rejects.toThrow(
      /STRIPE_PRICE_PRO/
    )
  })

  it('reports the tier-specific price ID as missing in isStripeConfigured terms', async () => {
    const svc = await loadService({
      STRIPE_SECRET_KEY: 'sk_test_placeholder',
      STRIPE_PRICE_PRO: 'price_123',
      STRIPE_PRICE_TEAM: undefined,
    })
    await expect(svc.createCheckoutSession('user-1', 'u@example.com', 'team')).rejects.toThrow(
      /STRIPE_PRICE_TEAM/
    )
  })
})
