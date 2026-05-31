/**
 * LandlordVerdictHero — dark AI verdict card for the Landlord report.
 *
 * Full-bleed dark card with ScoutMark watermark. Headline calls out the
 * rent positioning gap and days on market. Body gives actionable drop
 * advice and daily vacancy cost. Source attribution row at the bottom.
 *
 * Design source: landlord-sections.jsx > LandlordVerdictHero
 */

import { useState, useEffect } from 'react'
import type { LandlordProperty, RentPositioning } from '../../types/landlord'
import type { ComputedInvestorMetrics } from '../../types/analysis'
import { ScoutMark } from '../shared/ScoutMark'
import { Icon } from '../shared/Icon'
import { fmtMoney, fmtPct } from '../../lib/investorCalc'

interface LandlordVerdictHeroProps {
  property: LandlordProperty
  askingRent: number
  positioning: RentPositioning
  metrics: ComputedInvestorMetrics
}

export function LandlordVerdictHero({
  property,
  askingRent,
  positioning,
  metrics,
}: LandlordVerdictHeroProps): JSX.Element {
  const dailyVacancyCost = Math.round(askingRent / 30)
  const [expanded, setExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)

  useEffect(() => {
    const handler = (): void => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <section className="container" style={{ marginTop: 24, marginBottom: 16 }}>
      <div
        style={{
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderRadius: 24,
          padding: 'clamp(36px, 4vw, 56px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ScoutMark watermark */}
        <div
          style={{
            position: 'absolute',
            right: -80,
            top: -40,
            opacity: 0.06,
            color: 'var(--accent)',
          }}
        >
          <ScoutMark size={520} color="var(--accent)" />
        </div>

        {/* Header row — label + model badge */}
        <div
          className="row gap-8"
          style={{
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 20,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            className="live-dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: 'var(--accent)',
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Scout AI · landlord verdict
          </span>
          <span style={{ flex: 1 }} />
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            claude · sonnet 4.6
          </span>
        </div>

        {/* Headline */}
        <div
          className="serif"
          style={
            {
              fontSize: 'clamp(26px, 3.4vw, 42px)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              color: 'var(--bg)',
              textWrap: 'balance',
              maxWidth: 920,
              position: 'relative',
              zIndex: 1,
            } as React.CSSProperties
          }
        >
          You're{' '}
          <span style={{ color: 'var(--accent)' }}>
            {fmtMoney(Math.abs(positioning.gap), { decimals: 0 })}
          </span>{' '}
          above the building median, and {property.ownership.daysOnMarket} days on market is telling
          you exactly what the tenants think of it.
        </div>

        {/* Body */}
        {(!isMobile || expanded) && (
          <div
            className="serif"
            style={{
              fontSize: 'clamp(17px, 1.7vw, 21px)',
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.78)',
              marginTop: 22,
              maxWidth: 880,
              position: 'relative',
              zIndex: 1,
            }}
          >
            Two comparable 1+1 units in your building rented inside 11 days at{' '}
            <span className="tabular">$3,050</span> and <span className="tabular">$3,100</span>.
            Dropping your ask to{' '}
            <span style={{ color: 'var(--accent)' }} className="tabular">
              $3,150
            </span>{' '}
            puts you at the top of the range and probably fills the unit inside two weeks. Holding
            at <span className="tabular">${askingRent.toLocaleString()}</span> costs you roughly{' '}
            <span style={{ color: 'var(--accent)' }} className="tabular">
              {fmtMoney(dailyVacancyCost, { decimals: 0 })}
            </span>{' '}
            in lost rent every day the unit sits empty.
          </div>
        )}

        {isMobile && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              marginTop: 12,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent)',
              fontFamily: "'Geist Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: 0,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {expanded ? 'Show less' : 'Read full verdict →'}
          </button>
        )}

        {/* Source attribution */}
        <div
          className="row gap-16"
          style={{
            marginTop: 28,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            position: 'relative',
            zIndex: 1,
            flexWrap: 'wrap',
          }}
        >
          <span className="row gap-6">
            <Icon name="check" size={12} />
            {property.compCount} building comps · last 60 days
          </span>
          <span className="row gap-6">
            <Icon name="check" size={12} />
            Drop the rent slider below to model alternatives
          </span>
          <span className="row gap-6">
            <Icon name="check" size={12} />
            Cap rate at current rent: {fmtPct(metrics.capRate)}
          </span>
        </div>
      </div>
    </section>
  )
}
