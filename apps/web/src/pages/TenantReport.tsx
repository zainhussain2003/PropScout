/**
 * TenantReport — Report C (tenant evaluation) page.
 *
 * 12 sections rendered in order per spec Section 8:
 *   TenantPropertyHero  — photo grid + chips + address + sticky score / target card
 *   TenantVerdictHero   — full-bleed AI verdict block
 *   §01  Rent positioning       — RentalCompsBar + metric tiles
 *   §02  Listing accuracy       — FlagDeepRow list
 *   §03  Listed vs Reality      — ListedVsRealitySection (hidden when zero flags)
 *   §04  Negotiation            — NegotiationSection
 *   §05  Monthly cost           — cost breakdown table
 *   §06  What's included        — WhatsIncludedSection
 *   §07  Location & commute     — LocationCommuteSection
 *   §08  Schools                — TenantSchoolsSection
 *   §09  SunScout               — SunScoutPanel (fixture on demo, live when analysis present)
 *   §10  Comps map              — MiniMap
 *   §11  Unit & building details — collapsible spec sheet
 *   §12  Before you sign        — confirm checklist
 *   ConversionBlock             — investor upsell + rent-drop alert
 *
 * Uses the 3705 Charles St E mock dataset until the live scraper is wired.
 */

import { useState } from 'react'
import { TruncatedVerdict } from '../components/paywall/TruncatedVerdict'
import { LockedButton } from '../components/paywall/LockedButton'
import { usePaywall } from '../components/paywall/PaywallContext'
import { usePdfExport } from '../hooks/usePdfExport'
import { Nav } from '../components/shared/Nav'
import { Footer } from '../components/shared/Footer'
import { StickyActionBar } from '../components/shared/StickyActionBar'
import { SectionHead } from '../components/shared/SectionHead'
import { SignInModal } from '../components/shared/SignInModal'
import { Chip } from '../components/shared/Chip'
import { Icon } from '../components/shared/Icon'
import { DealScore } from '../components/analysis/DealScore'
import { RentalCompsBar } from '../components/analysis/RentalCompsBar'
import { Metric } from '../components/analysis/Metric'
import { AIVerdictBlock } from '../components/analysis/AIVerdictBlock'
import { MiniMap } from '../components/analysis/MiniMap'
import { FlagDeepRow } from '../components/tenant/FlagDeepRow'
import { ListedVsRealitySection } from '../components/tenant/ListedVsRealitySection'
import { WhatsIncludedSection } from '../components/tenant/WhatsIncludedSection'
import { LocationCommuteSection } from '../components/tenant/LocationCommuteSection'
import { NegotiationSection } from '../components/tenant/NegotiationSection'
import { TenantSchoolsSection } from '../components/tenant/TenantSchoolsSection'
import { SunScoutPanel } from '../components/sunscout/SunScoutPanel'
import {
  CHARLES_LISTING,
  CHARLES_FLAGS,
  CHARLES_LISTED,
  CHARLES_REALITY,
  CHARLES_AMENITIES,
  CHARLES_SCHOOLS,
  CHARLES_MOBILITY_SCORES,
  CHARLES_DISTANCES,
  CHARLES_LEVERAGE_FACTORS,
  CHARLES_SUGGESTED_MESSAGE,
  CHARLES_MESSAGE_REASONS,
  CHARLES_COST_LINES,
  CHARLES_CHECKLIST,
  CHARLES_SUNSCOUT,
} from '../constants/tenantDemoData'
import type {
  Analysis,
  TenantChecklistItem,
  TenantCostLine,
  TenantListingData,
} from '../types/analysis'
import type { Listing } from '../types/property'
import { shimToTenantListingData } from '../lib/reportShims'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCAD(n: number): string {
  return `$${n.toLocaleString('en-CA')}`
}

// ── TenantPropertyHero ────────────────────────────────────────────────────────

interface TenantPropertyHeroProps {
  dark: boolean
  onBack?: () => void
  /** Real listing data — when provided replaces the CHARLES_LISTING fixture. */
  listing?: TenantListingData
  /** Pro PDF download handler (usePdfExport) — no-op on the demo route. */
  onPDF?: () => void
}

