/**
 * PersonalBuyerPage — Report B (personal-use purchase).
 *
 * Route: /personal-report
 * Demo data: 248 Mountcrest Avenue, Burlington (PB_PROPERTY / PB_SCHOOLS / etc.)
 *
 * Sections:
 *   PropertyHero        — photo grid + home score gauge + asking / true monthly cost
 *   VerdictHero         — dark AI verdict card
 *   §01  True monthly cost       → PBTrueCostSection
 *   §02  Fair market value       → PBFMVSection
 *   §03  Comparable sales        → PBSalesSection
 *   §04  Schools                 → SchoolColumn × 3
 *   §05  Neighbourhood           → walk/transit/bike scores + distances + stats
 *   §06  SunScout                → Phase 2 placeholder
 *   §07  Risks & conditions      → RiskRow list
 *   §08  Comps map               → MiniMap
 *   §09  Before-you-bid checklist → static checklist
 *   Conversion                   → "what if you rented it out?" + agent CTA
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { LockedButton } from '../components/paywall/LockedButton'
import { TruncatedVerdict } from '../components/paywall/TruncatedVerdict'
import { usePaywall } from '../components/paywall/PaywallContext'
import { usePdfExport } from '../hooks/usePdfExport'
import { SignInModal } from '../components/shared/SignInModal'
import {
  PB_PROPERTY,
  PB_SCHOOLS,
  PB_COMPS,
  PB_NEIGHBOURHOOD,
  computeMonthlyCost,
  computeHomeScore,
} from '../data/personalBuyerData'
import {
  shimToPersonalProperty,
  shimToPersonalNeighbourhood,
  shimToPersonalSchools,
} from '../lib/reportShims'
import { Nav } from '../components/shared/Nav'
import { Footer } from '../components/shared/Footer'
import { StickyActionBar } from '../components/shared/StickyActionBar'
import { SectionHead } from '../components/shared/SectionHead'
import { Icon } from '../components/shared/Icon'
import { Chip } from '../components/shared/Chip'
import { ScoutMark } from '../components/shared/ScoutMark'
import { DealScore } from '../components/analysis/DealScore'
import { RiskRow } from '../components/analysis/RiskRow'
import { PBTrueCostSection } from '../components/personal/PBTrueCostSection'
import { PBFMVSection } from '../components/personal/PBFMVSection'
import { SunScoutPanel } from '../components/sunscout/SunScoutPanel'
import { PBSalesSection } from '../components/personal/PBSalesSection'
import { SchoolColumn } from '../components/personal/SchoolColumn'
import { fmtMoney, fmtPct } from '../lib/investorCalc'
import type {
  HomeScore,
  PersonalMonthlyCost,
  PersonalProperty,
  PersonalNeighbourhood,
  PersonalSchools,
} from '../types/personal'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'

// ── Static light score (Phase 2 will compute this from sun-path data) ─────────
const STATIC_LIGHT_SCORE = 76

// ── Empty schools — used when isReal to give 0 pts without fixture data ────────
const EMPTY_SCHOOLS: PersonalSchools = { elementary: [], middle: [], high: [] }

// ── RealPhoto — img with fallback to placeholder on CDN hotlink block ──────────

interface RealPhotoProps {
  url: string
  style: React.CSSProperties
  extra?: string
}

function RealPhoto({ url, style, extra }: RealPhotoProps): JSX.Element {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <div className="photo-ph" style={style} />
  }

  return (
    <div style={{ ...style, position: 'relative', overflow: 'hidden', background: 'var(--line)' }}>
      <img
        src={url}
        alt=""
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      {extra && (
        <div
          className="mono"
          style={{
            position: 'absolute',
            right: 10,
            bottom: 10,
            fontSize: 10,
            letterSpacing: '0.1em',
            padding: '3px 8px',
            background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
            borderRadius: 999,
            color: 'var(--ink)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {extra}
        </div>
      )}
    </div>
  )
}

// ── Personal property hero ────────────────────────────────────────────────────

interface PersonalHeroProps {
  property: PersonalProperty
  score: HomeScore
  monthly: PersonalMonthlyCost
  photoUrls?: string[]
  /** When true, the numeric Home score is hidden (inputs mostly placeholder). */
  scoreSuppressed?: boolean
}

