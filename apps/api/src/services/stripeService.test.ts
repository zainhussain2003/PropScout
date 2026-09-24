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
const mockRetrievePrice = jest.fn()
const mockCreateSession = jest.fn()
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    prices: { retrieve: mockRetrievePrice },
    checkout: { sessions: { create: mockCreateSession } },
  })),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockRetrievePrice.mockResolvedValue({
    active: true,
    currency: 'cad',
    unit_amount: 1000,
    recurring: { interval: 'month', interval_count: 1 },
  })
  mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/test' })
})

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
  it.each([
    { currency: 'usd' },
    { unit_amount: 5900 },
    { active: false },
    { recurring: { interval: 'year', interval_count: 1 } },
    { recurring: { interval: 'month', interval_count: 3 } },
    { recurring: null },
  ])('refuses a price that differs from the advertised plan: %j', async (override) => {
    const svc = await loadService({
      STRIPE_SECRET_KEY: 'sk_test_placeholder',
      STRIPE_PRICE_PRO: 'price_pro',
    })
    mockRetrievePrice.mockResolvedValue({
      active: true,
      currency: 'cad',
      unit_amount: 1000,
      recurring: { interval: 'month', interval_count: 1 },
      ...override,
    })
    await expect(svc.createCheckoutSession('u', 'u@example.test', 'pro')).rejects.toBeInstanceOf(
      svc.StripeNotConfiguredError
    )
    expect(mockCreateSession).not.toHaveBeenCalled()
  })

  it('creates the advertised monthly checkout with subscription ownership metadata', async () => {
    const svc = await loadService({
      STRIPE_SECRET_KEY: 'sk_test_placeholder',
      STRIPE_PRICE_PRO: 'price_pro',
    })
    await expect(svc.createCheckoutSession('u', 'u@example.test', 'pro')).resolves.toBe(
      'https://checkout.stripe.com/test'
    )
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_pro', quantity: 1 }],
        subscription_data: { metadata: { userId: 'u', tier: 'pro' } },
      })
    )
  })
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
