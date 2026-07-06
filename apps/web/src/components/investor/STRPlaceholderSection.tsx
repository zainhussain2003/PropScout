/**
 * STRPlaceholderSection — §10 of the investor report.
 *
 * Phase 2 placeholder for AirDNA short-term rental analysis.
 * Today: shows "Coming Phase 2" messaging with blurred mock numbers.
 * Also shows the STR legality status for the property's municipality — live now.
 */

import type { ListingData } from '../../types/analysis'
import { SectionHead } from '../shared/SectionHead'
import { VerdictPill } from '../shared/VerdictPill'
import { Icon } from '../shared/Icon'
import { Chip } from '../shared/Chip'

interface STRPlaceholderSectionProps {
  listing: ListingData
}

type STRRule = {
  rule: string
  tone: 'pass' | 'caution' | 'fail'
  explain: string
}

// Static Ontario STR legality snapshot — update as municipal rules change
const ONTARIO_STR_RULES: Record<string, STRRule> = {
  toronto: {
    rule: 'Principal-residence only',
    tone: 'fail',
    explain: 'Toronto requires operators to live in the unit being rented short-term.',
  },
  ottawa: {
    rule: 'Permitted · registration required',
    tone: 'caution',
    explain: 'Ottawa allows STRs with a registration fee and annual permit renewal.',
  },
  mississauga: {
    rule: 'Principal residence only',
    tone: 'fail',
    explain: 'Mississauga restricts short-term rentals to principal residences only.',
  },
  hamilton: {
    rule: 'Permitted',
    tone: 'pass',
    explain:
      'Hamilton currently allows short-term rentals in residential zones. Confirm at the OZ inquiry counter before listing.',
  },
  vaughan: {
    rule: 'Permitted with registration',
    tone: 'caution',
    explain:
      'Vaughan permits short-term rentals subject to operator registration and zoning checks.',
  },
  default: {
    rule: 'Check local zoning',
    tone: 'caution',
    explain:
      'STR regulations vary by municipality. Verify with the local planning department before listing.',
  },
}

const OTHER_CITIES: Array<{ city: string; rule: string; tone: 'pass' | 'caution' | 'fail' }> = [
  { city: 'Toronto', rule: 'Principal-residence only', tone: 'fail' },
  { city: 'Ottawa', rule: 'Permitted · registration', tone: 'caution' },
  { city: 'Mississauga', rule: 'Principal residence', tone: 'fail' },
  { city: 'Hamilton', rule: 'Permitted', tone: 'pass' },
]

function getMunicipalityKey(listing: ListingData): string {
  const lower = listing.addressLine2.toLowerCase()
  if (lower.includes('toronto') || listing.isToronto) return 'toronto'
  if (lower.includes('ottawa')) return 'ottawa'
  if (lower.includes('mississauga')) return 'mississauga'
  if (lower.includes('hamilton')) return 'hamilton'
  if (lower.includes('vaughan')) return 'vaughan'
  return 'default'
}

export function STRPlaceholderSection({ listing }: STRPlaceholderSectionProps): JSX.Element {
  const key = getMunicipalityKey(listing)
  const cityRule = ONTARIO_STR_RULES[key] ?? ONTARIO_STR_RULES.default
  const cityName = listing.addressLine2.split('·')[0].trim()

  const mockNumbers: Array<[string, string]> = [
    ['Nightly ADR', '$184'],
    ['Occupancy', '68%'],
    ['Net rev /mo', '$3,120'],
    ['STR – LTR', '+ $220'],
    ['Seasonality', '±18%'],
    ['Cleaning/turn', '$2,400/mo'],
  ]

  return (
    <section className="container tr-section" data-section="10">
      <SectionHead
        n="10"
        topic="STR vs LTR"
        question={
          <>
            Could you make <em>more</em> short-term?
          </>
        }
        verdict="Modeling · Phase 2"
        tone="caution"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* Coming-soon card */}
        <div
          className="card col"
          style={{ padding: 28, gap: 16, position: 'relative', overflow: 'hidden' }}
        >
          {/* Bottom fade overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, transparent 0%, transparent 30%, color-mix(in oklab, var(--surface) 96%, transparent) 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
            aria-hidden="true"
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Short-term rental analysis
            </span>
            <Chip>Coming Phase 2</Chip>
          </div>

          <h3 className="serif" style={{ fontSize: 24, position: 'relative', zIndex: 2 }}>
            AirDNA revenue modeling — shipping Q3 2026.
          </h3>

          <p
            style={{
              fontSize: 14,
              color: 'var(--ink-2)',
              lineHeight: 1.55,
              position: 'relative',
              zIndex: 2,
            }}
          >
            We're integrating AirDNA to project nightly rates, occupancy, seasonality, and net
            revenue for this exact unit against true STR comparables. Until then, the LTR baseline
            shown above is your reference.
          </p>

          {/* Mock numbers behind the blur */}
          <div
            className="grid-1col-mobile"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginTop: 4,
              filter: 'blur(2px)',
              opacity: 0.55,
              pointerEvents: 'none',
              position: 'relative',
              zIndex: 0,
            }}
            aria-hidden="true"
          >
            {mockNumbers.map(([label, value]) => (
              <div
                key={label}
                className="col"
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--line)',
                  gap: 4,
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  {label}
                </span>
                <span className="serif tabular" style={{ fontSize: 20, lineHeight: 1 }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <button
            className="btn btn-ghost"
            style={{ alignSelf: 'flex-start', marginTop: 4, position: 'relative', zIndex: 2 }}
          >
            Notify me when STR ships <Icon name="arrow" size={13} />
          </button>
        </div>

        {/* Legality card */}
        <div className="card col" style={{ padding: 28, gap: 18 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              STR legality · live
            </span>
            <VerdictPill tone={cityRule.tone} label={cityRule.rule} />
          </div>

          <h3 className="serif" style={{ fontSize: 22 }}>
            {cityName} rules
          </h3>

          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            {cityRule.explain}
          </p>

          <div style={{ height: 1, background: 'var(--line)' }} />

          <div className="col" style={{ gap: 8 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Other Ontario cities
            </div>
            {OTHER_CITIES.map((r, i) => (
              <div
                key={r.city}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: i < OTHER_CITIES.length - 1 ? '1px solid var(--line)' : 'none',
                  fontSize: 13,
                  alignItems: 'center',
                }}
              >
                <span style={{ color: 'var(--ink-2)' }}>{r.city}</span>
                <VerdictPill tone={r.tone} label={r.rule} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