function PersonalPropertyHero({
  property,
  score,
  monthly,
  photoUrls,
  scoreSuppressed = false,
}: PersonalHeroProps): JSX.Element {
  const verdictColor =
    score.verdict.tone === 'pass'
      ? 'var(--pass)'
      : score.verdict.tone === 'caution'
        ? 'var(--caution)'
        : 'var(--fail)'

  return (
    <section className="container" style={{ paddingTop: 56, paddingBottom: 48 }}>
      {/* Breadcrumb strip */}
      <div className="row gap-12" style={{ marginBottom: 28, color: 'var(--muted)', fontSize: 13 }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>
            <Icon name="arrow" size={13} />
          </span>
          Analyze another listing
        </a>
        <span style={{ opacity: 0.4 }}>·</span>
        <span
          className="mono"
          style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}
        >
          Report · Personal view
        </span>
        {property.daysOnMarket > 0 && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                className="live-dot"
                style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }}
              />
              Listed {property.daysOnMarket} days ago
            </span>
          </>
        )}
      </div>

      <div
        className="grid-1col-mobile hero-score-first"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 'clamp(28px, 3.5vw, 52px)',
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT — photos + chips + address + meta */}
        <div className="col" style={{ gap: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>
            {photoUrls && photoUrls.length > 0 ? (
              <>
                {/* Realtor.ca CDN may block hotlink requests from localhost.
                    onError falls back to placeholder silently. */}
                <RealPhoto url={photoUrls[0]} style={{ borderRadius: 18, height: '100%' }} />
                <div className="col" style={{ gap: 8 }}>
                  {[1, 2, 3].map((i) =>
                    photoUrls[i] ? (
                      <RealPhoto
                        key={i}
                        url={photoUrls[i]}
                        style={{ borderRadius: 14, flex: 1 }}
                        extra={
                          i === 3 && photoUrls.length > 4
                            ? `+ ${photoUrls.length - 4} more`
                            : undefined
                        }
                      />
                    ) : (
                      <div key={i} className="photo-ph" style={{ borderRadius: 14, flex: 1 }} />
                    )
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="photo-ph" style={{ borderRadius: 18, height: '100%' }}>
                  <span>front · curb view</span>
                </div>
                <div className="col" style={{ gap: 8 }}>
                  <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}>
                    <span>living room</span>
                  </div>
                  <div className="photo-ph" style={{ borderRadius: 14, flex: 1 }}>
                    <span>kitchen</span>
                  </div>
                  <div
                    className="photo-ph"
                    style={{ borderRadius: 14, flex: 1, position: 'relative' }}
                  >
                    <span>backyard</span>
                    <div
                      className="mono"
                      style={{
                        position: 'absolute',
                        right: 10,
                        bottom: 10,
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        padding: '3px 8px',
                        background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
                        borderRadius: 999,
                        color: 'var(--ink)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      + 28 more
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="col" style={{ gap: 18 }}>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {property.chips.map((c, i) => (
                <Chip key={i}>{c}</Chip>
              ))}
            </div>
            <h1
              className="serif"
              style={
                {
                  textWrap: 'balance',
                  letterSpacing: '-0.035em',
                  marginTop: 4,
                } as React.CSSProperties
              }
            >
              {property.addressLine1}
            </h1>
            <div style={{ fontSize: 16, color: 'var(--muted)' }}>{property.addressLine2}</div>

            <div
              className="row gap-20"
              style={{ flexWrap: 'wrap', marginTop: 8, fontSize: 14, color: 'var(--ink-2)' }}
            >
              <span className="row gap-8">
                <Icon name="house" size={14} />
                {property.beds} bed · {property.baths} bath
              </span>
              <span className="row gap-8">
                <Icon name="dot" size={10} />
                {property.sqft.toLocaleString()} sqft
              </span>
              <span className="row gap-8">
                <Icon name="key" size={14} />
                {property.parking}
              </span>
              {property.yearBuilt > 0 && (
                <span className="row gap-8">
                  <Icon name="chart" size={14} />
                  Built {property.yearBuilt}
                </span>
              )}
              <span className="row gap-8">
                <Icon name="dot" size={10} />
                {property.lotSize}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — sticky home-score card */}
        <div className="card col" style={{ padding: 32, gap: 24, position: 'sticky', top: 84 }}>
          {scoreSuppressed ? (
            // Inputs are mostly placeholder (FMV pinned to asking, schools/light
            // pending) — an aggregate number would imply confidence we don't have.
            // Explain the absence so it reads as honesty, not a missing widget.
            <div
              className="col"
              style={{
                alignItems: 'center',
                textAlign: 'center',
                gap: 8,
                padding: '8px 4px',
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Overall score paused
              </div>
              <div className="serif" style={{ fontSize: 19, lineHeight: 1.25 }}>
                Pricing &amp; schools data pending
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 280 }}>
                We don&apos;t yet have comparable-sales or school data for this address, so a single
                home score would overstate what we know. The sections below show what we can verify
                — cost, location, and risk flags.
              </p>
            </div>
          ) : (
            <>
              <div className="col" style={{ alignItems: 'center', gap: 8 }}>
                <DealScore
                  score={score.total}
                  max={100}
                  size="lg"
                  label="Home score / 100"
                  showVerdict
                  animate
                />
              </div>

              <div className="col" style={{ textAlign: 'center', alignItems: 'center', gap: 8 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: verdictColor,
                  }}
                >
                  {score.verdict.label}
                </div>
                <div
                  className="serif"
                  style={
                    { fontSize: 20, lineHeight: 1.2, textWrap: 'balance' } as React.CSSProperties
                  }
                >
                  {score.verdict.tagline}
                </div>
              </div>
            </>
          )}

          <div className="divider" />

          {/* Asking + true monthly cost */}
          <div className="col" style={{ gap: 12 }}>
            <div
              className="row"
              style={{ justifyContent: 'space-between', alignItems: 'baseline' }}
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
                Asking
              </span>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>
                {fmtMoney(property.price)}
              </span>
            </div>
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '12px 14px',
                borderRadius: 12,
                background: 'color-mix(in oklab, var(--accent) 6%, transparent)',
                border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}
              >
                True monthly cost
              </span>
              <span
                className="serif tabular"
                style={{ fontSize: 24, lineHeight: 1, color: 'var(--accent)' }}
              >
                {fmtMoney(monthly.total)}
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>/mo</span>
              </span>
            </div>
          </div>

          <div className="divider" />

          {/* Score breakdown bars */}
          <div className="col" style={{ gap: 10 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Score breakdown
            </div>
            {(
              [
                ['Pricing vs FMV', score.components.pricing, 25],
                ['Schools', score.components.schoolPts, 20],
                ['Light', score.components.lightPts, 15],
                ['Walk + transit', score.components.walkPts, 15],
                ['Lot value-add', score.components.lotPts, 15],
                ['Risk', score.components.riskPts, 10],
              ] as [string, number, number][]
            ).map(([lbl, v, max]) => (
              <div key={lbl} className="col" style={{ gap: 4 }}>
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--ink-2)' }}>{lbl}</span>
                  <span className="mono tabular" style={{ color: 'var(--muted)' }}>
                    {v} / {max}
                  </span>
                </div>
                <div
                  style={{
                    height: 3,
                    borderRadius: 999,
                    background: 'var(--line)',
                  }}
                >
                  <div
                    style={{
                      width: `${(v / max) * 100}%`,
                      height: '100%',
                      borderRadius: 999,
                      background:
                        v / max > 0.65
                          ? 'var(--pass)'
                          : v / max > 0.35
                            ? 'var(--caution)'
                            : 'var(--fail)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── AI Verdict Hero ────────────────────────────────────────────────────────────

interface PersonalVerdictHeroProps {
  monthly: PersonalMonthlyCost
  /** Real AI narrative — when provided replaces the demo verdict text. */
  narrative?: string | null
  /** Live report — provenance strip must only claim sources we have. */
  isReal?: boolean
}

const PB_FIRST_PARA =
  'This is fairly priced for what it is — and the school catchment alone is reason enough to consider it seriously.'

function PersonalVerdictHero({
  monthly,
  narrative,
  isReal = false,
}: PersonalVerdictHeroProps): JSX.Element {
  const { tier, openUpgradeModal } = usePaywall()
  const property = PB_PROPERTY
  const extraCost = Math.round(monthly.total - monthly.mortgage)
  const [expanded, setExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)

  useEffect(() => {
    const handler = (): void => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (tier === 'free') {
    return (
      <section className="container" style={{ marginTop: 24, marginBottom: 16 }}>
        <TruncatedVerdict
          firstParagraph={narrative ? narrative.split('. ')[0] + '.' : PB_FIRST_PARA}
          eyebrow="Scout AI · home buyer verdict"
          onUnlock={() => openUpgradeModal('verdict')}
        />
      </section>
    )
  }

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

        <div
          className="row gap-8"
          style={{
            color: 'color-mix(in oklab, var(--bg) 55%, transparent)',
            marginBottom: 20,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            className="live-dot"
            style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent)' }}
          />
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Scout AI · home buyer verdict
          </span>
          <span style={{ flex: 1 }} />
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'color-mix(in oklab, var(--bg) 40%, transparent)',
            }}
          >
            claude · sonnet 4.6
          </span>
        </div>

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
          {narrative ? (
            narrative.split('. ')[0] + '.'
          ) : isReal ? (
            // Live report whose narrative failed — never show fixture prose
            // about a different property (copy-honesty rule).
            <>
              The verdict couldn&apos;t be generated for this report — the numbers below still
              stand.
            </>
          ) : (
            <>
              This is <span style={{ color: 'var(--accent)' }}>fairly priced</span> for what it is —
              and the school catchment alone is reason enough to consider it seriously.
            </>
          )}
        </div>

        {(!isMobile || expanded) && (
          <div
            className="serif"
            style={{
              fontSize: 'clamp(17px, 1.7vw, 21px)',
              lineHeight: 1.5,
              color: 'color-mix(in oklab, var(--bg) 78%, transparent)',
              marginTop: 22,
              maxWidth: 880,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {isReal ? (
              // Live: the narrative remainder — never the Burlington fixture
              // prose ("At $875,000… Tom Thomson catchment") on a real address.
              (narrative?.split('. ').slice(1).join('. ') ?? '')
            ) : (
              <>
                At <span className="tabular">${property.price.toLocaleString()}</span> the asking is
                sitting almost exactly at the local median for a 3-bed semi on this lot size. Your
                true monthly carry comes to{' '}
                <span className="tabular" style={{ color: 'var(--accent)' }}>
                  {fmtMoney(monthly.total)}
                </span>{' '}
                — about <span className="tabular">${extraCost.toLocaleString()}</span> more than the
                mortgage payment alone. The Tom Thomson catchment is the upside; the 1972 build and
                a Walk Score of 64 are the trade-offs to consider.
              </>
            )}
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

        <div
          className="row gap-16"
          style={{
            marginTop: 28,
            color: 'color-mix(in oklab, var(--bg) 50%, transparent)',
            fontSize: 12,
            position: 'relative',
            zIndex: 1,
            flexWrap: 'wrap',
          }}
        >
          {isReal ? (
            <>
              {/* Copy-honesty: only claim sources we actually have. */}
              <span className="row gap-6">
                <Icon name="flag" size={12} />
                Comparable sales · no source yet (value estimated)
              </span>
              <span className="row gap-6">
                <Icon name="flag" size={12} />
                School data · pending dataset load
              </span>
              <span className="row gap-6">
                <Icon name="check" size={12} />
                Walk/Transit via Walk Score
              </span>
            </>
          ) : (
            <>
              <span className="row gap-6">
                <Icon name="check" size={12} />
                {PB_COMPS.length} verified comparable sales · last 6 months
              </span>
              <span className="row gap-6">
                <Icon name="check" size={12} />
                School data · EQAO 2024 + Fraser 2025
              </span>
              <span className="row gap-6">
                <Icon name="check" size={12} />
                Walk/Transit/Bike via Walk Score
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// ── §04 Schools section ───────────────────────────────────────────────────────

interface SchoolsSectionProps {
  isReal: boolean
  /** Real schools from the schools table — null until the CSV is loaded. */
  realSchools?: PersonalSchools | null
  /** Honesty disclaimer from the API (catchment is never verified). */
  catchmentNote?: string | null
}

function SchoolsSection({ isReal, realSchools, catchmentNote }: SchoolsSectionProps): JSX.Element {
  // Real analyses only ever show real rows — fixture schools on a real
  // address would be a fabrication. Demo route keeps the design fixture.
  const schools = isReal ? realSchools : PB_SCHOOLS
  const hasData = schools != null

  const allSchools = hasData ? [...schools.elementary, ...schools.middle, ...schools.high] : []
  const topRanked = [...allSchools]
    .filter((s) => (isReal ? s.eqao > 0 : s.inCatchment))
    .sort((a, b) => b.eqao - a.eqao)[0]

  const verdictLabel = !hasData
    ? 'Data pending'
    : topRanked
      ? `${topRanked.name.split(' ').slice(0, 2).join(' ')} · EQAO ${topRanked.eqao.toFixed(1)}`
      : `${allSchools.length} nearby`

  return (
    <section className="container tr-section">
      <SectionHead
        n="04"
        topic="Schools"
        question={
          <>
            Where will the <em>kids</em> go?
          </>
        }
        verdict={verdictLabel}
        tone={hasData ? 'pass' : 'caution'}
      />

      {!hasData ? (
        <div className="card col" style={{ padding: 32, gap: 10 }}>
          <div className="serif" style={{ fontSize: 20 }}>
            School data pending
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 560, lineHeight: 1.55 }}>
            The EQAO / Fraser Institute dataset hasn&apos;t been loaded yet. Once it is, this
            section shows the nearest elementary, middle, and high schools with their scores — a
            real address never shows placeholder schools.
          </p>
        </div>
      ) : (
        <>
          <div
            className="grid-1col-mobile"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}
          >
            <SchoolColumn label="Elementary" schools={schools.elementary} />
            <SchoolColumn label="Middle" schools={schools.middle} />
            <SchoolColumn label="High school" schools={schools.high} />
          </div>

          <p
            style={{
              marginTop: 24,
              fontSize: 13,
              color: 'var(--muted)',
              maxWidth: 720,
            }}
          >
            {isReal ? (
              <>
                EQAO scores (out of 10) are from the Ontario Education Quality and Accountability
                Office; Fraser percentile from the Fraser Institute school report card.{' '}
                {catchmentNote ??
                  'Nearest schools by straight-line distance — attendance boundaries are not verified.'}
              </>
            ) : (
              <>
                EQAO scores (out of 10) are 2024 results from the Ontario Education Quality and
                Accountability Office. Fraser percentile is from the Fraser Institute&apos;s 2025
                school report card. Catchment boundaries pulled live from board GIS data.{' '}
                <span style={{ color: 'var(--accent)' }}>Highlighted</span> = this property is
                inside the school&apos;s attendance boundary.
              </>
            )}
          </p>
        </>
      )}
    </section>
  )
}

// ── §05 Neighbourhood section ─────────────────────────────────────────────────

interface NeighbourhoodSectionProps {
  neigh: PersonalNeighbourhood
}

function NeighbourhoodSection({ neigh }: NeighbourhoodSectionProps): JSX.Element {
  const mobilityItems = [
    { label: 'Walk Score', val: neigh.walkScore, sub: neigh.walkSub },
    { label: 'Transit Score', val: neigh.transitScore, sub: neigh.transitSub },
    { label: 'Bike Score', val: neigh.bikeScore, sub: neigh.bikeSub },
  ] as const

  return (
    <section className="container tr-section">
      <SectionHead
        n="05"
        topic="Neighbourhood"
        question={
          <>
            What's it like to <em>live</em> here?
          </>
        }
        verdict={
          neigh.walkSub
            ? `${neigh.walkSub} · Transit ${neigh.transitScore}`
            : 'Quiet · GO-connected'
        }
        tone={neigh.walkScore >= 70 ? 'pass' : 'caution'}
      />

      <div
        className="grid-1col-mobile"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
      >
        {/* Mobility scores */}
        <div className="card col" style={{ padding: 28, gap: 22 }}>
          <div
            className="row"
            style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Mobility scores
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              via Walk Score · Mapbox
            </span>
          </div>

          {mobilityItems.map((s) => {
            const tone = s.val >= 70 ? 'pass' : 'caution'
            const color = tone === 'pass' ? 'var(--pass)' : 'var(--caution)'
            return (
              <div key={s.label} className="col gap-8">
                <div
                  className="row"
                  style={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                >
                  <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
                    {s.label}
                  </span>
                  <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1, color }}>
                    {s.val}
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>/100</span>
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: 'var(--line)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${s.val}%`,
                      height: '100%',
                      background: color,
                      borderRadius: 999,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.sub}</span>
              </div>
            )
          })}
        </div>

        {/* Distances */}
        <div className="card col gap-16" style={{ padding: 28 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            From this address
          </div>
          {neigh.distances.length === 0 && (
            <p
              className="mono"
              style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em' }}
            >
              Distance data · available in Phase 2
            </p>
          )}
          {neigh.distances.map((d, i, arr) => (
            <div
              key={d.k}
              className="row"
              style={{
                justifyContent: 'space-between',
                padding: '13px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                fontSize: 13,
                gap: 12,
              }}
            >
              <span style={{ color: 'var(--ink-2)' }}>{d.k}</span>
              <span
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <span
                  className="mono tabular"
                  style={{
                    color: d.tone === 'pass' ? 'var(--ink)' : 'var(--caution)',
                    fontWeight: 500,
                    fontSize: 13,
                  }}
                >
                  {d.v}
                </span>
                {d.unit && <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {d.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Demographic + appreciation strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          marginTop: 16,
        }}
      >
        {(
          [
            [
              'Median household income',
              neigh.avgIncome > 0 ? fmtMoney(neigh.avgIncome) : '—',
              'StatsCan 2021',
            ],
            [
              '5-year population growth',
              neigh.popGrowth5y !== 0 ? fmtPct(neigh.popGrowth5y, 1) : '—',
              'StatsCan',
            ],
            [
              'Price per sqft trend',
              neigh.ppsqftTrend !== 'N/A' ? neigh.ppsqftTrend : '—',
              'last 12 months',
            ],
            [
              '5-year price appreciation',
              neigh.appreciation5y !== 0 ? '+' + fmtPct(neigh.appreciation5y, 1) : '—',
              'Teranet HPI',
            ],
          ] as [string, string, string][]
        ).map(([k, v, sub]) => (
          <div key={k} className="card col" style={{ padding: '18px 22px', gap: 4 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              {k}
            </span>
            <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1 }}>
              {v}
            </span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {sub}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── §06 SunScout fixture (shown for demo listings only) ───────────────────────

function SunScoutSection(): JSX.Element {
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const
  const hours = [54, 72, 102, 132, 162, 178, 184, 162, 124, 92, 60, 48]
  const max = Math.max(...hours)

  return (
    <section className="container tr-section">
      <SectionHead
        n="06"
        topic="SunScout"
        question={
          <>
            Which rooms will the <em>light</em> reach?
          </>
        }
        verdict="Good · 76/100"
        tone="pass"
      />

      <div
        className="grid-1col-mobile"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}
      >
        {/* Light score gauge */}
        <div
          className="card col"
          style={{ padding: 28, alignItems: 'center', textAlign: 'center', gap: 16 }}
        >
          <DealScore score={STATIC_LIGHT_SCORE} size="lg" label="Light score / 100" />
          <div
            style={{
              fontSize: 13,
              color: 'var(--ink-2)',
              maxWidth: 220,
            }}
          >
            South-facing rear · main bedroom faces east · two-storey with low neighbours
          </div>
        </div>

        {/* Monthly hours bar chart + room-by-room */}
        <div className="col" style={{ gap: 16 }}>
          <div className="card col gap-16" style={{ padding: 28 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Hours of direct sun · monthly
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                NREL SPA · pvlib
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                height: 110,
              }}
            >
              {hours.map((h, i) => (
                <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <span className="mono tabular" style={{ fontSize: 9, color: 'var(--muted)' }}>
                    {h}h
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height: `${(h / max) * 72}px`,
                      background:
                        i >= 4 && i <= 7
                          ? 'var(--accent)'
                          : 'color-mix(in oklab, var(--accent) 35%, transparent)',
                      borderRadius: 3,
                    }}
                  />
                  <span className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>
                    {months[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card col" style={{ padding: 24, gap: 12 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Room by room
            </div>
            {(
              [
                { lbl: 'Living room · S', hrs: '1,180 h/yr', bar: 0.78 },
                { lbl: 'Main bedroom · E', hrs: '820 h/yr', bar: 0.62 },
                { lbl: 'Kitchen · N', hrs: '180 h/yr', bar: 0.15 },
                { lbl: 'Backyard', hrs: '1,520 h/yr', bar: 0.92 },
              ] as const
            ).map((w) => (
              <div key={w.lbl} className="row gap-16" style={{ alignItems: 'center' }}>
                <div className="col" style={{ width: 150 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{w.lbl}</span>
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    background: 'var(--line)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${w.bar * 100}%`,
                      height: '100%',
                      background: 'var(--accent)',
                      borderRadius: 999,
                    }}
                  />
                </div>
                <span
                  className="mono tabular"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    width: 90,
                    textAlign: 'right',
                  }}
                >
                  {w.hrs}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── §07 Risks & conditions ────────────────────────────────────────────────────

const RISK_FLAGS = [
  {
    tone: 'amber' as const,
    label: 'Pre-1980 build — knob & tube risk',
    detail:
      'Built 1972. Many homes from this era have legacy aluminum wiring or knob & tube remnants. Insurance companies often require replacement before binding policy.',
  },
  {
    tone: 'amber' as const,
    label: 'Roof age unknown',
    detail:
      "Listing description doesn't mention roof replacement. Asphalt shingles in this climate last 18–22 years — at minimum, ask for the most recent roofing receipt.",
  },
  {
    tone: 'green' as const,
    label: 'No flood zone overlay',
    detail:
      'Address is outside the Conservation Halton regulated floodplain. No special insurance riders needed.',
  },
  {
    tone: 'green' as const,
    label: 'No active conservation easement',
    detail:
      'No environmental restrictions on the lot that would limit additions, garages, or accessory dwellings.',
  },
]

interface RisksSectionProps {
  flags?: Array<{ severity: 'red' | 'amber'; label: string; evidence?: string | null }>
}

function RisksSection({ flags }: RisksSectionProps): JSX.Element {
  // Real flags path: use API data. Demo path (flags undefined): use RISK_FLAGS fixture.
  if (flags !== undefined) {
    const redCount = flags.filter((f) => f.severity === 'red').length
    const amberCount = flags.filter((f) => f.severity === 'amber').length
    // Never imply a clean home: we only parse listing wording. "No flags" means
    // "nothing in the text", not "this property is clear" — say so explicitly.
    const verdict =
      flags.length === 0
        ? 'Listing text only — verify directly'
        : `${amberCount + redCount} flagged · ${redCount > 0 ? redCount + ' critical' : 'none critical'}`

    return (
      <section className="container tr-section">
        <SectionHead
          n="07"
          topic="Risks & conditions"
          question={
            <>
              What should the <em>inspector</em> look at?
            </>
          }
          verdict={verdict}
          tone={redCount > 0 ? 'fail' : 'caution'}
        />
        <div className="col gap-12">
          {flags.length === 0 ? (
            <RiskRow
              tone="amber"
              label="No risk language found in the listing text"
              detail="A wording check only — not a clean bill of health. Ask the agent about as-is / remediation, water or flood history, and any past grow-op."
            />
          ) : (
            // Render each flag at its TRUE severity (a critical red flag must not
            // look like a minor amber one), and surface red flags first so a
            // grow-op / flood reads as an unmissable danger at the top.
            [...flags]
              .sort((a, b) => Number(b.severity === 'red') - Number(a.severity === 'red'))
              .map((f) => (
                <RiskRow
                  key={f.label}
                  tone={f.severity}
                  label={f.label}
                  detail={f.evidence ?? ''}
                />
              ))
          )}
        </div>
        <p style={{ marginTop: 22, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
          These come from parsing the listing description only — explicit risk wording, plus
          ambiguous phrasing worth verifying, and a pre-1980 build heuristic. PropScout does not yet
          check municipal flood overlays or open data, and the description catches explicit mentions
          far better than euphemisms — so the absence of a flag is not a clearance. Use this to
          scope your inspection and conditions, not as a final word.
        </p>
      </section>
    )
  }

  // Demo path — fixture data
  const amberCount = RISK_FLAGS.filter((f) => f.tone === 'amber').length
  const clearCount = RISK_FLAGS.filter((f) => f.tone === 'green').length

  return (
    <section className="container tr-section">
      <SectionHead
        n="07"
        topic="Risks & conditions"
        question={
          <>
            What should the <em>inspector</em> look at?
          </>
        }
        verdict={`${amberCount} to verify · ${clearCount} clear`}
        tone="caution"
      />
      <div className="col gap-12">
        {RISK_FLAGS.map((f) => (
          <RiskRow
            key={f.label}
            tone={f.tone === 'amber' ? 'amber' : 'green'}
            label={f.label}
            detail={f.detail}
          />
        ))}
      </div>
      <p style={{ marginTop: 22, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        Risks above come from listing description parsing, municipal open data (flood overlays,
        conservation), and PropScout's pre-1980 build heuristics. Use them to scope your inspection
        and your conditional period — not as a final word.
      </p>
    </section>
  )
}

// ── §09 Before-you-bid checklist ──────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { label: 'Book a home inspection before any firm offer', critical: true },
  {
    label: 'Pull a status certificate (condo) or title search (freehold)',
    critical: true,
  },
  { label: 'Confirm school catchment with the board directly', critical: true },
  { label: 'Get insurance quoted on the actual address', critical: false },
  {
    label: 'Verify property tax assessment and any pending appeals',
    critical: false,
  },
  {
    label: 'Check whether the lot allows a future garage / addition',
    critical: false,
  },
  { label: 'Walk the block at three different times of day', critical: false },
] as const

function ChecklistSection(): JSX.Element {
  const { tier, openUpgradeModal } = usePaywall()
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const toggle = useCallback((i: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }, [])

  const criticalCount = CHECKLIST_ITEMS.filter((i) => i.critical).length

  return (
    <section className="container tr-section">
      <SectionHead
        n="09"
        topic="Before you bid"
        question={
          <>
            Do these <em>first</em>.
          </>
        }
        verdict={`${CHECKLIST_ITEMS.length} items · ${criticalCount} critical`}
        tone="caution"
      />

      <div className="card" style={{ padding: 28 }}>
        <div className="col">
          {CHECKLIST_ITEMS.map((it, i) => {
            const done = checked.has(i)
            return (
              <label
                key={i}
                className="row gap-14"
                style={{
                  padding: '14px 4px',
                  borderBottom: i < CHECKLIST_ITEMS.length - 1 ? '1px solid var(--line)' : 'none',
                  cursor: 'pointer',
                  alignItems: 'center',
                }}
              >
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(i)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: 'var(--accent)',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                />
                <div
                  className="col grow"
                  style={{
                    gap: 2,
                    color: done ? 'var(--muted)' : 'var(--ink)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}
                >
                  <span style={{ fontSize: 15 }}>{it.label}</span>
                </div>
                {it.critical && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      padding: '3px 8px',
                      borderRadius: 999,
                      border: '1px solid color-mix(in oklab, var(--accent) 35%, transparent)',
                      background: 'color-mix(in oklab, var(--accent) 8%, transparent)',
                      flexShrink: 0,
                    }}
                  >
                    Critical
                  </span>
                )}
              </label>
            )
          })}
        </div>

        <div
          className="row gap-12"
          style={{
            marginTop: 22,
            paddingTop: 22,
            borderTop: '1px solid var(--line)',
          }}
        >
          {tier === 'free' ? (
            <LockedButton
              label="Export checklist as PDF"
              icon="doc"
              onClick={() => openUpgradeModal('pdf')}
            />
          ) : (
            <button className="btn btn-primary">
              <Icon name="doc" size={13} /> Export checklist as PDF
            </button>
          )}
          <button className="btn btn-ghost">
            <Icon name="link" size={13} /> Email to my agent
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Conversion section ────────────────────────────────────────────────────────

function ConversionSection({ city }: { city: string }): JSX.Element {
  return (
    <section
      className="container"
      style={{
        paddingTop: 'clamp(72px, 8vw, 120px)',
        paddingBottom: 'clamp(48px, 6vw, 80px)',
      }}
    >
      <div
        className="grid-1col-mobile"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
      >
        {/* What if you rented it out */}
        <div className="card col gap-16" style={{ padding: 32 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Curious?
          </span>
          <h3
            className="serif"
            style={
              {
                fontSize: 'clamp(22px, 2vw, 28px)',
                lineHeight: 1.1,
                textWrap: 'balance',
              } as React.CSSProperties
            }
          >
            What if you ever <em>rented it out</em>?
          </h3>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>
            Re-run this same listing as an investment and we'll show you the cap rate, the cash
            flow, the OSFI position, and the 20-year equity build. Free with your account.
          </p>
          <div className="row gap-12">
            <button className="btn btn-primary">
              Open investment report <Icon name="arrow" size={13} />
            </button>
          </div>
        </div>

        {/* Talk to an agent */}
        <div
          className="card col gap-16"
          style={{
            padding: 32,
            background: 'var(--ink)',
            color: 'var(--bg)',
            borderColor: 'var(--ink)',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'color-mix(in oklab, var(--bg) 50%, transparent)',
            }}
          >
            Next step
          </span>
          <h3
            className="serif"
            style={
              {
                fontSize: 'clamp(22px, 2vw, 28px)',
                lineHeight: 1.1,
                color: 'var(--bg)',
                textWrap: 'balance',
              } as React.CSSProperties
            }
          >
            Want a <em style={{ color: 'var(--accent)' }}>second opinion</em> from a local agent?
          </h3>
          <p style={{ fontSize: 15, color: 'color-mix(in oklab, var(--bg) 70%, transparent)' }}>
            We'll send this report to a verified {city} agent who knows the area. No obligation —
            they reach out only if you reply.
          </p>
          <div className="row gap-12">
            <button className="btn btn-accent">
              Send to an agent <Icon name="arrow" size={13} />
            </button>
            <button
              className="btn"
              style={{
                background: 'transparent',
                color: 'var(--bg)',
                border: '1px solid color-mix(in oklab, var(--bg) 25%, transparent)',
              }}
            >
              How this works
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PersonalBuyerPageProps {
  /** User tier — controls PDF button gating in ChecklistSection. */
  tier?: string
  /** Real analysis from the API — when provided, live data replaces fixtures. */
  analysis?: Analysis | null
  /** Real listing from the API — used for address slug and narrative. */
  listing?: Listing | null
}

export function PersonalBuyerPage({
  tier: _tier = 'pro',
  analysis: realAnalysis,
  listing: realListing,
}: PersonalBuyerPageProps): JSX.Element {
  const pdf = usePdfExport(realAnalysis?.token ?? null)
  const [dark, setDark] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  const isReal = !!(realAnalysis && realListing)

  const property = useMemo(
    () => (isReal ? shimToPersonalProperty(realListing!, realAnalysis!) : PB_PROPERTY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReal]
  )

  const neighbourhood = useMemo(
    () => (isReal ? shimToPersonalNeighbourhood(realAnalysis!) : PB_NEIGHBOURHOOD),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReal]
  )

  const financing = {
    downPct: property.defaultDownPct,
    rate: property.defaultRate,
    amort: property.defaultAmort,
  }

  const monthly = useMemo(
    () => computeMonthlyCost(property, financing),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [property]
  )

  // Real schools from the schools table (null until the EQAO/Fraser CSV is
  // loaded). When present they feed both the §04 section and the HomeScore
  // schools component — and they are the documented re-enable trigger for the
  // numeric gauge ("FMV or schools has a real source"). Light is REAL when the
  // analysis carries pvlib sun output; otherwise 0 (honest floor), never a fixture.
  const realSchools = isReal && realAnalysis!.schools ? realAnalysis!.schools : null
  const personalSchools = useMemo(
    () => (realSchools ? shimToPersonalSchools(realSchools) : null),
    [realSchools]
  )
  const schoolsForScore = isReal ? (personalSchools ?? EMPTY_SCHOOLS) : PB_SCHOOLS
  const lightScore = isReal ? (realAnalysis!.sunScout?.sunScore ?? 0) : STATIC_LIGHT_SCORE

  // Real flags feed the risk component + severe-gate ceiling. The aggregate
  // gauge is suppressed while isReal, but the risk breakdown bar stays visible —
  // a red flag must read as a real deduction, not the no-flags baseline.
  const flagsForScore = isReal ? realAnalysis!.riskFlags : undefined

  const score = useMemo(
    () => computeHomeScore(property, schoolsForScore, neighbourhood, lightScore, flagsForScore),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [property, neighbourhood, lightScore, flagsForScore]
  )

  const addressSlug = realListing
    ? (realListing.address
        .split(',')[0]
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') ?? '248-mountcrest-burlington')
    : '248-mountcrest-burlington'

  return (
    <div className="report-page-mobile-padding">
      <Nav
        variant="report"
        reportLabel="Personal buyer report"
        addressSlug={addressSlug}
        dark={dark}
        onToggleDark={() => {
          setDark((d) => {
            const next = !d
            document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
            return next
          })
        }}
        onSignIn={() => setShowSignIn(true)}
      />

      <PersonalPropertyHero
        property={property}
        score={score}
        monthly={monthly}
        scoreSuppressed={isReal && personalSchools == null}
        photoUrls={
          isReal ? (realListing!.photos.length > 0 ? realListing!.photos : undefined) : undefined
        }
      />
      {isReal && (
        <div className="container" style={{ marginTop: -24, marginBottom: 8 }}>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              letterSpacing: '0.12em',
            }}
          >
            {personalSchools != null
              ? realAnalysis?.sunScout != null
                ? 'Schools + sun data · live'
                : 'School data · live — sun data pending geocode'
              : realAnalysis?.sunScout != null
                ? 'School data · pending EQAO/Fraser dataset load'
                : 'School and sun data · pending'}
          </p>
        </div>
      )}
      <PersonalVerdictHero monthly={monthly} narrative={realAnalysis?.narrative} isReal={isReal} />

      <PBTrueCostSection property={property} monthly={monthly} />
      <PBFMVSection
        property={property}
        score={score}
        compCount={isReal ? undefined : PB_COMPS.length}
        avgDOM={isReal ? undefined : 12}
        medianPPSqft={isReal ? undefined : 538}
        isEstimated={isReal}
      />
      <PBSalesSection comps={PB_COMPS} isSampleData={isReal} />
      <SchoolsSection
        isReal={isReal}
        realSchools={personalSchools}
        catchmentNote={realSchools?.catchmentNote ?? null}
      />
      <NeighbourhoodSection neigh={neighbourhood} />
      {isReal ? (
        <SunScoutPanel
          sunScout={realAnalysis?.sunScout ?? null}
          sectionNumber="06"
          token={realAnalysis?.token}
          question={
            <>
              Which rooms will the <em>light</em> reach?
            </>
          }
        />
      ) : (
        <SunScoutSection />
      )}
      <RisksSection flags={isReal ? realAnalysis!.riskFlags : undefined} />
      <ChecklistSection />
      <ConversionSection city={isReal ? realListing!.city : 'Burlington'} />

      <Footer />
      <StickyActionBar
        onSave={() => undefined}
        onShare={() => void navigator.clipboard.writeText(window.location.href)}
        onPDF={pdf.exportPdf}
      />
      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />
    </div>
  )
}
