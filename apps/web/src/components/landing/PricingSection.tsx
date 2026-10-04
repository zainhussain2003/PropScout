import { Icon } from '../shared/Icon'
import { SectionHeader } from './SectionHeader'

/** Current public-beta offer. This lists only features that already exist. */
export function PricingSection(): JSX.Element {
  const features = [
    'Unlimited reports across all four available modes',
    'Full evidence-based verdicts and risk details',
    'Rental comparables and financing scenarios',
    'Available SunScout data and shareable report links',
    'Branded PDF export for live reports',
  ]

  return (
    <section id="pricing" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div className="col gap-32">
        <SectionHeader tag="Public beta" title={<>Every available report feature is free.</>}>
          Explore listings and tell us what helps. No subscription or credit card is needed during
          beta.
        </SectionHeader>
        <div className="card col" style={{ padding: '30px 26px', gap: 18, maxWidth: 700 }}>
          <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
            <strong className="serif" style={{ fontSize: 28 }}>
              Free during beta
            </strong>
            <span className="mono" style={{ color: 'var(--muted)' }}>
              All available features
            </span>
          </div>
          <div className="col gap-10">
            {features.map((feature) => (
              <div key={feature} className="row gap-8" style={{ alignItems: 'flex-start' }}>
                <Icon name="check" size={14} stroke={2} />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <a className="btn btn-primary" href="#hero" style={{ alignSelf: 'flex-start' }}>
            Analyze a listing <Icon name="arrow" size={14} />
          </a>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Saving reports to an account, portfolio tracking, and custom branding are still being
            built.
          </p>
        </div>
      </div>
    </section>
  )
}
