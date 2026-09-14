/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../shared/Icon'
import { FREE_TIER } from '../../constants/tiers'
import { useAuth } from '../../hooks/useAuth'
import { startCheckout } from '../../lib/services/billingService'
import type { Tier } from '../../types/user'
import { SectionHeader } from './SectionHeader'

// ── PricingSection ────────────────────────────────────────────────────

/**
 * A pricing feature. `planned` marks what is sold but not built (audit J-03):
 * the row renders with a "planned" tag rather than a bare check mark, so the
 * page sells what exists and promises the rest honestly.
 */
interface PricingFeature {
  text: string
  planned?: boolean
}

/**
 * Where "Talk to us" goes. Unset until the owner chooses a channel; the card
 * then says so instead of rendering a button that does nothing.
 */
const CONTACT_EMAIL: string = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? ''

export function PricingSection({ onSignIn }: { onSignIn: () => void }): JSX.Element {
  const [yearly, setYearly] = useState(false)
  const { session } = useAuth()
  const navigate = useNavigate()
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutTier, setCheckoutTier] = useState<Tier | null>(null)

  // Free → the account (signed in) or sign-in. Paid → Stripe Checkout for
  // that tier (signed in) or sign-in first; the API's answer — today a 503
  // "paid plans are not open yet" until price IDs exist (D-076) — is shown,
  // not swallowed. These buttons had no handler at all (audit, paywall).
  const handleCta = (tier: Tier | 'free'): void => {
    setCheckoutError(null)
    if (!session) {
      onSignIn()
      return
    }
    if (tier === 'free') {
      navigate('/account')
      return
    }
    setCheckoutTier(tier)
    void startCheckout(tier, session.access_token)
      .catch((err: Error) => setCheckoutError(err.message))
      .finally(() => setCheckoutTier(null))
  }

  const tiers: Array<{
    name: string
    tier: Tier | 'free' | 'team'
    price: number
    priceSuffix?: string
    yearlyTotal?: number
    sub: string
    cta: string
    featured: boolean
    features: PricingFeature[]
  }> = [
    {
      name: 'Free',
      tier: 'free',
      price: 0,
      sub: 'For tenants and the merely curious.',
      cta: 'Start free',
      featured: false,
      features: [
        { text: `${FREE_TIER.MONTHLY_ANALYSIS_LIMIT} sale-listing reports / month` },
        { text: 'Unlimited tenant reports' },
        { text: 'Full rental comps, confidence shown' },
        { text: 'Verdict summary' },
        { text: 'Saved analyses in your account', planned: true },
      ],
    },
    {
      name: 'Investor Pro',
      tier: 'pro',
      price: yearly ? 100 / 12 : 10,
      yearlyTotal: 100,
      sub: 'For the investor running the numbers themselves.',
      cta: 'Go Pro',
      featured: true,
      features: [
        { text: 'Unlimited reports, all four modes' },
        { text: 'Full evidence-based verdicts' },
        { text: 'Financing sliders · OSFI, 35% down, conservative' },
        { text: 'SunScout with building obstruction' },
        { text: 'Portfolio tracker · up to 10 properties', planned: true },
        { text: 'Branded PDF export' },
      ],
    },
    {
      name: 'Professional',
      tier: 'professional',
      price: yearly ? 590 / 12 : 59,
      yearlyTotal: 590,
      sub: 'For agents and brokers reporting to clients.',
      cta: 'Start Professional',
      featured: false,
      features: [
        { text: 'Everything in Investor Pro' },
        { text: 'White-label PDF with your branding', planned: true },
        { text: 'Shareable client links' },
        { text: 'Bulk URL analysis', planned: true },
        { text: 'Priority comp data refresh', planned: true },
      ],
    },
    {
      name: 'Team / REIT',
      tier: 'team',
      price: 299,
      priceSuffix: '+',
      sub: 'For syndicates and small REITs.',
      cta: 'Talk to us',
      featured: false,
      features: [
        { text: 'Everything in Professional' },
        { text: '5–20+ multi-user seats', planned: true },
        { text: 'Read-only API access', planned: true },
        { text: 'Portfolio-level reporting', planned: true },
        { text: 'Custom onboarding', planned: true },
      ],
    },
  ]

  return (
    <section id="pricing" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div className="col gap-32">
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <SectionHeader
            tag="Pricing · CAD"
            title={<>Free for renters. Paid tiers for people running numbers.</>}
          >
            Cancel anytime. Annual saves two months. All prices in Canadian dollars, all tax
            inclusive.
          </SectionHeader>
          <div
            className="row gap-8"
            style={{
              padding: 4,
              borderRadius: 999,
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
            }}
          >
            {['Monthly', 'Yearly · 2mo free'].map((l, i) => (
              <button
                key={l}
                onClick={() => setYearly(i === 1)}
                className="mono"
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: 'none',
                  cursor: 'pointer',
                  background: (i === 1) === yearly ? 'var(--ink)' : 'transparent',
                  color: (i === 1) === yearly ? 'var(--bg)' : 'var(--muted)',
                  font: 'inherit',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div
          className="grid-1col-mobile"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            borderTop: '1px solid var(--line-strong)',
          }}
        >
          {tiers.map((t) => (
            <div
              key={t.name}
              className="col"
              style={{
                padding: '30px 26px 30px',
                background: t.featured ? 'var(--ink)' : 'transparent',
                color: t.featured ? 'var(--bg)' : 'var(--ink)',
                borderRight: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
                position: 'relative',
                gap: 18,
              }}
            >
              {t.featured && (
                <span
                  className="mono"
                  style={{
                    position: 'absolute',
                    top: -1,
                    left: 0,
                    right: 0,
                    background: 'var(--accent)',
                    color: 'var(--accent-ink)',
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    padding: '5px 10px',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                  }}
                >
                  Most chosen
                </span>
              )}
              <div className="col gap-8" style={{ marginTop: t.featured ? 14 : 0 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: t.featured
                      ? 'color-mix(in oklab, var(--bg) 55%, transparent)'
                      : 'var(--muted)',
                  }}
                >
                  {t.name}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: t.featured
                      ? 'color-mix(in oklab, var(--bg) 75%, transparent)'
                      : 'var(--ink-2)',
                  }}
                >
                  {t.sub}
                </p>
              </div>
              <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
                <span className="mono tabular" style={{ fontSize: 56, lineHeight: 1 }}>
                  ${Math.round(t.price)}
                  {'priceSuffix' in t ? (t.priceSuffix as string) : ''}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: t.featured
                      ? 'color-mix(in oklab, var(--bg) 50%, transparent)'
                      : 'var(--muted)',
                  }}
                >
                  {'priceSuffix' in t && t.priceSuffix === '+' ? '/ mo base' : '/ mo'}
                </span>
              </div>
              {'yearlyTotal' in t && t.yearlyTotal !== undefined && yearly && (
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: t.featured
                      ? 'color-mix(in oklab, var(--bg) 55%, transparent)'
                      : 'var(--muted)',
                    marginTop: -8,
                  }}
                >
                  ${t.yearlyTotal} billed yearly
                </div>
              )}
              {t.tier === 'team' ? (
                CONTACT_EMAIL ? (
                  <a
                    className="btn"
                    href={`mailto:${CONTACT_EMAIL}?subject=PropScout%20Team`}
                    style={{
                      background: 'var(--ink)',
                      color: 'var(--bg)',
                      width: '100%',
                      justifyContent: 'center',
                      padding: '14px',
                    }}
                  >
                    {t.cta}
                  </a>
                ) : (
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      padding: '14px 0',
                      textAlign: 'center',
                    }}
                  >
                    Contact channel not open yet
                  </div>
                )
              ) : (
                <button
                  className="btn"
                  onClick={() => handleCta(t.tier as Tier | 'free')}
                  disabled={checkoutTier === t.tier}
                  style={{
                    background: t.featured ? 'var(--accent)' : 'var(--ink)',
                    color: t.featured ? 'var(--accent-ink)' : 'var(--bg)',
                    width: '100%',
                    justifyContent: 'center',
                    padding: '14px',
                  }}
                >
                  {checkoutTier === t.tier ? 'Opening checkout…' : t.cta}
                </button>
              )}
              <div className="col gap-10" style={{ marginTop: 6 }}>
                {t.features.map((f) => (
                  <div
                    key={f.text}
                    className="row gap-8"
                    style={{
                      alignItems: 'flex-start',
                      fontSize: 13,
                      color: t.featured
                        ? 'color-mix(in oklab, var(--bg) 85%, transparent)'
                        : 'var(--ink-2)',
                    }}
                  >
                    <span
                      style={{ color: f.planned ? 'var(--muted)' : 'var(--accent)', marginTop: 2 }}
                    >
                      <Icon name={f.planned ? 'dot' : 'check'} size={14} stroke={2} />
                    </span>
                    <span>
                      {f.text}
                      {f.planned && (
                        <span
                          className="mono"
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            color: t.featured
                              ? 'color-mix(in oklab, var(--bg) 60%, transparent)'
                              : 'var(--muted)',
                          }}
                        >
                          planned
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {checkoutError !== null && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'color-mix(in oklab, var(--caution) 8%, transparent)',
              border: '1px solid color-mix(in oklab, var(--caution) 35%, transparent)',
              color: 'var(--ink)',
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            {checkoutError}
          </div>
        )}
      </div>
    </section>
  )
}
