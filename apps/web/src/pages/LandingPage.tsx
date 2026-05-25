// LandingPage — the root page at /.
//
// Sections (in order):
//   Nav (landing variant)
//   Hero — URL paste input + live progress demo
//   ReportShowcase — embedded sample report preview
//   ReportsSection — the four report mode cards
//   CoverageSection — feature grid (6 tiles)
//   SunScoutSection — SunScout teaser with bar chart
//   HowSection — 3-step explainer
//   PricingSection — 4 tiers with monthly/yearly toggle
//   FAQSection — accordion
//   CTASection — dark full-bleed CTA
//   Footer

import { useCallback, useEffect, useRef, useState } from 'react'

import { Nav } from '../components/shared/Nav'
import { Footer } from '../components/shared/Footer'
import { SignInModal } from '../components/shared/SignInModal'
import { ModeModal } from '../components/shared/ModeModal'
import { Chip } from '../components/shared/Chip'
import { Icon } from '../components/shared/Icon'
import { ScoutMark } from '../components/shared/ScoutMark'
import { DealScore } from '../components/analysis/DealScore'
import { AIVerdictBlock } from '../components/analysis/AIVerdictBlock'
import { MiniMap } from '../components/analysis/MiniMap'
import { RentalCompsBar } from '../components/analysis/RentalCompsBar'
import { RiskRow } from '../components/analysis/RiskRow'

import { validateUrl, detectListingKind } from '../lib/validateUrl'
import type { UrlValidationResult } from '../lib/validateUrl'
import type { ReportMode } from '../types/analysis'
import type { ListingPreviewData } from '../components/shared/ModeModal'

// ── Dark mode hook ────────────────────────────────────────────────

function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(false)
  const toggle = useCallback(() => {
    setDark((d) => {
      const next = !d
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      return next
    })
  }, [])
  return [dark, toggle]
}

// ── Sample listings ───────────────────────────────────────────────

interface SampleListing {
  key: string
  label: string
  url: string
  pretty: string
}

const SAMPLE_LISTINGS: SampleListing[] = [
  {
    key: 'toronto',
    label: 'Toronto rental',
    url: 'https://www.realtor.ca/real-estate/27905412/unit-3705-28-charles-st-e-toronto-for-rent',
    pretty: '… / listing / 27905412 / unit-3705 · 28 charles st e · toronto',
  },
  {
    key: 'hamilton',
    label: 'Hamilton duplex',
    url: 'https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton',
    pretty: '… / listing / 27619830 / 146 east 19th st · hamilton',
  },
]

// The mock listing preview data shown in the modal after "Analyze" finishes
const SAMPLE_LISTING_PREVIEW: ListingPreviewData = {
  kind: 'rent',
  address: 'Unit 3705 · 28 Charles St E, Toronto ON',
  price: '$2,150/mo',
  beds: '1+den · 1 bath',
  sqft: '~620 sqft',
  extra: '37th flr',
}

type AnalysisStage = 'idle' | 'scraping' | 'done' | 'error'

// ── Section header shared component ──────────────────────────────

interface SectionHeaderProps {
  tag: string
  title: React.ReactNode
  children: React.ReactNode
}

