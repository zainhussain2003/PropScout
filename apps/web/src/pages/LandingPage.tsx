/**
 * LandingPage — the root route `/`.
 *
 * Sections (in order):
 *   Nav → Hero → ReportShowcase → ReportsSection → CoverageSection
 *   → SunScoutSection → HowSection → PricingSection → FAQSection
 *   → CTASection → Footer
 *   + SignInModal (global overlay)
 *   + ModeModal (shown after URL submit)
 *
 * The ReportShowcase contains static mini-visualisations of analysis
 * components (DealScore, RentalCompsBar, AIVerdictBlock, RiskRow).
 * These are display-only helpers for the landing demo; the real
 * interactive components live in apps/web/src/components/analysis/
 * and will be built in PR 4.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Nav } from '../components/shared/Nav'
import { Footer } from '../components/shared/Footer'
import { SignInModal } from '../components/shared/SignInModal'
import { Chip } from '../components/shared/Chip'
import { Icon } from '../components/shared/Icon'
import { ScoutMark } from '../components/shared/ScoutMark'
import { ModeModal } from '../components/shared/ModeModal'
import type { ListingPreviewData } from '../components/shared/ModeModal'
import { validateUrl } from '../lib/validateUrl'
import { VerdictPill } from '../components/shared/VerdictPill'
import type { ReportMode } from '../types/analysis'

// ── Helpers ──────────────────────────────────────────────────────────

function clampStr(min: number, max: number): string {
  return `clamp(${min}px, 1.4vw, ${max}px)`
}

function detectKindFromUrl(url: string): 'sale' | 'rent' {
  const lower = url.toLowerCase()
  if (
    lower.includes('/rental') ||
    lower.includes('/rentals') ||
    lower.includes('for-rent') ||
    lower.includes('for_rent')
  ) {
    return 'rent'
  }
  return 'sale'
}

// ── Static landing-demo micro-components ─────────────────────────────
// These are display-only inline visuals for the ReportShowcase.
// The real analysis components (with live data + animation) are PR 4.

interface ShowcaseDealScoreProps {
  score: number
  size: number
  label?: string
}
function ShowcaseDealScore({ score, size, label = '' }: ShowcaseDealScoreProps): JSX.Element {
  const r = (size / 2) * 0.78
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75 // 270° arc
  const gap = circ - arc
  const filled = arc * (score / 100)
  const dash = filled
  const dashOffset = arc - filled

  const stroke = score >= 65 ? 'var(--pass)' : score >= 40 ? 'var(--caution)' : 'var(--fail)'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={size * 0.065}
          strokeDasharray={`${arc} ${gap}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(135deg)', transformOrigin: '50% 50%' }}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={size * 0.065}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transform: 'rotate(135deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      {/* Score number */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <span
          className="serif tabular"
          style={{ fontSize: size * 0.285, lineHeight: 1, color: 'var(--ink)' }}
        >
          {score}
        </span>
        {label && (
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

interface ShowcaseRentalCompsBarProps {
  low: number
  mid: number
  high: number
  ask: number
}
function ShowcaseRentalCompsBar({ low, mid, high, ask }: ShowcaseRentalCompsBarProps): JSX.Element {
  const pct = (v: number): string => `${(((v - low) / (high - low)) * 100).toFixed(1)}%`
  const askPct = ((ask - low) / (high - low)) * 100
  const askColor = ask <= mid ? 'var(--pass)' : ask <= high ? 'var(--caution)' : 'var(--fail)'
  return (
    <div className="col gap-12" style={{ width: '100%' }}>
      <div style={{ position: 'relative', height: 8, borderRadius: 999 }}>
        <div
          style={{
            position: 'absolute',
            left: pct(low),
            right: `${100 - parseFloat(pct(high))}%`,
            height: '100%',
            background: 'var(--line)',
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(askPct, 96)}%`,
            transform: 'translateX(-50%)',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: askColor,
            top: -2,
            border: '2px solid var(--surface)',
          }}
        />
      </div>
      <div
        className="row"
        style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}
      >
        <span className="mono tabular">${low.toLocaleString()}</span>
        <span className="mono tabular" style={{ color: 'var(--ink)' }}>
          Market mid ${mid.toLocaleString()}
        </span>
        <span className="mono tabular">${high.toLocaleString()}</span>
      </div>
    </div>
  )
}

interface ShowcaseAIVerdictBlockProps {
  addr: string
  headline: ReactNode
  sub: ReactNode
}
function ShowcaseAIVerdictBlock({ addr, headline, sub }: ShowcaseAIVerdictBlockProps): JSX.Element {
  return (
    <div
      style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(20px, 2.4vw, 28px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: -40,
          bottom: -20,
          opacity: 0.06,
          color: 'var(--accent)',
        }}
      >
        <ScoutMark size={200} color="var(--accent)" />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Scout AI · {addr}
        </span>
        <p
          style={{
            fontSize: clampStr(14, 16),
            lineHeight: 1.6,
            color: 'var(--bg)',
            marginBottom: 12,
          }}
        >
          {headline}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{sub}</p>
      </div>
    </div>
  )
}

type RiskTone = 'red' | 'amber' | 'good'

interface ShowcaseRiskRowProps {
  tone: RiskTone
  label: string
  detail: string
}
function ShowcaseRiskRow({ tone, label, detail }: ShowcaseRiskRowProps): JSX.Element {
  const color = tone === 'red' ? 'var(--fail)' : tone === 'amber' ? 'var(--caution)' : 'var(--pass)'
  const iconName = tone === 'good' ? ('check' as const) : ('flag' as const)
  return (
    <div
      className="row gap-12"
      style={{
        padding: '10px 0',
        borderTop: '1px solid var(--line)',
        alignItems: 'flex-start',
      }}
    >
      <span style={{ color, marginTop: 2, flexShrink: 0 }}>
        <Icon name={iconName} size={14} />
      </span>
      <div className="col gap-2">
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{detail}</span>
      </div>
    </div>
  )
}

// ── SectionHeader — landing page section intro ────────────────────────

interface SectionHeaderProps {
  tag: string
  title: ReactNode
  children?: ReactNode
}
function SectionHeader({ tag, title, children }: SectionHeaderProps): JSX.Element {
  return (
    <div className="col gap-16" style={{ maxWidth: 680 }}>
      <span className="section-tag">{tag}</span>
      <h2 className="serif" style={{ textWrap: 'balance' } as React.CSSProperties}>
        {title}
      </h2>
      {children !== undefined && (
        <p style={{ fontSize: clampStr(15, 17), color: 'var(--ink-2)' }}>{children}</p>
      )}
    </div>
  )
}

// ── Sample listings ───────────────────────────────────────────────────

const SAMPLE_LISTINGS = [
  {
    key: 'toronto',
    label: 'Toronto rental',
    kind: 'rent' as const,
    url: 'https://www.realtor.ca/real-estate/27905412/unit-3705-28-charles-st-e-toronto',
    pretty: '… / listing / 27905412 / unit-3705 · 28 charles st e · toronto',
    preview: {
      kind: 'rent' as const,
      address: 'Unit 3705 · 28 Charles Street East, Toronto ON',
      price: '$2,150/mo',
      beds: '1+den · 1 bath',
      sqft: '620 sqft',
      extra: 'Heat & water incl.',
    } satisfies ListingPreviewData,
  },
  {
    key: 'hamilton',
    label: 'Hamilton duplex',
    kind: 'sale' as const,
    url: 'https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton',
    pretty: '… / listing / 27619830 / 146 east 19th st · hamilton',
    preview: {
      kind: 'sale' as const,
      address: '146 East 19th Street, Hamilton ON',
      price: '$749,900',
      beds: '4 beds · 2 baths',
      sqft: '1,620 sqft',
    } satisfies ListingPreviewData,
  },
]

// ── Hero ──────────────────────────────────────────────────────────────

type HeroStage = 'idle' | 'scraping' | 'done' | 'error'

interface HeroProps {
  onOpenModal: (listing: ListingPreviewData) => void
  onSignIn: () => void
}

function Hero({ onOpenModal, onSignIn }: HeroProps): JSX.Element {
  const [sampleIdx, setSampleIdx] = useState(0)
  const [url, setUrl] = useState(SAMPLE_LISTINGS[0].url)
  const [stage, setStage] = useState<HeroStage>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const pickSample = (i: number): void => {
    setSampleIdx(i)
    setUrl(SAMPLE_LISTINGS[i].url)
    setStage('idle')
    setErrorMsg('')
    setTimeout(() => runDemo(SAMPLE_LISTINGS[i].url), 60)
  }

  const runDemo = (overrideUrl?: string): void => {
    const target = overrideUrl !== undefined ? overrideUrl : url
    const err = validateUrl(target)
    if (err !== null) {
      setStage('error')
      setErrorMsg(err)
      return
    }
    setStage('scraping')
    setErrorMsg('')
    setProgress(0)
    let p = 0
    const tick = setInterval(() => {
      p += 14
      setProgress(Math.min(p, 100))
      if (p >= 100) {
        clearInterval(tick)
        setTimeout(() => setStage('done'), 250)
      }
    }, 180)
  }

  const handleAnalyze = (): void => {
    if (stage === 'done') {
      const sample = SAMPLE_LISTINGS[sampleIdx]
      onOpenModal({ ...sample.preview, kind: detectKindFromUrl(url), sourceUrl: url })
      return
    }
    runDemo()
  }

  const scrapeSteps = [
    ['Found listing · Unit 3705 · 28 Charles St E, Toronto', progress > 10],
    ['Asking $2,150/mo · 1+den · 1 bath · ~620 sqft', progress > 25],
    ['Heat, water included · Hydro & parking extra', progress > 45],
    ['Pulling 12 rental comps in this building & FSA', progress > 65],
    ['Checking listing accuracy · scanning description', progress > 85],
    ['Generating Scout AI verdict', progress > 95],
  ] as [string, boolean][]

  return (
    <section
      id="hero"
      style={{ paddingTop: 60, paddingBottom: 'var(--pad-y)', overflow: 'hidden' }}
    >
      <div className="container col gap-32">
        {/* Headline strip */}
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1100 }}>
          <div className="row gap-12" style={{ marginBottom: 24 }}>
            <span className="chip" style={{ background: 'transparent' }}>
              <span
                style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }}
                className="live-dot"
              />
              Live in Ontario · 2,400 listings analyzed last week
            </span>
            <span className="chip">v0.9 · MVP preview</span>
          </div>

          <h1 className="serif" style={{ textWrap: 'balance' } as React.CSSProperties}>
            Know what any Canadian listing
            <br />
            is <em style={{ color: 'var(--accent)' }}>really</em> worth — before you sign.
          </h1>

          <p
            style={{
              fontSize: clampStr(17, 21),
              maxWidth: 720,
              color: 'var(--ink-2)',
              marginTop: 22,
            }}
          >
            Paste any listing. Whether you&apos;re renting, buying a home, hunting an investment, or
            pricing out your own unit — PropScout returns a full, plain-English report in under
            sixty seconds. Comps, costs, risks, sun path, and a written verdict. Canadian rules.
            Real money.
          </p>
        </div>

        {/* Main URL input card */}
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
                  if (e.key === 'Enter') runDemo()
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
                  void navigator.clipboard
                    ?.readText()
                    .then((v) => {
                      if (v) setUrl(v)
                    })
                    .catch(() => {
                      /* clipboard permission denied */
                    })
                }}
                className="btn btn-ghost"
                style={{ padding: '6px 10px', fontSize: 11 }}
                title="Paste from clipboard"
              >
                <Icon name="paste" size={12} /> Paste
              </button>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleAnalyze}
              style={{ padding: '14px 22px', fontSize: 15, flexShrink: 0 }}
            >
              {stage === 'idle' ? 'Analyze' : stage === 'scraping' ? 'Working…' : 'Open report'}
              <Icon name="arrow" size={15} />
            </button>
          </div>

          {/* Status: idle */}
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
              <div className="row gap-8" style={{ marginLeft: 'auto', alignItems: 'center' }}>
                <span>Try one of ours →</span>
                {SAMPLE_LISTINGS.map((s, i) => (
                  <span key={s.key} className="row gap-8">
                    {i > 0 && <span>·</span>}
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
                        font: 'inherit',
                      }}
                    >
                      {s.label}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status: scraping */}
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

          {/* Status: error */}
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

          {/* Status: done — mini report preview */}
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
              <ShowcaseDealScore score={58} size={88} label="" />
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
                  The &quot;second bedroom&quot; is a glass-door den. You have strong leverage.{' '}
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
                      font: 'inherit',
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

        {/* Sample report showcase */}
        <ReportShowcase />

        {/* Trust strip */}
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
                <span key={k} style={{ display: 'contents' }}>
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
                      key={`${n}-${k}`}
                      className="serif"
                      style={{ fontSize: 22, color: 'var(--muted)', marginRight: 56 }}
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

// ── ReportShowcase ────────────────────────────────────────────────────

function ReportShowcase(): JSX.Element {
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
      {/* Browser-style top bar */}
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

      {/* Inner report content */}
      <div style={{ padding: 'clamp(20px, 2.4vw, 32px)' }}>
        {/* Header: address + tags */}
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
              <Chip>Heat &amp; water included</Chip>
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
            <button className="btn btn-primary">
              Save report <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>

        {/* Two-column report grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 22 }}>
          {/* Left column */}
          <div className="col" style={{ gap: 22 }}>
            <ShowcaseAIVerdictBlock
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
              {/* MiniMap placeholder */}
              <div
                style={{
                  height: 200,
                  borderRadius: 10,
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Toronto · M4Y · 1km radius
                </span>
              </div>
              <ShowcaseRentalCompsBar low={1800} mid={1950} high={2300} ask={2150} />
            </div>

            {/* Listing accuracy */}
            <div className="card col gap-4" style={{ padding: 24 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h4 className="serif" style={{ fontSize: 22 }}>
                  Listing accuracy
                </h4>
                <VerdictPill tone="caution" label="2 flags · 1 confirmation" />
              </div>
              <ShowcaseRiskRow
                tone="red"
                label="Possible non-bedroom"
                detail="Description mentions 'sliding glass door' — may not be a private, code-compliant second bedroom"
              />
              <ShowcaseRiskRow
                tone="amber"
                label="Parking status unclear"
                detail="Listing reads 'contact manager' — confirm cost and availability before signing"
              />
              <ShowcaseRiskRow
                tone="good"
                label="Utilities · confirmed"
                detail="Heat and water included by landlord · hydro & internet are tenant-paid"
              />
            </div>
          </div>

          {/* Right column */}
          <div className="col" style={{ gap: 22 }}>
            {/* Tenant scorecard */}
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
              <ShowcaseDealScore score={58} size={196} label="Tenant score / 100" />
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

            {/* Negotiation card */}
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
                <VerdictPill tone="pass" label="Strong leverage" />
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

            {/* True monthly cost */}
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

// ── ReportsSection ────────────────────────────────────────────────────

function ReportsSection(): JSX.Element {
  const modes = [
    {
      who: 'Tenant',
      tag: 'For rent',
      title: "I'm looking at a rental",
      copy: "Free, no login. Flags fake bedrooms, basement units, missing parking, and overpriced asks. Tells you exactly where to negotiate to — and saves you the deposit on a unit that wasn't what it said it was.",
      stats: [
        ['Asking', '$2,150', ''] as [string, string, string],
        ['Fair range', '$1,950–2,000', 'pass'] as [string, string, string],
        ['Leverage', 'Strong', 'pass'] as [string, string, string],
      ],
      tag2: 'Free forever',
    },
    {
      who: 'Personal buyer',
      tag: 'For sale',
      title: "I'm buying a home to live in",
      copy: 'True monthly cost of ownership, comparable sales, walk/transit, school catchments. The home you can live in, not just close on.',
      stats: [
        ['Monthly cost', '$4,733', ''],
        ['FMV band', '$695–745k', 'pass'],
        ['School rank', 'Top 8%', 'pass'],
      ] as [string, string, string][],
    },
    {
      who: 'Investor',
      tag: 'For sale',
      title: "I'm running it as a rental",
      copy: 'Cap rate, cash flow, DSCR, OSFI stress test, Ontario LTT, and our 0–100 deal score — modelled for Canadian rules, not bolted on.',
      stats: [
        ['Cap rate', '4.8%', 'pass'],
        ['Cash flow', '−$1,833', 'fail'],
        ['DSCR', '0.45×', 'fail'],
      ] as [string, string, string][],
      verdict: { tone: 'fail' as const, label: 'Hard pass' },
    },
    {
      who: 'Landlord',
      tag: 'For rent',
      title: "I'm pricing out my own unit",
      copy: 'Test whether your listed rent pencils against the building, the FSA, and the trend line — before you sign a year-long lease at the wrong number.',
      stats: [
        ['Yield', '5.2%', 'pass'],
        ['Vs. market', '+ $50', 'pass'],
        ['Building supply', '24 listings', 'caution'],
      ] as [string, string, string][],
    },
  ]

  return (
    <section id="reports" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
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
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 22,
            marginTop: 24,
          }}
        >
          {modes.map((m) => (
            <article
              key={m.title}
              className="card"
              style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div className="photo-ph" style={{ height: 180, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 14, left: 14 }} className="row gap-8">
                  <Chip>{m.tag}</Chip>
                  {'tag2' in m && m.tag2 !== undefined && <Chip accent>{m.tag2}</Chip>}
                </div>
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
                  {m.stats.map(([lbl, val, status]) => (
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
                            status === 'pass'
                              ? 'var(--pass)'
                              : status === 'caution'
                                ? 'var(--caution)'
                                : status === 'fail'
                                  ? 'var(--fail)'
                                  : 'var(--ink)',
                        }}
                      >
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
                {'verdict' in m && m.verdict !== undefined && (
                  <VerdictPill tone={m.verdict.tone} label={m.verdict.label} />
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── HowSection ────────────────────────────────────────────────────────

function HowSection(): JSX.Element {
  const steps = [
    {
      n: '01',
      t: 'Paste any URL',
      d: 'Any Canadian listing URL. We read price, beds, taxes, condo fees, year built, photos — everything the listing exposes, structured.',
    },
    {
      n: '02',
      t: 'Tell us your angle',
      d: 'One question, two buttons. Investment or personal use. Tenant or landlord. The entire report adapts in place.',
    },
    {
      n: '03',
      t: 'Read the verdict',
      d: 'Numbers, comps, risk flags, schools, sun path, and a written verdict from Scout AI. Under sixty seconds, every time.',
    },
  ]

  return (
    <section id="how" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 22,
          }}
        >
          {steps.map((s, i) => (
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
              {/* Step visual */}
              {s.n === '01' && (
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
                    … / listing / <span style={{ color: 'var(--ink)' }}>28145902</span> /
                    vaughan-condo
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
              )}
              {s.n === '02' && (
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
                    For-sale listing detected — what&apos;s this for?
                  </div>
                  <div className="row gap-8">
                    <button
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: 12, flex: 1 }}
                    >
                      Investment
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '8px 14px', fontSize: 12, flex: 1 }}
                    >
                      Personal use
                    </button>
                  </div>
                </div>
              )}
              {s.n === '03' && (
                <div
                  className="row gap-12"
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: 'var(--bg-elev)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <ShowcaseDealScore score={78} size={64} label="" />
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
                    <div style={{ fontSize: 14, color: 'var(--ink)' }} className="serif">
                      Good deal — proceed with standard due diligence.
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CoverageSection ───────────────────────────────────────────────────

function CoverageSection(): JSX.Element {
  const features = [
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

  return (
    <section className="container" style={{ paddingTop: 'var(--pad-y)' }}>
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
          {features.map((f) => (
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

// ── SunScoutSection ───────────────────────────────────────────────────

function SunScoutSection(): JSX.Element {
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
  const hours = [62, 78, 110, 138, 168, 184, 188, 168, 132, 96, 64, 52]
  const maxH = Math.max(...hours)

  return (
    <section id="sunscout" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="section-tag" style={{ marginBottom: 24 }}>
            SunScout™
          </span>
          <h2
            className="serif"
            style={{ textWrap: 'balance', marginBottom: 24 } as React.CSSProperties}
          >
            How much light <em style={{ color: 'var(--accent)' }}>actually</em> reaches each window
            — by hour, by month, every season.
          </h2>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', marginBottom: 28 }}>
            We run NREL&apos;s solar position algorithm against the property&apos;s coordinates,
            then weight by window orientation and surrounding obstructions. The result is a single
            light score, plus a seasonal arc you can show a tenant before they sign.
          </p>
          <div className="row gap-16" style={{ flexWrap: 'wrap' }}>
            <Chip accent>South-facing · 6.2hr/day avg</Chip>
            <Chip>14th floor</Chip>
            <Chip>No tall neighbours within 100m</Chip>
          </div>
        </div>

        <div className="col gap-16">
          {/* Light score gauge */}
          <div className="card row gap-24" style={{ padding: 24, alignItems: 'center' }}>
            <div className="col gap-8" style={{ alignItems: 'center' }}>
              <ShowcaseDealScore score={84} size={130} label="" />
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

          {/* Seasonal bar chart */}
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
              {hours.map((h, i) => (
                <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${(h / maxH) * 64}px`,
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
        </div>
      </div>
    </section>
  )
}

// ── PricingSection ────────────────────────────────────────────────────

function PricingSection(): JSX.Element {
  const [yearly, setYearly] = useState(false)

  const tiers = [
    {
      name: 'Free',
      price: 0,
      sub: 'For tenants and the merely curious.',
      cta: 'Start free',
      featured: false,
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
      price: yearly ? 100 / 12 : 10,
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
      price: yearly ? 590 / 12 : 59,
      yearlyTotal: 590,
      sub: 'For agents and brokers reporting to clients.',
      cta: 'Start Professional',
      featured: false,
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
      featured: false,
      features: [
        'Everything in Professional',
        '5–20+ multi-user seats',
        'Read-only API access',
        'Portfolio-level reporting',
        'Custom onboarding',
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
                    color: t.featured ? 'rgba(255,255,255,0.55)' : 'var(--muted)',
                  }}
                >
                  {t.name}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: t.featured ? 'rgba(255,255,255,0.75)' : 'var(--ink-2)',
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
                    color: t.featured ? 'rgba(255,255,255,0.5)' : 'var(--muted)',
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
                    color: t.featured ? 'rgba(255,255,255,0.55)' : 'var(--muted)',
                    marginTop: -8,
                  }}
                >
                  ${t.yearlyTotal} billed yearly
                </div>
              )}
              <button
                className="btn"
                style={{
                  background: t.featured ? 'var(--accent)' : 'var(--ink)',
                  color: t.featured ? 'var(--accent-ink)' : 'var(--bg)',
                  width: '100%',
                  justifyContent: 'center',
                  padding: '14px',
                }}
              >
                {t.cta}
              </button>
              <div className="col gap-10" style={{ marginTop: 6 }}>
                {t.features.map((f) => (
                  <div
                    key={f}
                    className="row gap-8"
                    style={{
                      alignItems: 'flex-start',
                      fontSize: 13,
                      color: t.featured ? 'rgba(255,255,255,0.85)' : 'var(--ink-2)',
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
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FAQSection ────────────────────────────────────────────────────────

function FAQSection(): JSX.Element {
  const items = [
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

  const [open, setOpen] = useState(-1)

  return (
    <section id="faq" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
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
              If you&apos;ve already asked yourself this,{' '}
              <em className="serif" style={{ color: 'var(--muted)' }}>
                good.
              </em>
            </>
          }
        >
          Real estate is high-stakes. We over-document because you should.
        </SectionHeader>

        <div className="col" style={{ borderTop: '1px solid var(--line-strong)' }}>
          {items.map((it, i) => (
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
                  font: 'inherit',
                }}
              >
                <span className="serif" style={{ fontSize: 22, lineHeight: 1.2 }}>
                  {it.q}
                </span>
                <span style={{ color: 'var(--muted)' }}>
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

// ── CTASection ────────────────────────────────────────────────────────

function CTASection(): JSX.Element {
  return (
    <section
      className="container"
      style={{ paddingTop: 'var(--pad-y)', paddingBottom: 'var(--pad-y)' }}
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 720,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            className="section-tag"
            style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}
          >
            The next listing you save
          </span>
          <h2
            className="serif"
            style={
              { color: 'var(--bg)', textWrap: 'balance', marginBottom: 24 } as React.CSSProperties
            }
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
            You&apos;ll know if the deal is dead in sixty seconds.
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

        {/* Decorative ScoutMark watermark */}
        <div
          style={{
            position: 'absolute',
            right: -60,
            top: -30,
            opacity: 0.08,
            color: 'var(--accent)',
          }}
        >
          <ScoutMark size={460} color="var(--accent)" />
        </div>
      </div>
    </section>
  )
}

// ── LandingPage ───────────────────────────────────────────────────────

export function LandingPage(): JSX.Element {
  const navigate = useNavigate()
  const [dark, setDark] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingListing, setPendingListing] = useState<ListingPreviewData | null>(null)

  // Apply dark mode via data-theme on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  const handleOpenModal = (listing: ListingPreviewData): void => {
    setPendingListing(listing)
    setModalOpen(true)
  }

  const handleModeSelect = (mode: ReportMode): void => {
    setModalOpen(false)
    const kind = pendingListing?.kind ?? 'sale'
    const sourceUrl = pendingListing?.sourceUrl ?? ''
    navigate(`/analyzing?mode=${mode}&kind=${kind}&url=${encodeURIComponent(sourceUrl)}`)
  }

  return (
    <>
      <Nav
        variant="landing"
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
        onSignIn={() => setShowSignIn(true)}
      />

      <main>
        <Hero onOpenModal={handleOpenModal} onSignIn={() => setShowSignIn(true)} />
        <ReportsSection />
        <CoverageSection />
        <SunScoutSection />
        <HowSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>

      <Footer />

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />

      <ModeModal
        open={modalOpen}
        listing={pendingListing}
        onClose={() => setModalOpen(false)}
        onSelect={handleModeSelect}
      />
    </>
  )
}