function TenantPropertyHero({
  dark: _dark,
  onBack,
  listing: listingProp,
  onPDF,
}: TenantPropertyHeroProps): JSX.Element {
  const { tier, openUpgradeModal } = usePaywall()
  const listing = listingProp ?? CHARLES_LISTING
  const verdictColor =
    listing.scoreTone === 'pass'
      ? 'var(--pass)'
      : listing.scoreTone === 'caution'
        ? 'var(--caution)'
        : 'var(--fail)'

  return (
    <section className="container" style={{ paddingTop: 56, paddingBottom: 48 }}>
      {/* Breadcrumb */}
      <div
        className="row gap-12"
        style={{
          marginBottom: 28,
          color: 'var(--muted)',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            padding: 0,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
          aria-label="Analyze another listing"
        >
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }} aria-hidden="true">
            <Icon name="arrow" size={13} />
          </span>
          Analyze another listing
        </button>
        <span style={{ opacity: 0.4 }}>·</span>
        <span
          className="mono"
          style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}
        >
          Report · Tenant view
        </span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            className="live-dot"
            style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }}
            aria-hidden="true"
          />
          Refreshed 3 min ago
        </span>
      </div>

      {/* Two-column hero */}
      <div
        className="grid-1col-mobile hero-score-first"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 'clamp(28px, 3.5vw, 52px)',
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT — photos + chips + address */}
        <div className="col" style={{ gap: 28 }}>
          {/* Photo grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, height: 360 }}>
            {/* Hero photo */}
            <div
              className={listing.photoUrls?.[0] ? undefined : 'photo-ph'}
              style={{ borderRadius: 18, height: '100%', overflow: 'hidden' }}
            >
              {listing.photoUrls?.[0] ? (
                <img
                  src={listing.photoUrls[0]}
                  alt={`Exterior of ${listing.addressLine1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span>unit · skyline view</span>
              )}
            </div>

            {/* Thumbnail stack */}
            <div className="col" style={{ gap: 8 }}>
              {(['living', 'kitchen', 'bedroom'] as const).map((label, idx) => (
                <div
                  key={label}
                  className={listing.photoUrls?.[idx + 1] ? undefined : 'photo-ph'}
                  style={{
                    borderRadius: 14,
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {listing.photoUrls?.[idx + 1] ? (
                    <img
                      src={listing.photoUrls[idx + 1]}
                      alt={label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{label}</span>
                  )}
                  {idx === 2 && (
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
                      + 18 more
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chips + address + quick facts */}
          <div className="col" style={{ gap: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {listing.chips.map((chip, i) => (
                <Chip key={i}>{chip}</Chip>
              ))}
            </div>

            <h1
              className="serif"
              style={{ textWrap: 'balance', letterSpacing: '-0.035em', marginTop: 4 }}
            >
              {listing.addressLine1}
            </h1>
            <div style={{ fontSize: 16, color: 'var(--muted)' }}>{listing.addressLine2}</div>

            <div
              style={{
                display: 'flex',
                gap: 20,
                flexWrap: 'wrap',
                marginTop: 8,
                fontSize: 14,
                color: 'var(--ink-2)',
                alignItems: 'center',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="key" size={14} />
                {listing.beds} · {listing.baths} bath
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="house" size={14} />
                {listing.sqft} sqft
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="dot" size={10} />
                {listing.floor}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="check" size={14} />
                {listing.utilities}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — sticky score card */}
        <div className="card col" style={{ padding: 32, gap: 24, position: 'sticky', top: 84 }}>
          {/* Tenant score gauge */}
          <div className="col" style={{ gap: 8, alignItems: 'center' }}>
            <DealScore
              score={listing.scoreNumber}
              max={100}
              size="lg"
              label="Tenant score / 100"
              showVerdict
              animate
            />
          </div>

          {/* Verdict */}
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
              {listing.verdictLabel}
            </div>
            <div className="serif" style={{ fontSize: 20, lineHeight: 1.2, textWrap: 'balance' }}>
              {listing.verdictSub}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--line)' }} />

          {/* Asking + target */}
          <div className="col" style={{ gap: 12, marginTop: 8 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
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
                Asking
              </span>
              <span className="serif tabular" style={{ fontSize: 34, lineHeight: 1 }}>
                {fmtCAD(listing.asking)}
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>/mo</span>
              </span>
            </div>

            {/* Target band */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '12px 14px',
                borderRadius: 12,
                background: 'color-mix(in oklab, var(--pass) 8%, transparent)',
                border: '1px solid color-mix(in oklab, var(--pass) 25%, transparent)',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--pass)',
                }}
              >
                Your target
              </span>
              <span
                className="serif tabular"
                style={{ fontSize: 22, lineHeight: 1, color: 'var(--pass)' }}
              >
                {fmtCAD(listing.targetLow)}–{fmtCAD(listing.targetHigh)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="col" style={{ gap: 8 }}>
            {tier === 'free' ? (
              <LockedButton
                label="Save to account"
                icon="arrow"
                onClick={() => openUpgradeModal('portfolio')}
              />
            ) : (
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: 14 }}
              >
                Save to account <Icon name="arrow" size={14} />
              </button>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: 'center', padding: '11px 12px', fontSize: 13 }}
              >
                <Icon name="link" size={13} /> Share
              </button>
              {tier === 'free' ? (
                <LockedButton label="PDF" icon="doc" onClick={() => openUpgradeModal('pdf')} />
              ) : (
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center', padding: '11px 12px', fontSize: 13 }}
                  onClick={() => onPDF?.()}
                >
                  <Icon name="doc" size={13} /> PDF
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── §01 Rent Positioning ──────────────────────────────────────────────────────

function RentPositioningSection(): JSX.Element {
  return (
    <section className="container tr-section" data-section="01">
      <SectionHead
        n="01"
        topic="Rent positioning"
        question={
          <>
            Is the rent <em>fair</em>?
          </>
        }
        verdict="$150 above market"
        tone="caution"
      />

      <div
        className="grid-1col-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: 'clamp(24px, 3vw, 44px)',
          alignItems: 'flex-start',
        }}
      >
        {/* Comp bar */}
        <div className="card" style={{ padding: 28 }}>
          <RentalCompsBar
            low={1800}
            mid={1950}
            high={2300}
            ask={2150}
            context={{ trendPct: -1.4, medianDom: 18, vacancyPct: 1.8 }}
          />
        </div>

        {/* Narrative + metric grid */}
        <div className="col" style={{ gap: 20 }}>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Comparable 1-bedroom units in this building have rented for{' '}
            <span className="tabular" style={{ color: 'var(--ink)' }}>
              $1,900–2,100
            </span>{' '}
            over the last 90 days. The median for true 2-bedrooms is{' '}
            <span className="tabular" style={{ color: 'var(--ink)' }}>
              $2,300
            </span>{' '}
            — but, per §02, this isn't a true 2-bedroom.
          </p>

          <div
            className="grid-1col-mobile"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            <Metric label="Asking" value="$2,150" sub="/mo" status="caution" />
            <Metric label="Market median" value="$1,950" sub="1-bed · this FSA" />
            <Metric label="Building median" value="$2,000" sub="14 active listings" />
            <Metric label="Negotiation gap" value="$150–200" sub="leverage area" status="pass" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── §02 Listing Accuracy ──────────────────────────────────────────────────────

function ListingAccuracySection(): JSX.Element {
  const redCount = CHARLES_FLAGS.filter((f) => f.tone === 'red').length
  const amberCount = CHARLES_FLAGS.filter((f) => f.tone === 'amber').length
  const goodCount = CHARLES_FLAGS.filter((f) => f.tone === 'good').length

  const verdictParts = []
  if (redCount > 0) verdictParts.push(`${redCount} red`)
  if (amberCount > 0) verdictParts.push(`${amberCount} amber`)
  if (goodCount > 0) verdictParts.push(`${goodCount} confirmed`)

  return (
    <section className="container tr-section" data-section="02">
      <SectionHead
        n="02"
        topic="Listing accuracy"
        question={
          <>
            Is the listing <em>honest</em>?
          </>
        }
        verdict={verdictParts.join(' · ')}
        tone={redCount > 0 ? 'fail' : amberCount > 0 ? 'caution' : 'pass'}
      />

      <div className="col" style={{ gap: 16 }}>
        {CHARLES_FLAGS.map((f) => (
          <FlagDeepRow key={f.id ?? f.label} flag={f} />
        ))}
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        Scanned with Scout AI · 100% of listing description checked against 7 rule patterns (fake
        bedrooms, basement units, parking ambiguity, utilities, pets, smoking, broker-style hedges).
        Override any flag from within the report.
      </p>
    </section>
  )
}

// ── §05 Monthly Cost ──────────────────────────────────────────────────────────

function CostBreakdownSection({ lines }: { lines: TenantCostLine[] }): JSX.Element {
  const totalAsk = lines.reduce((s, l) => s + (l.included === true ? 0 : l.asking), 0)
  const totalTgt = lines.reduce((s, l) => s + (l.included === true ? 0 : l.target), 0)
  const monthlySavings = totalAsk - totalTgt
  const annualSavings = monthlySavings * 12

  return (
    <section className="container tr-section" data-section="05">
      <SectionHead
        n="05"
        topic="Monthly cost"
        question={
          <>
            What will it <em>really</em> cost?
          </>
        }
        verdict={`Save ${fmtCAD(annualSavings)}/yr at target`}
        tone="pass"
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2.2fr 1fr 1fr',
            padding: '14px 28px',
            background: 'var(--bg-elev)',
            borderBottom: '1px solid var(--line)',
            alignItems: 'center',
          }}
        >
          {(['Line item', 'At asking', 'At target ↓'] as const).map((h, i) => (
            <span
              key={h}
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: i === 2 ? 'var(--accent)' : 'var(--muted)',
                textAlign: i === 0 ? 'left' : 'right',
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Data rows */}
        {lines.map((l) => (
          <div
            key={l.k}
            style={{
              display: 'grid',
              gridTemplateColumns: '2.2fr 1fr 1fr',
              padding: '16px 28px',
              borderBottom: '1px solid var(--line)',
              alignItems: 'center',
            }}
          >
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 15, color: 'var(--ink)' }}>{l.k}</span>
              {l.note && (
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {l.note}
                </span>
              )}
            </div>
            <span
              className="mono tabular"
              style={{
                textAlign: 'right',
                color: l.included === true ? 'var(--muted)' : 'var(--ink)',
                fontSize: 15,
              }}
            >
              {l.included === true ? '— incl.' : fmtCAD(l.asking)}
            </span>
            <span
              className="mono tabular"
              style={{
                textAlign: 'right',
                color:
                  l.target < l.asking
                    ? 'var(--pass)'
                    : l.included === true
                      ? 'var(--muted)'
                      : 'var(--ink)',
                fontSize: 15,
              }}
            >
              {l.included === true ? '— incl.' : fmtCAD(l.target)}
            </span>
          </div>
        ))}

        {/* Totals */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2.2fr 1fr 1fr',
            padding: '22px 28px',
            background: 'color-mix(in oklab, var(--accent) 5%, var(--bg-elev))',
            alignItems: 'flex-end',
          }}
        >
          <div className="col" style={{ gap: 2 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              True monthly cost
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              Including utilities &amp; parking
            </span>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
            <span className="serif tabular" style={{ fontSize: 26, lineHeight: 1 }}>
              {fmtCAD(totalAsk)}
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
              /mo
            </span>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
            <span
              className="serif tabular"
              style={{ fontSize: 26, lineHeight: 1, color: 'var(--pass)' }}
            >
              {fmtCAD(totalTgt)}
            </span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--pass)' }}>
              /mo · save {fmtCAD(monthlySavings)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── §10 Comps map ─────────────────────────────────────────────────────────────

function CompsMapSection(): JSX.Element {
  return (
    <section className="container tr-section" data-section="10">
      <SectionHead
        n="10"
        topic="Map of comps"
        question={
          <>
            Where do <em>similar units</em> sit?
          </>
        }
        verdict="14 building · 22 nearby"
        tone="pass"
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <MiniMap
          height={420}
          address="Toronto · M4Y · 1km radius"
          pins={[
            { lat: 0.14, lng: 0.4, label: '$1,950' },
            { lat: 0.7, lng: 0.22, label: '$2,100' },
            { lat: 0.34, lng: 0.64, label: '$1,900' },
            { lat: 0.76, lng: 0.68, label: '$2,250' },
            { lat: 0.58, lng: 0.78, label: '$2,000' },
            { lat: 0.22, lng: 0.78, label: '$1,875' },
            { lat: 0.88, lng: 0.42, label: '$2,150' },
          ]}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '16px 24px',
            flexWrap: 'wrap',
            gap: 12,
            borderTop: '1px solid var(--line)',
          }}
        >
          <div
            className="row"
            style={{ flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', gap: 16 }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: 'var(--accent)',
                  border: '2px solid var(--surface)',
                  boxShadow: '0 0 0 1px var(--line-strong)',
                }}
                aria-hidden="true"
              />
              This listing
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--ink)' }}
                aria-hidden="true"
              />
              Comparable rental ($1,875 – $2,250)
            </span>
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            Live data refreshed nightly · © Mapbox · OSM
          </span>
        </div>
      </div>
    </section>
  )
}

// ── §11 Unit & building details ───────────────────────────────────────────────

const UNIT_DETAIL_ROWS: Array<[string, string, 'pass' | 'fail' | undefined]> = [
  ['Floor', '37th of 55', undefined],
  ['Total sqft', 'Not listed · est. 600–700', undefined],
  ['Balcony', '105 sqft · unobstructed', 'pass'],
  ['Bedroom 1', 'Proper bedroom · solid door', 'pass'],
  ['"Bedroom 2" / den', 'Sliding glass door · no privacy', 'fail'],
  ['Den window', 'Likely none · interior position', 'fail'],
  ['Bathrooms', '1 full · ensuite', 'pass'],
  ['Kitchen', 'Built-in appliances · sleek cabinetry', 'pass'],
  ['Ceilings', '9 ft', 'pass'],
  ['Windows', 'Floor-to-ceiling in living area', 'pass'],
  ['Laundry', 'Ensuite', 'pass'],
  ['Cooling', 'Central air', undefined],
  ['Heating', 'Electric forced air', undefined],
  ['Available', 'Now', 'pass'],
]

const BUILDING_DETAIL_ROWS: Array<[string, string, 'pass' | 'fail' | undefined]> = [
  ['Building name', 'Transit City 2', undefined],
  ['Year built', '2022', undefined],
  ['Storeys', '55', undefined],
  ['Total units', '534', undefined],
  ['Concierge', '24-hr', 'pass'],
  ['Pets', 'Allowed · no size limit', 'pass'],
  ['Smoking', 'Non-smoking building', undefined],
  ['Currently listed in building', '14 rental units · 8 for sale', undefined],
  ['Median building rent (1-bed)', '$2,000/mo', undefined],
  ['Average days on market', '17 days', undefined],
]

function UnitDetailsSection(): JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <section className="container tr-section" data-section="11">
      <SectionHead
        n="11"
        topic="Unit & building details"
        question={
          <>
            The full <em>spec sheet</em>.
          </>
        }
        verdict={open ? 'Showing all' : '24 line items'}
        tone="pass"
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '20px 28px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: open ? '1px solid var(--line)' : 'none',
          }}
        >
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>Show all unit and building specs</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Floor, sqft, ceilings, windows, building stats, and more
            </span>
          </div>
          <span style={{ color: 'var(--muted)' }} aria-hidden="true">
            <Icon name={open ? 'minus' : 'plus'} size={18} />
          </span>
        </button>

        {open && (
          <div
            className="grid-1col-mobile"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}
          >
            {(
              [
                { title: 'The unit', rows: UNIT_DETAIL_ROWS },
                { title: 'The building', rows: BUILDING_DETAIL_ROWS },
              ] as const
            ).map((sec, sIdx) => (
              <div
                key={sec.title}
                className="col"
                style={{
                  padding: '24px 28px',
                  borderRight: sIdx === 0 ? '1px solid var(--line)' : 'none',
                }}
              >
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    marginBottom: 16,
                    display: 'block',
                  }}
                >
                  {sec.title}
                </span>
                <div className="col">
                  {sec.rows.map(([k, v, tone], i) => (
                    <div
                      key={k}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '9px 0',
                        borderBottom: i < sec.rows.length - 1 ? '1px solid var(--line)' : 'none',
                        fontSize: 13,
                        gap: 12,
                      }}
                    >
                      <span style={{ color: 'var(--ink-2)' }}>{k}</span>
                      <span
                        className="mono tabular"
                        style={{
                          color:
                            tone === 'pass'
                              ? 'var(--pass)'
                              : tone === 'fail'
                                ? 'var(--fail)'
                                : 'var(--ink)',
                          fontWeight: 500,
                          textAlign: 'right',
                        }}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ── §12 Confirm-before-signing checklist ──────────────────────────────────────

function ConfirmChecklist({ items }: { items: TenantChecklistItem[] }): JSX.Element {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  function toggle(idx: number): void {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const criticalCount = items.filter((it) => it.critical).length
  const doneCount = checked.size

  return (
    <section className="container tr-section" data-section="12">
      <SectionHead
        n="12"
        topic="Before you sign"
        question={
          <>
            Get these in <em>writing</em>.
          </>
        }
        verdict={`${items.length} items · ${criticalCount} critical`}
        tone="caution"
      />

      <div className="card" style={{ padding: 28 }}>
        <div
          className="mono"
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            marginBottom: 16,
            letterSpacing: '0.12em',
          }}
        >
          {doneCount} / {items.length} complete
        </div>

        <div className="col" style={{ gap: 12 }}>
          {items.map((it, i) => (
            <label
              key={i}
              className="row"
              style={{
                padding: '12px 4px',
                borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none',
                cursor: 'pointer',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => toggle(i)}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: 'var(--accent)',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              />
              <div className="col" style={{ gap: 2, flex: 1 }}>
                <span
                  style={{
                    fontSize: 15,
                    color: 'var(--ink)',
                    textDecoration: checked.has(i) ? 'line-through' : 'none',
                    opacity: checked.has(i) ? 0.5 : 1,
                  }}
                >
                  {it.label}
                </span>
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
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 22,
            paddingTop: 22,
            borderTop: '1px solid var(--line)',
          }}
        >
          <button className="btn btn-primary">
            <Icon name="doc" size={13} /> Export checklist as PDF
          </button>
          <button className="btn btn-ghost">
            <Icon name="link" size={13} /> Send to my email
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Conversion block ──────────────────────────────────────────────────────────

function ConversionBlock(): JSX.Element {
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
        {/* Buy instead */}
        <div className="card col" style={{ padding: 32, gap: 16 }}>
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
            style={{ fontSize: 'clamp(22px, 2vw, 28px)', lineHeight: 1.1, textWrap: 'balance' }}
          >
            Wondering if you should <em>buy</em> instead of rent?
          </h3>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>
            Run the same address as a personal purchase and we'll show you what the monthly carry
            would actually be, what the unit is worth based on recent sales, and how schools and
            walkability shake out.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary">
              Open personal-buy report <Icon name="arrow" size={13} />
            </button>
          </div>
        </div>

        {/* Rent-drop alert */}
        <div
          className="card col"
          style={{
            padding: 32,
            gap: 16,
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
            Stay in the loop
          </span>
          <h3
            className="serif"
            style={{
              fontSize: 'clamp(22px, 2vw, 28px)',
              lineHeight: 1.1,
              color: 'var(--bg)',
              textWrap: 'balance',
            }}
          >
            Get notified if this rent <em style={{ color: 'var(--accent)' }}>drops</em>.
          </h3>
          <p style={{ fontSize: 15, color: 'color-mix(in oklab, var(--bg) 70%, transparent)' }}>
            We'll watch this listing for 30 days and email you the moment the price changes or it
            gets relisted. Free, no account needed.
          </p>
          <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="you@example.com"
              style={{
                flex: 1,
                padding: '12px 14px',
                background: 'color-mix(in oklab, var(--bg) 8%, transparent)',
                border: '1px solid color-mix(in oklab, var(--bg) 16%, transparent)',
                borderRadius: 12,
                color: 'var(--bg)',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button className="btn btn-accent" style={{ padding: '12px 18px' }}>
              Notify me
            </button>
          </form>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'color-mix(in oklab, var(--bg) 40%, transparent)',
            }}
          >
            Unsubscribe anytime · no marketing
          </span>
        </div>
      </div>
    </section>
  )
}

// ── Placeholder card for sections not yet populated by extraction pipeline ────

function SectionPlaceholder({
  n,
  topic,
  question,
  week,
}: {
  n: string
  topic: string
  question: JSX.Element
  week: string
}): JSX.Element {
  return (
    <section className="container tr-section">
      <SectionHead
        n={n}
        topic={topic}
        question={question}
        verdict={`Available ${week}`}
        tone="caution"
      />
      <div className="card" style={{ padding: 32, textAlign: 'center' }}>
        <p
          className="mono"
          style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em' }}
        >
          {topic} · {week}
        </p>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

/** Plain-text first paragraph for TruncatedVerdict (free tier). */
const TENANT_FIRST_PARA =
  "Do not sign at $2,150. The room marketed as a second bedroom is a den with a sliding glass door — no privacy, no sound barrier, almost certainly no window. You're paying a 2-bedroom premium for a 1-bedroom with a study."

interface TenantReportProps {
  /** User tier — controls AIVerdictBlock (pro) vs TruncatedVerdict (free). */
  tier?: string
  /** Real analysis from the API — when provided, live data replaces fixtures. */
  analysis?: Analysis | null
  /** Real listing from the API — required alongside analysis to activate live mode. */
  listing?: Listing | null
}

export function TenantReport({
  tier = 'pro',
  analysis: realAnalysis,
  listing: realListing,
}: TenantReportProps): JSX.Element {
  const { openUpgradeModal } = usePaywall()
  const pdf = usePdfExport(realAnalysis?.token ?? null)
  const [dark, setDark] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  // Shim: when real data is provided, derive TenantListingData from it
  const isReal = !!(realAnalysis && realListing)

  const tenantListing: TenantListingData | undefined = isReal
    ? shimToTenantListingData(realListing!, realAnalysis!)
    : undefined

  const addressSlug = tenantListing
    ? tenantListing.addressLine1.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    : '3705-charles-st-e'

  function toggleDark(): void {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  return (
    <div className="report-page-mobile-padding">
      <Nav
        variant="report"
        reportLabel="Tenant report"
        addressSlug={addressSlug}
        dark={dark}
        onToggleDark={toggleDark}
        onSignIn={() => setShowSignIn(true)}
      />

      {/* Property hero — passes real listing data when available */}
      <TenantPropertyHero
        dark={dark}
        onBack={() => window.history.back()}
        listing={tenantListing}
        onPDF={pdf.exportPdf}
      />

      {/* AI verdict */}
      <section className="container" style={{ marginTop: 24, marginBottom: 16 }}>
        {tier === 'free' ? (
          <TruncatedVerdict
            firstParagraph={
              realAnalysis?.narrative
                ? realAnalysis.narrative.split('. ')[0] + '.'
                : TENANT_FIRST_PARA
            }
            eyebrow="Scout AI · tenant verdict"
            onUnlock={() => openUpgradeModal('verdict')}
          />
        ) : (
          <AIVerdictBlock
            eyebrow="Scout AI · tenant verdict"
            headline={
              realAnalysis?.narrative ? (
                realAnalysis.narrative.split('. ')[0] + '.'
              ) : (
                <>
                  Do not sign at <span style={{ color: 'var(--accent)' }}>$2,150</span>. The room
                  marketed as a second bedroom is a den with a sliding glass door — no privacy, no
                  sound barrier, almost certainly no window. You&apos;re paying a 2-bedroom premium
                  for a 1-bedroom with a study.
                </>
              )
            }
            sub={
              realAnalysis?.narrative ?? (
                <>
                  Your negotiation target is{' '}
                  <span className="tabular" style={{ color: 'var(--accent)' }}>
                    $1,950–2,000
                  </span>
                  /mo. You have real leverage: 14 competing rentals in this building, the unit has
                  been listed for 22 days, and you have a documented misrepresentation to point to.
                  Before you go back, confirm two things in writing — does the den have a window,
                  and is parking included or extra.
                </>
              )
            }
          />
        )}
      </section>

      {/* §01 Rent positioning */}
      {isReal ? (
        <section className="container tr-section" data-section="01">
          <SectionHead
            n="01"
            topic="Rent positioning"
            question={
              <>
                Is the rent <em>fair</em>?
              </>
            }
            verdict={
              tenantListing
                ? `Asking $${tenantListing.asking.toLocaleString()}/mo`
                : 'Fetching comps…'
            }
            tone="caution"
          />
          <div className="card" style={{ padding: 28 }}>
            <RentalCompsBar
              low={tenantListing?.targetLow ?? 0}
              mid={tenantListing?.targetHigh ?? 0}
              high={tenantListing?.targetHigh ?? 0}
              ask={tenantListing?.asking ?? 0}
            />
            <p
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                letterSpacing: '0.12em',
                marginTop: 16,
              }}
            >
              Rental comps · available Week 4–5 · nightly scraper
            </p>
          </div>
        </section>
      ) : (
        <RentPositioningSection />
      )}

      {/* §02 Listing accuracy — real flags when available, fixture for demo */}
      {isReal ? (
        realAnalysis!.riskFlags.length > 0 ? (
          <ListingAccuracySection />
        ) : (
          <SectionPlaceholder
            n="02"
            topic="Listing accuracy"
            question={
              <>
                Is the listing <em>honest</em>?
              </>
            }
            week="Week 5–6 · extraction pipeline"
          />
        )
      ) : (
        <ListingAccuracySection />
      )}

      {/* §03 Listed vs Reality — only show for demo; requires extraction pipeline */}
      {!isReal && <ListedVsRealitySection listed={CHARLES_LISTED} reality={CHARLES_REALITY} />}

      {/* §04 Negotiation — requires extraction pipeline for leverage analysis */}
      {isReal ? (
        <SectionPlaceholder
          n="04"
          topic="Negotiation"
          question={
            <>
              Should you <em>negotiate</em>?
            </>
          }
          week="Week 5–6 · extraction pipeline"
        />
      ) : (
        <NegotiationSection
          targetLow={CHARLES_LISTING.targetLow}
          targetHigh={CHARLES_LISTING.targetHigh}
          leverageFactors={CHARLES_LEVERAGE_FACTORS}
          suggestedMessage={CHARLES_SUGGESTED_MESSAGE}
          messageReasons={CHARLES_MESSAGE_REASONS}
        />
      )}

      {/* §05 Monthly cost — requires extraction to know what's included */}
      {isReal ? (
        <SectionPlaceholder
          n="05"
          topic="Monthly cost"
          question={
            <>
              What will it <em>really</em> cost?
            </>
          }
          week="Week 5–6 · extraction pipeline"
        />
      ) : (
        <CostBreakdownSection lines={CHARLES_COST_LINES} />
      )}

      {/* §06 What's included — requires extraction pipeline */}
      {isReal ? (
        <SectionPlaceholder
          n="06"
          topic="What's included"
          question={
            <>
              What does the rent <em>cover</em>?
            </>
          }
          week="Week 5–6 · extraction pipeline"
        />
      ) : (
        <WhatsIncludedSection
          amenities={CHARLES_AMENITIES}
          askingRent={CHARLES_LISTING.asking}
          estimatedValue="~$320/mo"
          adjustedRent="$1,830/mo"
        />
      )}

      {/* §07 Location & commute — walk scores real, distances Week 4-5 */}
      <LocationCommuteSection
        mobilityScores={
          realAnalysis?.walkScore
            ? [
                {
                  label: 'Walk Score',
                  val: realAnalysis.walkScore.walk,
                  sub: realAnalysis.walkScore.description,
                  tone: realAnalysis.walkScore.walk >= 70 ? 'pass' : 'caution',
                },
                {
                  label: 'Transit Score',
                  val: realAnalysis.walkScore.transit ?? 0,
                  sub: 'Public transit',
                  tone: (realAnalysis.walkScore.transit ?? 0) >= 50 ? 'pass' : 'caution',
                },
                {
                  label: 'Bike Score',
                  val: realAnalysis.walkScore.bike ?? 0,
                  sub: 'Bikeable',
                  tone: (realAnalysis.walkScore.bike ?? 0) >= 50 ? 'pass' : 'caution',
                },
              ]
            : CHARLES_MOBILITY_SCORES
        }
        distances={isReal ? [] : CHARLES_DISTANCES}
        verdict={
          realAnalysis?.walkScore
            ? `Walk ${realAnalysis.walkScore.walk} · Transit ${realAnalysis.walkScore.transit ?? 0}`
            : 'Excellent transit · limited walk'
        }
      />

      {/* §08 Schools — requires Google Places + EQAO data */}
      {isReal ? (
        <SectionPlaceholder
          n="08"
          topic="Schools"
          question={
            <>
              What schools are <em>nearby</em>?
            </>
          }
          week="Week 4–5 · Google Places + EQAO"
        />
      ) : (
        <TenantSchoolsSection schools={CHARLES_SCHOOLS} />
      )}

      {/* §09 SunScout — live data when present, demo fixture on the demo route */}
      <SunScoutPanel
        sunScout={realAnalysis ? (realAnalysis.sunScout ?? null) : CHARLES_SUNSCOUT}
        sectionNumber="09"
        question={
          <>
            How much <em>light</em> will you actually get?
          </>
        }
      />

      {/* §10 Comps map */}
      <CompsMapSection />

      {/* §11 Unit & building details — requires extraction pipeline for room-level detail */}
      {isReal ? (
        <SectionPlaceholder
          n="11"
          topic="Unit & building details"
          question={
            <>
              What exactly are you <em>getting</em>?
            </>
          }
          week="Week 5–6 · extraction pipeline"
        />
      ) : (
        <UnitDetailsSection />
      )}

      {/* §12 Confirm before signing */}
      <ConfirmChecklist items={CHARLES_CHECKLIST} />

      {/* Conversion block */}
      <ConversionBlock />

      <Footer />

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />
      <StickyActionBar
        onSave={() => undefined}
        onShare={() => void navigator.clipboard.writeText(window.location.href)}
        onPDF={pdf.exportPdf}
      />
    </div>
  )
}
