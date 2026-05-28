// Footer — shared across landing, reports, and legal pages.
// Dark background (--ink), four-column link grid, legal line, disclaimer.
// Uses Wordmark — never hardcode the brand name string here.

import { Wordmark } from './Wordmark'
import { Chip } from './Chip'

const FOOTER_COLS = [
  {
    heading: 'Product',
    items: [
      { label: 'Investment report', href: '#' },
      { label: 'Personal buyer report', href: '#' },
      { label: 'Tenant analysis', href: '#' },
      { label: 'Landlord report', href: '#' },
      { label: 'SunScout', href: '#' },
      { label: 'Portfolio tracker', href: '#' },
    ],
  },
  {
    heading: 'Company',
    items: [
      { label: 'About', href: '#' },
      { label: 'Methodology', href: '#' },
      { label: 'Data sources', href: '#' },
      { label: 'Press', href: '#' },
      { label: 'Careers', href: '#' },
    ],
  },
  {
    heading: 'Resources',
    items: [
      { label: 'Help centre', href: '#' },
      { label: 'Underwriting glossary', href: '#' },
      { label: 'Ontario LTT calculator', href: '#' },
      { label: 'OSFI stress test', href: '#' },
      { label: 'API (Team)', href: '#' },
    ],
  },
  {
    heading: 'Legal',
    items: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Disclaimer', href: '#' },
      { label: 'Brokerage info', href: '#' },
    ],
  },
] as const

export function Footer(): JSX.Element {
  return (
    <footer
      style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        padding: '80px 0 36px',
        marginTop: 80,
      }}
    >
      <div className="container col gap-32">
        {/* Grid: brand column + 4 link columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr repeat(4, 1fr)',
            gap: 40,
          }}
        >
          {/* Brand column */}
          <div className="col gap-16">
            <div style={{ color: 'var(--bg)' }}>
              <Wordmark height={26} />
            </div>
            <p
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 14,
                maxWidth: 280,
                lineHeight: 1.55,
              }}
            >
              Underwriting for Canadian real estate. Built in Toronto, opinionated about the
              numbers.
            </p>
            <div className="row gap-8">
              <Chip>Ontario · Live</Chip>
              <Chip>BC · Q3 2026</Chip>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.heading} className="col gap-12">
              <div
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {col.heading}
              </div>
              <div className="col gap-8">
                {col.items.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="divider" style={{ background: 'rgba(255,255,255,0.12)' }} />

        {/* Legal line */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span>© 2026 PropScout Analytics Inc. · propscout.ca</span>
          <span className="mono">v0.9 · MVP preview</span>
          <span>Not financial or legal advice. Always do your own due diligence.</span>
        </div>
      </div>
    </footer>
  )
}