function SectionHeader({ tag, title, children }: SectionHeaderProps): JSX.Element {
  return (
    <div className="col gap-16" style={{ maxWidth: 680 }}>
      <span className="section-tag">{tag}</span>
      <h2 className="serif" style={{ margin: 0 }}>
        {title}
      </h2>
      <p style={{ fontSize: 17, color: 'var(--ink-2)' }}>{children}</p>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────

interface HeroProps {
  onAnalyze: (url: string, result: UrlValidationResult) => void
  onSignIn: () => void
}

function Hero({ onAnalyze, onSignIn }: HeroProps): JSX.Element {
  const [sampleIdx, setSampleIdx] = useState(0)
  const [url, setUrl] = useState(SAMPLE_LISTINGS[0].url)
  const [stage, setStage] = useState<AnalysisStage>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTick = (): void => {
    if (tickRef.current != null) clearInterval(tickRef.current)
  }

  useEffect(() => () => clearTick(), [])

  const runAnalysis = useCallback(
    (overrideUrl?: string) => {
      const target = overrideUrl ?? url
      const validation = validateUrl(target)

      if (!validation.valid) {
        setStage('error')
        setErrorMsg(validation.message)
        return
      }

      clearTick()
      setStage('scraping')
      setErrorMsg('')
      setProgress(0)

      let p = 0
      tickRef.current = setInterval(() => {
        p += 14
        setProgress(Math.min(p, 100))
        if (p >= 100) {
          clearTick()
          setTimeout(() => {
            setStage('done')
            onAnalyze(target, validation)
          }, 250)
        }
      }, 180)
    },
    [url, onAnalyze]
  )

  const pickSample = (i: number): void => {
    setSampleIdx(i)
    setUrl(SAMPLE_LISTINGS[i].url)
    setStage('idle')
    setErrorMsg('')
    setTimeout(() => runAnalysis(SAMPLE_LISTINGS[i].url), 60)
  }

  const scrapeSteps: [string, boolean][] = [
    ['Found listing · Unit 3705 · 28 Charles St E, Toronto', progress > 10],
    ['Asking $2,150/mo · 1+den · 1 bath · ~620 sqft', progress > 25],
    ['Heat, water included · Hydro & parking extra', progress > 45],
    ['Pulling 12 rental comps in this building & FSA', progress > 65],
    ['Checking listing accuracy · scanning description', progress > 85],
    ['Generating Scout AI verdict', progress > 95],
  ]

  return (
    <section
      id="hero"
      style={{ paddingTop: 60, paddingBottom: 'clamp(56px, 7vw, 96px)', overflow: 'hidden' }}
    >
      <div className="container col gap-32">
        {/* Headline */}
        <div className="col" style={{ maxWidth: 1100 }}>
          <div className="row gap-12" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
            <span className="chip" style={{ background: 'transparent' }}>
              <span
                className="live-dot"
                style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }}
              />
              Live in Ontario · 2,400 listings analyzed last week
            </span>
            <span className="chip">v0.9 · MVP preview</span>
          </div>

          <h1 className="serif" style={{ textWrap: 'balance', maxWidth: 1100, marginBottom: 22 }}>
            Know what any Canadian listing
            <br />
            is <em style={{ color: 'var(--accent)' }}>really</em> worth — before you sign.
          </h1>

          <p style={{ fontSize: 'clamp(17px, 1.4vw, 21px)', maxWidth: 720, color: 'var(--ink-2)' }}>
            Paste any listing. Whether you're renting, buying a home, hunting an investment, or
            pricing out your own unit — PropScout returns a full, plain-English report in under
            sixty seconds. Comps, costs, risks, sun path, and a written verdict. Canadian rules.
            Real money.
          </p>
        </div>

        {/* URL input card */}
        <div
          className="col gap-24"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 22,
            padding: 'clamp(20px, 2.4vw, 28px)',
            boxShadow: 'var(--shadow-pop)',
            marginTop: 8,
          }}
        >
          <div className="row gap-16" style={{ flexWrap: 'wrap' }}>
            {/* Input shell */}
            <div
              className="hero-input-shell row"
              style={{
                flex: '1 1 480px',
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: '14px 16px',
                gap: 12,
                minWidth: 0,
                transition: 'border-color .15s ease, background-color .15s ease',
              }}
            >
              <Icon name="link" size={18} />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runAnalysis()
                }}
                placeholder="Paste a listing URL"
                aria-label="Listing URL"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 13,
                  color: 'var(--ink)',
                  minWidth: 0,
                }}
              />
              <button
                onClick={() => {
                  navigator.clipboard
                    ?.readText()
                    .then((v) => {
                      if (v) setUrl(v)
                    })
                    .catch(() => undefined)
                }}
                className="btn btn-ghost"
                style={{ padding: '6px 10px', fontSize: 11 }}
                title="Paste from clipboard"
                aria-label="Paste from clipboard"
              >
                <Icon name="paste" size={12} /> Paste
              </button>
            </div>

            {/* CTA */}
            <button
              className="btn btn-primary"
              onClick={() => runAnalysis()}
              style={{ padding: '14px 22px', fontSize: 15, flexShrink: 0 }}
            >
              {stage === 'idle' ? 'Analyze' : stage === 'scraping' ? 'Working…' : 'Open report'}
              <Icon name="arrow" size={15} />
            </button>
          </div>

          {/* Idle hint strip */}
          {stage === 'idle' && (
            <div
              className="row gap-24"
              style={{
                flexWrap: 'wrap',
                color: 'var(--muted)',
                fontSize: 13,
                alignItems: 'center',
              }}
            >
              <div className="row gap-8">
                <Icon name="dot" size={10} /> Free preview · no sign-in
              </div>
              <div className="row gap-8">
                <Icon name="dot" size={10} /> No login required for tenant reports
              </div>
              <div
                className="row gap-8"
                style={{ marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
              >
                <span>Try one of ours →</span>
                {SAMPLE_LISTINGS.map((s, i) => (
                  <span key={s.key} className="row gap-8">
                    {i > 0 && <span style={{ color: 'var(--line-strong)' }}>·</span>}
                    <button
                      onClick={() => pickSample(i)}
                      className="mono"
                      style={{
                        color: i === sampleIdx ? 'var(--accent)' : 'var(--ink-2)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        padding: 0,
                        textDecoration: i === sampleIdx ? 'underline' : 'none',
                        textUnderlineOffset: 4,
                        fontFamily: 'inherit',
                      }}
                    >
                      {s.label}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scraping state */}
          {stage === 'scraping' && (
            <div className="col gap-12">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Scraping listing · {progress}%
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  ~12s remaining
                </div>
              </div>
              <div
                style={{
                  height: 3,
                  background: 'var(--line)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    transition: 'width .2s ease',
                  }}
                />
              </div>
              <div className="col gap-8" style={{ marginTop: 8 }}>
                {scrapeSteps.map(([txt, on], i) => (
                  <div
                    key={i}
                    className="row gap-12"
                    style={{ fontSize: 13, opacity: on ? 1 : 0.35, transition: 'opacity .2s' }}
                  >
                    <span style={{ color: on ? 'var(--pass)' : 'var(--muted)' }}>
                      <Icon name={on ? 'check' : 'dot'} size={13} />
                    </span>
                    <span style={{ color: on ? 'var(--ink)' : 'var(--muted)' }}>{txt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {stage === 'error' && (
            <div
              className="row gap-12"
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'color-mix(in oklab, var(--fail) 8%, transparent)',
                border: '1px solid color-mix(in oklab, var(--fail) 35%, transparent)',
                color: 'var(--fail)',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ marginTop: 2, flexShrink: 0 }}>
                <Icon name="flag" size={16} />
              </div>
              <div className="col grow" style={{ gap: 4 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Not a usable link</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{errorMsg}</div>
              </div>
              <button
                onClick={() => {
                  setStage('idle')
                  setErrorMsg('')
                }}
                className="btn btn-ghost"
                style={{ flexShrink: 0, padding: '6px 12px', fontSize: 12 }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Done state — mini report preview */}
          {stage === 'done' && (
            <div
              className="row gap-16"
              style={{
                padding: 16,
                borderRadius: 14,
                background: 'var(--bg-elev)',
                border: '1px solid var(--line)',
              }}
            >
              <DealScore score={58} size={88} animate label="" />
              <div className="col grow gap-4" style={{ justifyContent: 'center' }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--caution)',
                  }}
                >
                  Negotiate first · tenant view
                </div>
                <div className="serif" style={{ fontSize: 22, lineHeight: 1.2 }}>
                  Asking $2,150/mo · target $1,950–2,000
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                  The "second bedroom" is a glass-door den. You have strong leverage.{' '}
                  <button
                    onClick={onSignIn}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--accent)',
                      fontWeight: 500,
                      fontSize: 13,
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                      textDecorationThickness: '1px',
                      fontFamily: 'inherit',
                    }}
                  >
                    Read full verdict →
                  </button>
                </div>
              </div>
              <button
                onClick={() => setStage('idle')}
                className="btn btn-ghost"
                style={{ flexShrink: 0 }}
              >
                Try another
              </button>
            </div>
          )}
        </div>

        {/* Embedded sample report showcase */}
        <ReportShowcase onSignIn={onSignIn} />

        {/* Trust / data source marquee */}
        <div className="col gap-16" style={{ marginTop: 24 }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            Built on the data Canadian investors already trust
          </span>
          <div
            style={{
              overflow: 'hidden',
              maskImage: 'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent, black 12%, black 88%, transparent)',
            }}
          >
            <div className="marquee-track">
              {[0, 1].map((k) => (
                <span key={k} className="row gap-32" style={{ gap: 56 }}>
                  {[
                    'Realtor.ca',
                    'Zillow.ca',
                    'Rentals.ca',
                    'Kijiji',
                    'PadMapper',
                    'CMHC',
                    'Statistics Canada',
                    'Bank of Canada',
                    'EQAO',
                    'Fraser Institute',
                    'Walk Score',
                    'Mapbox',
                    'NREL · SPA',
                  ].map((n) => (
                    <span
                      key={n + k}
                      className="serif"
                      style={{ fontSize: 22, color: 'var(--muted)', whiteSpace: 'nowrap' }}
                    >
                      {n}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── ReportShowcase ────────────────────────────────────────────────

function ReportShowcase({ onSignIn }: { onSignIn: () => void }): JSX.Element {
  return (
    <div
      className="card"
      style={{
        overflow: 'hidden',
        marginTop: 20,
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-pop)',
      }}
    >
      {/* Browser chrome */}
      <div
        className="row"
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
          gap: 12,
          background: 'var(--bg-elev)',
        }}
      >
        <div className="row gap-8">
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#E26060' }} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#E2B660' }} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#7CB36B' }} />
        </div>
        <div
          className="row gap-8"
          style={{
            flex: 1,
            justifyContent: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            padding: '5px 12px',
            borderRadius: 8,
            maxWidth: 480,
            fontFamily: "'Geist Mono', monospace",
            fontSize: 11,
            color: 'var(--muted)',
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--pass)' }} />
          propscout.ca / report / unit-3705-28-charles-toronto
        </div>
        <div className="row gap-8">
          <Chip accent>Sample report · Tenant view</Chip>
        </div>
      </div>

      {/* Report content */}
      <div style={{ padding: 'clamp(20px, 2.4vw, 32px)' }}>
        {/* Property header */}
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div className="col gap-12">
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <Chip accent>For rent</Chip>
              <Chip>Toronto · M4Y</Chip>
              <Chip>1+den · 620 sqft · 37th flr</Chip>
              <Chip>Heat & water included</Chip>
            </div>
            <h3
              className="serif"
              style={{ fontSize: 36, lineHeight: 1.05, letterSpacing: '-0.025em' }}
            >
              Unit 3705 · 28 Charles Street East
            </h3>
            <div
              className="row gap-16"
              style={{ color: 'var(--muted)', fontSize: 14, flexWrap: 'wrap' }}
            >
              <span>
                <span className="serif tabular" style={{ color: 'var(--ink)' }}>
                  $2,150
                </span>
                /mo asking
              </span>
              <span>·</span>
              <span>1+den · 1 bath</span>
              <span>·</span>
              <span>Parking $150/mo extra</span>
              <span>·</span>
              <span>Available March 1</span>
            </div>
          </div>
          <div className="row gap-12">
            <button className="btn btn-ghost">
              <Icon name="link" size={14} /> Share link
            </button>
            <button className="btn btn-primary" onClick={onSignIn}>
              Save report <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 22 }}>
          {/* Left column */}
          <div className="col" style={{ gap: 22 }}>
            <AIVerdictBlock
              addr="Unit 3705 · 28 Charles St E, Toronto ON"
              headline={
                <>
                  Do not sign at <span style={{ color: 'var(--accent)' }}>$2,150</span>. The room
                  marketed as a second bedroom is a den with a sliding glass door — no privacy, no
                  sound barrier, and almost certainly no exterior window. You are being asked to pay
                  a 2-bedroom premium for a 1-bedroom with a study.
                </>
              }
              sub={
                <>
                  Your negotiation target is{' '}
                  <span className="tabular" style={{ color: 'var(--accent)' }}>
                    $1,950–2,000
                  </span>
                  /mo. There are 14 competing rentals in this building right now and the unit has
                  been listed for 22 days — you have leverage. Before you go back, confirm in
                  writing whether the den has a window and whether parking is included.
                </>
              }
              onReadMore={onSignIn}
            />

            {/* Rent positioning */}
            <div className="card col gap-20" style={{ padding: 24 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h4
                  className="serif"
                  style={{ fontSize: 22, whiteSpace: 'nowrap', paddingRight: 8 }}
                >
                  Rent positioning
                </h4>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  14 building comps · 22 nearby · 90d
                </span>
              </div>
              <MiniMap
                height={200}
                address="Toronto · M4Y · 1km radius"
                pins={[
                  { x: 18, y: 42, n: '$1,950' },
                  { x: 70, y: 24, n: '$2,100' },
                  { x: 34, y: 64, n: '$1,900' },
                  { x: 76, y: 68, n: '$2,250' },
                  { x: 58, y: 78, n: '$2,000' },
                ]}
              />
              <RentalCompsBar low={1800} mid={1950} high={2300} ask={2150} />
            </div>

            {/* Listing accuracy */}
            <div className="card col gap-12" style={{ padding: 24 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h4 className="serif" style={{ fontSize: 22 }}>
                  Listing accuracy
                </h4>
                <span
                  className="chip"
                  style={{
                    background: 'color-mix(in oklab, var(--caution) 10%, transparent)',
                    borderColor: 'color-mix(in oklab, var(--caution) 30%, transparent)',
                    color: 'var(--caution)',
                  }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--caution)' }}
                  />
                  2 flags · 1 confirmation
                </span>
              </div>
              <RiskRow
                tone="red"
                label="Possible non-bedroom"
                detail="Description mentions 'sliding glass door' — may not be a private, code-compliant second bedroom"
              />
              <RiskRow
                tone="amber"
                label="Parking status unclear"
                detail="Listing reads 'contact manager' — confirm cost and availability before signing"
              />
              <RiskRow
                tone="good"
                label="Utilities · confirmed"
                detail="Heat and water included by landlord · hydro & internet are tenant-paid"
              />
            </div>
          </div>

          {/* Right column */}
          <div className="col" style={{ gap: 22 }}>
            {/* Scorecard */}
            <div className="card col" style={{ padding: 24, gap: 16, alignItems: 'center' }}>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Scout tenant score
              </span>
              <DealScore score={58} size={196} label="Tenant score / 100" />
              <div className="divider" style={{ margin: '4px 0' }} />
              <div className="col gap-8" style={{ width: '100%' }}>
                {(
                  [
                    ['Rent vs market', '12 / 25', 0.48],
                    ['Listing honesty', '6 / 20', 0.3],
                    ['Cost transparency', '14 / 20', 0.7],
                    ['Negotiation leverage', '18 / 20', 0.9],
                    ['Building demand', '8 / 15', 0.53],
                  ] as [string, string, number][]
                ).map(([lbl, val, pct]) => (
                  <div key={lbl} className="col gap-4">
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--ink-2)' }}>{lbl}</span>
                      <span className="mono tabular" style={{ color: 'var(--muted)' }}>
                        {val}
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 999, background: 'var(--line)' }}>
                      <div
                        style={{
                          width: `${pct * 100}%`,
                          height: '100%',
                          borderRadius: 999,
                          background:
                            pct > 0.6
                              ? 'var(--pass)'
                              : pct > 0.3
                                ? 'var(--caution)'
                                : 'var(--fail)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Negotiation */}
            <div className="card col gap-12" style={{ padding: 22 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Negotiation
                </div>
                <span
                  className="chip"
                  style={{
                    background: 'color-mix(in oklab, var(--pass) 10%, transparent)',
                    borderColor: 'color-mix(in oklab, var(--pass) 30%, transparent)',
                    color: 'var(--pass)',
                  }}
                >
                  Strong leverage
                </span>
              </div>
              <div className="serif tabular" style={{ fontSize: 26, lineHeight: 1.1 }}>
                Target $1,950–2,000
                <span style={{ color: 'var(--muted)', fontSize: 14 }}>/mo</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Save up to{' '}
                <span className="tabular" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                  $2,400
                </span>{' '}
                over a 12-month lease.
              </div>
              <div className="divider" />
              <div className="col gap-6">
                {(
                  [
                    ['Competing in building', '14 listings'],
                    ['Days on market', '22 days'],
                    ['Price drops', '1 · −$50 last week'],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div
                    key={k}
                    className="row"
                    style={{ justifyContent: 'space-between', fontSize: 12 }}
                  >
                    <span style={{ color: 'var(--muted)' }}>{k}</span>
                    <span className="mono tabular" style={{ color: 'var(--ink)' }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly cost */}
            <div className="card col gap-12" style={{ padding: 22 }}>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                True monthly cost
              </div>
              <div className="col gap-8">
                {(
                  [
                    ['Rent · at asking', '$2,150', false, ''],
                    ['Hydro · est.', '$65', false, ''],
                    ['Internet', '$70', false, ''],
                    ['Parking', '$150', false, ''],
                    ['Total at asking', '$2,435', true, ''],
                    ['Total at target', '$2,235', true, 'pass'],
                  ] as [string, string, boolean, string][]
                ).map(([k, v, bold, tone]) => (
                  <div
                    key={k}
                    className="row"
                    style={{
                      justifyContent: 'space-between',
                      fontSize: bold ? 13 : 12,
                      color: tone === 'pass' ? 'var(--pass)' : 'var(--ink-2)',
                      paddingTop: bold ? 6 : 0,
                      borderTop:
                        bold && k.startsWith('Total at asking') ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        color: bold
                          ? tone === 'pass'
                            ? 'var(--pass)'
                            : 'var(--ink)'
                          : 'var(--muted)',
                        fontWeight: bold ? 500 : 400,
                      }}
                    >
                      {k}
                    </span>
                    <span className="mono tabular" style={{ fontWeight: bold ? 600 : 500 }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ReportsSection ────────────────────────────────────────────────

const REPORT_MODES = [
  {
    who: 'Tenant',
    tag: 'For rent',
    title: "I'm looking at a rental",
    copy: "Free, no login. Flags fake bedrooms, basement units, missing parking, and overpriced asks. Tells you exactly where to negotiate to — and saves you the deposit on a unit that wasn't what it said it was.",
    stats: [
      { lbl: 'Asking', val: '$2,150', tone: '' },
      { lbl: 'Fair range', val: '$1,950–2,000', tone: 'pass' },
      { lbl: 'Leverage', val: 'Strong', tone: 'pass' },
    ],
    photoLabel: 'rental unit · downtown',
    tag2: 'Free forever',
  },
  {
    who: 'Personal buyer',
    tag: 'For sale',
    title: "I'm buying a home to live in",
    copy: 'True monthly cost of ownership, comparable sales, walk/transit, school catchments. The home you can live in, not just close on.',
    stats: [
      { lbl: 'Monthly cost', val: '$4,733', tone: '' },
      { lbl: 'FMV band', val: '$695–745k', tone: 'pass' },
      { lbl: 'School rank', val: 'Top 8%', tone: 'pass' },
    ],
    photoLabel: 'detached · suburban',
  },
  {
    who: 'Investor',
    tag: 'For sale',
    title: "I'm running it as a rental",
    copy: 'Cap rate, cash flow, DSCR, OSFI stress test, Ontario LTT, and our 0–100 deal score — modelled for Canadian rules, not bolted on.',
    stats: [
      { lbl: 'Cap rate', val: '4.8%', tone: 'pass' },
      { lbl: 'Cash flow', val: '−$1,833', tone: 'fail' },
      { lbl: 'DSCR', val: '0.45×', tone: 'fail' },
    ],
    photoLabel: 'condo · downtown core',
  },
  {
    who: 'Landlord',
    tag: 'For rent',
    title: "I'm pricing out my own unit",
    copy: 'Test whether your listed rent pencils against the building, the FSA, and the trend line — before you sign a year-long lease at the wrong number.',
    stats: [
      { lbl: 'Yield', val: '5.2%', tone: 'pass' },
      { lbl: 'Vs. market', val: '+ $50', tone: 'pass' },
      { lbl: 'Building supply', val: '24 listings', tone: 'caution' },
    ],
    photoLabel: 'low-rise · duplex',
  },
]

function ReportsSection(): JSX.Element {
  return (
    <section id="reports" className="container" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
      <div className="col gap-32">
        <SectionHeader
          tag="One URL · the report adapts to you"
          title={
            <>
              Whoever you are,{' '}
              <span className="serif" style={{ color: 'var(--muted)' }}>
                <em>we ask once.</em>
              </span>
            </>
          }
        >
          PropScout auto-detects whether your listing is for sale or for rent, then asks one routing
          question. Every section, calculation, and verdict downstream is tailored to that answer.
        </SectionHeader>

        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 22, marginTop: 24 }}
        >
          {REPORT_MODES.map((m) => (
            <article
              key={m.title}
              className="card"
              style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div className="photo-ph" style={{ height: 180, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 14, left: 14 }} className="row gap-8">
                  <span className="chip" style={{ background: 'var(--surface)' }}>
                    {m.tag}
                  </span>
                  {m.tag2 && (
                    <span
                      className="chip"
                      style={{
                        background: 'var(--accent)',
                        color: 'var(--accent-ink)',
                        borderColor: 'var(--accent)',
                      }}
                    >
                      {m.tag2}
                    </span>
                  )}
                </div>
                <span>{m.photoLabel}</span>
              </div>

              <div className="col gap-16" style={{ padding: '24px 24px 26px' }}>
                <div className="col gap-8">
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                    }}
                  >
                    For the {m.who.toLowerCase()}
                  </div>
                  <h3 className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>
                    {m.title}
                  </h3>
                </div>
                <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 480 }}>{m.copy}</p>

                <div className="row gap-12" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                  {m.stats.map(({ lbl, val, tone }) => (
                    <div
                      key={lbl}
                      className="col gap-8"
                      style={{
                        flex: '1 1 0',
                        minWidth: 90,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'var(--bg-elev)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <div
                        className="mono"
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--muted)',
                        }}
                      >
                        {lbl}
                      </div>
                      <div
                        className="serif tabular"
                        style={{
                          fontSize: 22,
                          lineHeight: 1,
                          color:
                            tone === 'pass'
                              ? 'var(--pass)'
                              : tone === 'caution'
                                ? 'var(--caution)'
                                : tone === 'fail'
                                  ? 'var(--fail)'
                                  : 'var(--ink)',
                        }}
                      >
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CoverageSection ───────────────────────────────────────────────

const COVERAGE_FEATURES = [
  {
    icon: 'shield' as const,
    t: 'Risk flags, not vibes',
    d: 'Ontario rent control, condo-fee burden, flood overlays, basement-bedroom heuristics, supply pressure — each flag with a deduction, source, and override.',
  },
  {
    icon: 'map' as const,
    t: 'Live rental comps',
    d: 'Nightly scrape of Rentals.ca, Kijiji and PadMapper. Same FSA, ±1 bedroom, last 90 days. Outliers removed. Confidence shown.',
  },
  {
    icon: 'chart' as const,
    t: 'Canadian rules baked in',
    d: 'OSFI stress test, Ontario LTT with Toronto stack, CMHC vacancy by city, Bank of Canada rate feed. No US tools pretending.',
  },
  {
    icon: 'house' as const,
    t: 'Schools that matter',
    d: 'EQAO scores, Fraser Institute percentile, catchment overlays for TDSB and the major Ontario boards. Drive time, not crow flies.',
  },
  {
    icon: 'sun' as const,
    t: 'SunScout · light score',
    d: 'NREL sun-path math, window by window, month by month. Building obstruction in dense cores on Investor Pro.',
  },
  {
    icon: 'doc' as const,
    t: 'Share or export',
    d: 'Branded PDF, 30-day shareable link, save to portfolio. Your clients see the verdict without seeing the seams.',
  },
]

function CoverageSection(): JSX.Element {
  return (
    <section className="container" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
      <div className="col gap-32">
        <SectionHeader
          tag="Inside the report"
          title={
            <>
              The work an analyst does in a morning{' '}
              <span className="serif" style={{ color: 'var(--muted)' }}>
                <em>— in the time it takes to make coffee.</em>
              </span>
            </>
          }
        >
          Each section pulls from a different source, then writes itself into the report in the same
          vocabulary. No tabs to remember, no copy-paste to spreadsheets.
        </SectionHeader>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            borderTop: '1px solid var(--line)',
            borderLeft: '1px solid var(--line)',
          }}
        >
          {COVERAGE_FEATURES.map((f) => (
            <div
              key={f.t}
              className="col gap-12"
              style={{
                padding: '28px 26px',
                borderRight: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div style={{ color: 'var(--accent)' }}>
                <Icon name={f.icon} size={22} stroke={1.4} />
              </div>
              <h3 className="serif" style={{ fontSize: 22, lineHeight: 1.1 }}>
                {f.t}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── SunScoutSection ───────────────────────────────────────────────

const SUNSCOUT_MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const SUNSCOUT_HOURS = [62, 78, 110, 138, 168, 184, 188, 168, 132, 96, 64, 52]
const SUNSCOUT_MAX = Math.max(...SUNSCOUT_HOURS)

function SunScoutSection(): JSX.Element {
  return (
    <section id="sunscout" className="container" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
      <div
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(36px, 5vw, 64px)',
          display: 'grid',
          gridTemplateColumns: '1.05fr 1fr',
          gap: 'clamp(32px, 5vw, 72px)',
          alignItems: 'center',
        }}
      >
        {/* Left — copy */}
        <div className="col">
          <span className="section-tag" style={{ marginBottom: 24 }}>
            SunScout™
          </span>
          <h2 className="serif" style={{ textWrap: 'balance', marginBottom: 24 }}>
            How much light <em style={{ color: 'var(--accent)' }}>actually</em> reaches each window
            — by hour, by month, every season.
          </h2>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', marginBottom: 28 }}>
            We run NREL's solar position algorithm against the property's coordinates, then weight
            by window orientation and surrounding obstructions. The result is a single light score,
            plus a seasonal arc you can show a tenant before they sign.
          </p>
          <div className="row gap-16" style={{ flexWrap: 'wrap' }}>
            <Chip accent>South-facing · 6.2hr/day avg</Chip>
            <Chip>14th floor</Chip>
            <Chip>No tall neighbours within 100m</Chip>
          </div>
        </div>

        {/* Right — visuals */}
        <div className="col gap-16">
          {/* Score gauge */}
          <div className="card row gap-24" style={{ padding: 24, alignItems: 'center' }}>
            <div className="col gap-8" style={{ alignItems: 'center' }}>
              <DealScore score={84} size={130} animate={false} label="" showVerdict={false} />
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Light score / 100
              </div>
            </div>
            <div className="col gap-12" style={{ flex: 1 }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Annual direct sun · weighted
              </div>
              <div className="serif tabular" style={{ fontSize: 36, lineHeight: 1 }}>
                1,512 <span style={{ color: 'var(--muted)', fontSize: 16 }}> hrs / yr</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                Bedroom (S){' '}
                <span className="mono tabular" style={{ marginLeft: 8 }}>
                  1,140h
                </span>{' '}
                · Living (W){' '}
                <span className="mono tabular" style={{ marginLeft: 8 }}>
                  720h
                </span>
              </div>
            </div>
          </div>

          {/* Monthly bar chart */}
          <div className="card col gap-16" style={{ padding: 24 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Hours of direct sun · 2026
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>
                S · 180°
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
              {SUNSCOUT_HOURS.map((h, i) => (
                <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${(h / SUNSCOUT_MAX) * 64}px`,
                      background:
                        i >= 4 && i <= 7
                          ? 'var(--accent)'
                          : 'color-mix(in oklab, var(--accent) 35%, transparent)',
                      borderRadius: 3,
                    }}
                  />
                  <span className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>
                    {SUNSCOUT_MONTHS[i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── HowSection ────────────────────────────────────────────────────

function StepVisual({ kind }: { kind: 'urlbar' | 'modal' | 'report' }): JSX.Element {
  if (kind === 'urlbar') {
    return (
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 12,
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 12,
        }}
      >
        <Icon name="link" size={14} />
        <span style={{ color: 'var(--muted)' }}>
          … / listing / <span style={{ color: 'var(--ink)' }}>28145902</span> / vaughan-condo
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            fontSize: 10,
            padding: '4px 8px',
            borderRadius: 6,
            letterSpacing: '0.08em',
          }}
        >
          ↵ ANALYZE
        </span>
      </div>
    )
  }

  if (kind === 'modal') {
    return (
      <div
        className="col gap-8"
        style={{
          padding: 16,
          borderRadius: 12,
          background: 'var(--bg-elev)',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--ink)' }}>
          For-sale listing detected — what's this for?
        </div>
        <div className="row gap-8">
          <button
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: 12, flex: 1 }}
          >
            Investment
          </button>
          <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12, flex: 1 }}>
            Personal use
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="row gap-12"
      style={{
        padding: 14,
        borderRadius: 12,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
      }}
    >
      <DealScore score={78} size={64} animate={false} label="" showVerdict={false} />
      <div className="col" style={{ gap: 4, justifyContent: 'center' }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Verdict
        </div>
        <div className="serif" style={{ fontSize: 14, color: 'var(--ink)' }}>
          Good deal — proceed with standard due diligence.
        </div>
      </div>
    </div>
  )
}

const HOW_STEPS: { n: string; t: string; d: string; visual: 'urlbar' | 'modal' | 'report' }[] = [
  {
    n: '01',
    t: 'Paste any URL',
    d: 'Any Canadian listing URL. We read price, beds, taxes, condo fees, year built, photos — everything the listing exposes, structured.',
    visual: 'urlbar',
  },
  {
    n: '02',
    t: 'Tell us your angle',
    d: 'One question, two buttons. Investment or personal use. Tenant or landlord. The entire report adapts in place.',
    visual: 'modal',
  },
  {
    n: '03',
    t: 'Read the verdict',
    d: 'Numbers, comps, risk flags, schools, sun path, and a written verdict from Scout AI. Under sixty seconds, every time.',
    visual: 'report',
  },
]

function HowSection(): JSX.Element {
  return (
    <section id="how" className="container" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
      <div className="col gap-32">
        <SectionHeader
          tag="How it works"
          title={
            <>
              From listing URL to written verdict{' '}
              <span className="serif" style={{ color: 'var(--muted)' }}>
                <em>in under sixty seconds.</em>
              </span>
            </>
          }
        >
          No exports, no spreadsheets, no hand-keying square footage. Three steps and the report is
          on your screen, ready to share.
        </SectionHeader>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
          {HOW_STEPS.map((s, i) => (
            <div key={s.n} className="card col" style={{ padding: 24, gap: 18, minHeight: 360 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span
                  className="mono"
                  style={{ fontSize: 11, letterSpacing: '0.16em', color: 'var(--accent)' }}
                >
                  {s.n}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Step {i + 1} of 3
                </span>
              </div>
              <h3 className="serif" style={{ fontSize: 30, lineHeight: 1.05 }}>
                {s.t}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{s.d}</p>
              <div style={{ flex: 1 }} />
              <StepVisual kind={s.visual} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── PricingSection ────────────────────────────────────────────────

interface PricingTier {
  name: string
  price: number
  yearlyPrice?: number
  yearlyTotal?: number
  priceSuffix?: string
  sub: string
  cta: string
  featured?: boolean
  features: string[]
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: 0,
    sub: 'For tenants and the merely curious.',
    cta: 'Start free',
    features: [
      '3 sale-listing reports / month',
      'Unlimited tenant reports',
      'Full rental comps, confidence shown',
      'AI verdict · 1 paragraph',
      'Save your last 10 analyses',
    ],
  },
  {
    name: 'Investor Pro',
    price: 10,
    yearlyPrice: 100 / 12,
    yearlyTotal: 100,
    sub: 'For the investor running the numbers themselves.',
    cta: 'Go Pro',
    featured: true,
    features: [
      'Unlimited reports, all four modes',
      'Full 3-paragraph AI verdicts',
      'Financing sliders · OSFI, 35% down, conservative',
      'SunScout with building obstruction',
      'Portfolio tracker · up to 10 properties',
      'Branded PDF export',
    ],
  },
  {
    name: 'Professional',
    price: 59,
    yearlyPrice: 590 / 12,
    yearlyTotal: 590,
    sub: 'For agents and brokers reporting to clients.',
    cta: 'Start Professional',
    features: [
      'Everything in Investor Pro',
      'White-label PDF with your branding',
      'Shareable client links',
      'Bulk URL analysis',
      'Priority comp data refresh',
    ],
  },
  {
    name: 'Team / REIT',
    price: 299,
    priceSuffix: '+',
    sub: 'For syndicates and small REITs.',
    cta: 'Talk to us',
    features: [
      'Everything in Professional',
      '5–20+ multi-user seats',
      'Read-only API access',
      'Portfolio-level reporting',
      'Custom onboarding',
    ],
  },
]

function PricingSection(): JSX.Element {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" className="container" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
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
            title={
              <>
                Free for renters.{' '}
                <span className="serif" style={{ color: 'var(--muted)' }}>
                  <em>Real money for serious money.</em>
                </span>
              </>
            }
          >
            Cancel anytime. Annual saves two months. All prices in Canadian dollars, all tax
            inclusive.
          </SectionHeader>

          {/* Monthly / Yearly toggle */}
          <div
            className="row gap-8"
            style={{
              padding: 4,
              borderRadius: 999,
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              flexShrink: 0,
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
                  fontFamily: 'inherit',
                  transition: 'background-color .2s ease, color .2s ease',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            borderTop: '1px solid var(--line-strong)',
          }}
        >
          {PRICING_TIERS.map((tier) => {
            const displayPrice = yearly && tier.yearlyPrice != null ? tier.yearlyPrice : tier.price
            return (
              <div
                key={tier.name}
                className="col"
                style={{
                  padding: '30px 26px',
                  background: tier.featured ? 'var(--ink)' : 'transparent',
                  color: tier.featured ? 'var(--bg)' : 'var(--ink)',
                  borderRight: '1px solid var(--line)',
                  borderBottom: '1px solid var(--line)',
                  position: 'relative',
                  gap: 18,
                }}
              >
                {/* Most chosen badge */}
                {tier.featured && (
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

                <div className="col gap-8" style={{ marginTop: tier.featured ? 14 : 0 }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: tier.featured ? 'rgba(255,255,255,0.55)' : 'var(--muted)',
                    }}
                  >
                    {tier.name}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: tier.featured ? 'rgba(255,255,255,0.75)' : 'var(--ink-2)',
                    }}
                  >
                    {tier.sub}
                  </p>
                </div>

                <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
                  <span className="serif tabular" style={{ fontSize: 56, lineHeight: 1 }}>
                    ${Math.round(displayPrice)}
                    {tier.priceSuffix ?? ''}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: tier.featured ? 'rgba(255,255,255,0.5)' : 'var(--muted)',
                    }}
                  >
                    {tier.priceSuffix === '+' ? '/ mo base' : '/ mo'}
                  </span>
                </div>

                {tier.yearlyTotal != null && yearly && (
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: tier.featured ? 'rgba(255,255,255,0.55)' : 'var(--muted)',
                      marginTop: -8,
                    }}
                  >
                    ${tier.yearlyTotal} billed yearly
                  </div>
                )}

                <button
                  className="btn"
                  style={{
                    background: tier.featured ? 'var(--accent)' : 'var(--ink)',
                    color: tier.featured ? 'var(--accent-ink)' : 'var(--bg)',
                    width: '100%',
                    justifyContent: 'center',
                    padding: '14px',
                  }}
                >
                  {tier.cta}
                </button>

                <div className="col gap-10" style={{ marginTop: 6 }}>
                  {tier.features.map((f) => (
                    <div
                      key={f}
                      className="row gap-8"
                      style={{
                        alignItems: 'flex-start',
                        fontSize: 13,
                        color: tier.featured ? 'rgba(255,255,255,0.85)' : 'var(--ink-2)',
                      }}
                    >
                      <span style={{ color: 'var(--accent)', marginTop: 2 }}>
                        <Icon name="check" size={14} stroke={2} />
                      </span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── FAQSection ────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Why Ontario only at launch?',
    a: 'LTT, rent control, and the comp database are all province-specific. Running Ontario rules on a BC property overstates closing costs by tens of thousands. We gate non-Ontario URLs cleanly, take your email, and notify you when BC and Alberta ship.',
  },
  {
    q: 'Where do your rental comps come from?',
    a: 'A nightly scrape of Rentals.ca, Kijiji, and PadMapper. We dedupe, geocode, and timestamp every record. The time-series database accumulates from day one — after six months, it exists nowhere else in Canada.',
  },
  {
    q: 'How accurate is the AI verdict?',
    a: 'It writes the verdict from validated structured data only — never from free-text. Numbers come from our calc engine and comps DB, then Sonnet writes the prose. We never feed raw listing descriptions into the prompt.',
  },
  {
    q: 'Can I export to PDF?',
    a: 'Yes — Investor Pro and above. The PDF is rendered from the live report HTML by headless Chrome, so what you see is exactly what your client sees. Professional tier white-labels with your branding.',
  },
  {
    q: 'Do you support short-term rentals?',
    a: 'STR legality (Toronto and Vancouver investment STR is prohibited) is flagged today. STR revenue modelling via AirDNA ships in Phase 2.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. PropScout is an analysis tool. The numbers are sourced and the methodology is published, but every decision is yours. Always confirm with a mortgage broker, lawyer, and accountant.',
  },
]

function FAQSection(): JSX.Element {
  const [open, setOpen] = useState(0)

  return (
    <section id="faq" className="container" style={{ paddingTop: 'clamp(56px, 7vw, 96px)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: 60,
          alignItems: 'flex-start',
        }}
      >
        <SectionHeader
          tag="Common questions"
          title={
            <>
              If you've already asked yourself this,{' '}
              <em className="serif" style={{ color: 'var(--muted)' }}>
                good.
              </em>
            </>
          }
        >
          Real estate is high-stakes. We over-document because you should.
        </SectionHeader>

        <div className="col" style={{ borderTop: '1px solid var(--line-strong)' }}>
          {FAQ_ITEMS.map((it, i) => (
            <div key={it.q} style={{ borderBottom: '1px solid var(--line)' }}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="row"
                style={{
                  width: '100%',
                  padding: '22px 0',
                  justifyContent: 'space-between',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--ink)',
                  fontFamily: 'inherit',
                }}
              >
                <span className="serif" style={{ fontSize: 22, lineHeight: 1.2 }}>
                  {it.q}
                </span>
                <span style={{ color: 'var(--muted)', flexShrink: 0, marginLeft: 16 }}>
                  <Icon name={open === i ? 'minus' : 'plus'} size={18} />
                </span>
              </button>
              {open === i && (
                <div style={{ paddingBottom: 22, paddingRight: 40 }}>
                  <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 640 }}>{it.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTASection ────────────────────────────────────────────────────

function CTASection(): JSX.Element {
  return (
    <section
      className="container"
      style={{ paddingTop: 'clamp(56px, 7vw, 96px)', paddingBottom: 'clamp(56px, 7vw, 96px)' }}
    >
      <div
        style={{
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(48px, 6vw, 88px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="col" style={{ maxWidth: 720, position: 'relative', zIndex: 2 }}>
          <span
            className="section-tag"
            style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}
          >
            The next listing you save
          </span>
          <h2
            className="serif"
            style={{ color: 'var(--bg)', textWrap: 'balance', marginBottom: 24 }}
          >
            Stop building the spreadsheet again.{' '}
            <em style={{ color: 'var(--accent)' }}>Paste the URL.</em>
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 18,
              maxWidth: 540,
              marginBottom: 28,
            }}
          >
            Three free analyses every month. No credit card, no demo call, no team to talk to.
            You'll know if the deal is dead in sixty seconds.
          </p>
          <div className="row gap-12">
            <a
              href="#hero"
              className="btn btn-accent"
              style={{ padding: '16px 24px', fontSize: 15 }}
            >
              Analyze a listing <Icon name="arrow" size={15} />
            </a>
            <a
              href="#pricing"
              className="btn"
              style={{
                padding: '16px 24px',
                fontSize: 15,
                background: 'transparent',
                color: 'var(--bg)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              See pricing
            </a>
          </div>
        </div>

        {/* ScoutMark watermark */}
        <div
          style={{
            position: 'absolute',
            right: -60,
            top: -30,
            opacity: 0.08,
            color: 'var(--accent)',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <ScoutMark size={460} color="var(--accent)" />
        </div>
      </div>
    </section>
  )
}

// ── LandingPage ───────────────────────────────────────────────────

export function LandingPage(): JSX.Element {
  const [dark, toggleDark] = useDarkMode()
  const [showSignIn, setShowSignIn] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalListing, setModalListing] = useState<ListingPreviewData | null>(null)

  const handleAnalyze = useCallback((_url: string, _result: UrlValidationResult) => {
    // After scraping demo completes, show the mode modal with the listing preview.
    // In production this will be populated from the real scraper response.
    setModalListing(SAMPLE_LISTING_PREVIEW)
    setShowModal(true)
  }, [])

  const handleModeSelect = useCallback((_mode: ReportMode) => {
    setShowModal(false)
    // TODO: navigate to /analyzing?url=...&mode=... once the report page is built (PR 4)
  }, [])

  // Detect listing kind from URL for modal pre-population
  const handleUrlChange = useCallback(
    (url: string) => {
      const kind = detectListingKind(url)
      if (kind != null && modalListing != null) {
        setModalListing((prev) => (prev ? { ...prev, kind } : prev))
      }
    },
    [modalListing]
  )

  // suppress unused warning — will wire in Hero once URL input is lifted
  void handleUrlChange

  return (
    <div>
      <Nav
        variant="landing"
        dark={dark}
        onToggleDark={toggleDark}
        onSignIn={() => setShowSignIn(true)}
      />

      <Hero onAnalyze={handleAnalyze} onSignIn={() => setShowSignIn(true)} />
      <ReportsSection />
      <CoverageSection />
      <SunScoutSection />
      <HowSection />
      <PricingSection />
      <FAQSection />
      <CTASection />

      <Footer />

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />

      <ModeModal
        open={showModal}
        listing={modalListing}
        onClose={() => setShowModal(false)}
        onSelect={handleModeSelect}
      />
    </div>
  )
}
