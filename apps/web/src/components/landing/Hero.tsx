/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { useState } from 'react'
import { Icon } from '../shared/Icon'
import { ModeModal, type ListingPreviewData } from '../shared/ModeModal'
import { validateUrl } from '../../lib/validateUrl'
import { classifyInput } from '../../lib/classifyInput'
import {
  lookupAddress,
  startFromAddress,
  scrapeUrl,
  ApiRequestError,
  type AddressLookupResult,
} from '../../lib/services/analysisService'
import { AddressDetailsCard, type AddressDetailsValue } from '../shared/AddressDetailsCard'
import { countLabel, NOT_PROVIDED } from '../../lib/listingFacts'
import type { Listing } from '../../types/property'
import { clampStr, detectKindFromUrl } from './landingHelpers'
import { ShowcaseDealScore } from './ShowcaseDealScore'
import { SAMPLE_LISTINGS } from './sampleListings'
import { ReportShowcase } from './ReportShowcase'

// ── Hero ──────────────────────────────────────────────────────────────

type HeroStage = 'idle' | 'scraping' | 'done' | 'error'

interface HeroProps {
  onOpenModal: (listing: ListingPreviewData) => void
  onSignIn: () => void
}

export function Hero({ onOpenModal, onSignIn }: HeroProps): JSX.Element {
  const [sampleIdx, setSampleIdx] = useState(0)
  // Starts EMPTY. This used to be seeded with SAMPLE_LISTINGS[0].url, which put a
  // real (submittable) value in the primary input on first paint: the field looked
  // filled-in, clicking into it and typing appended to the existing URL and produced
  // a garbled link, and clearing it first was an undiscoverable extra step. The
  // "Try one of ours" buttons below the field already load a sample deliberately,
  // which is the honest way to offer one.
  const [url, setUrl] = useState('')
  const [stage, setStage] = useState<HeroStage>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  // A resolved address awaiting the few details only the user has (price, beds).
  const [addressResult, setAddressResult] = useState<AddressLookupResult | null>(null)

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
      // Demo path — open modal with the sample listing preview.
      const sample = SAMPLE_LISTINGS[sampleIdx]
      onOpenModal({ ...sample.preview, kind: detectKindFromUrl(url), sourceUrl: url })
      return
    }

    // One field, two kinds of input. Decide which before sending, so someone who
    // typed a perfectly good address is never told "that doesn't look like a
    // valid URL" — the message that reads as the product being broken.
    const classified = classifyInput(url)

    if (classified.kind === 'unusable') {
      setStage('error')
      setErrorMsg(classified.message ?? 'Try a listing link, or a street address.')
      return
    }

    if (classified.kind === 'address') {
      setLoading(true)
      setError(null)
      void (async () => {
        try {
          const result = await lookupAddress(classified.value)
          if (result.ok) {
            setAddressResult(result)
          } else {
            setError(
              `PropScout covers Ontario for now — that address is in ${result.province}. ` +
                "We'll let you know when we reach it."
            )
          }
        } catch (err) {
          setError(
            err instanceof ApiRequestError
              ? err.message
              : "We couldn't look that address up — try again."
          )
        } finally {
          setLoading(false)
        }
      })()
      return
    }

    // Listing-link path — validate then call the scrape API.
    const urlErr = validateUrl(url)
    if (urlErr !== null) {
      setStage('error')
      setErrorMsg(urlErr)
      return
    }

    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const result = await scrapeUrl(url)
        setToken(result.token)
        setListing(result.listing)
        setShowModal(true)
      } catch (err) {
        if (err instanceof ApiRequestError) {
          if (err.code === 'PROVINCE_NOT_SUPPORTED') {
            setError(
              "PropScout is currently Ontario-only. We'll notify you when we expand to your area."
            )
          } else if (err.code === 'SCRAPER_FAILED') {
            setError(
              'Could not read that listing — check the URL and try again, or enter the details manually.'
            )
          } else {
            // The API's error shape carries a message written for end users
            // (see apps/api/src/types/api.ts). Prefer it over a generic string —
            // "Analysis service temporarily unavailable" tells someone to wait and
            // retry; "Something went wrong" tells them nothing.
            setError(err.message || 'Something went wrong — please try again.')
          }
        } else {
          setError('Could not reach PropScout — check your connection and try again.')
        }
      } finally {
        setLoading(false)
      }
    })()
  }

  // Convert a real Listing → ListingPreviewData so ModeModal can show a preview.
  const listingPreview: ListingPreviewData | null = listing
    ? {
        kind: listing.listingType === 'for-rent' ? 'rent' : 'sale',
        address: listing.address,
        price:
          listing.listingType === 'for-sale'
            ? `$${(listing.price ?? 0).toLocaleString()}`
            : `$${(listing.rentMonthly ?? 0).toLocaleString()}/mo`,
        beds: `${countLabel(listing.beds, 'bed', { fallback: `${NOT_PROVIDED} beds` })} · ${countLabel(listing.baths, 'bath', { fallback: `${NOT_PROVIDED} baths` })}`,
        sqft: listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : '—',
      }
    : null

  const scrapeSteps = [
    ['Found listing · Unit 3705 · 28 Charles St E, Toronto', progress > 10],
    ['Asking $2,150/mo · 1+den · 1 bath · ~620 sqft', progress > 25],
    ['Heat, water included · Hydro & parking extra', progress > 45],
    ['Pulling 12 rental comps in this building & FSA', progress > 65],
    ['Checking listing accuracy · scanning description', progress > 85],
    ['Building evidence-based verdict', progress > 95],
  ] as [string, boolean][]

  return (
    <>
      <section
        id="hero"
        style={{ paddingTop: 60, paddingBottom: 'var(--pad-y)', overflow: 'hidden' }}
      >
        <div className="container col gap-32">
          {/* Headline strip */}
          {/* Two columns on desktop: the claim on the left, an actual verdict on the
              right. The reference site leads with a cinematic stock image; the more
              honest equivalent here is the thing the product produces. Nobody else
              gives a Canadian listing a score and a hard call, so showing one is
              both the differentiator and the proof. Collapses to one column on a
              phone, where the verdict follows the claim. */}
          <div className="hero-split">
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1100 }}>
              <div className="row gap-12" style={{ marginBottom: 24 }}>
                <span className="chip" style={{ background: 'transparent' }}>
                  <span
                    style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }}
                    className="live-dot"
                  />
                  Live in Ontario
                </span>
                <span className="chip">v0.9 · MVP preview</span>
              </div>

              <h1 className="serif" style={{ textWrap: 'balance' } as React.CSSProperties}>
                Know what a Canadian listing is
                <br />
                worth before you sign anything.
              </h1>

              {/* One contrastive line, borrowed in form from the reference's "We
                don't just install AI. We run the workflow." Says what we are not,
                then what we are — which is also the thing that keeps us from
                drifting into being another listings portal. */}
              <p
                className="serif"
                style={{
                  fontSize: clampStr(19, 25),
                  lineHeight: 1.3,
                  color: 'var(--accent)',
                  marginTop: 18,
                  maxWidth: 640,
                }}
              >
                We don&apos;t list properties. We tell you whether to buy one.
              </p>

              <p
                style={{
                  fontSize: clampStr(17, 21),
                  maxWidth: 720,
                  color: 'var(--ink-2)',
                  marginTop: 22,
                }}
              >
                Paste a listing link, or just type the address. In under a minute you get rental
                comps from live Ontario data, true monthly costs with the OSFI stress test applied,
                risk flags, and a written verdict. Built for Canadian rules — semi-annual
                compounding, land transfer tax, CMHC — not US math with a maple leaf on it.
              </p>
            </div>

            {/* A real verdict from a real analysis — the $3.499M Byngmount listing
                that scores 15/100 as a rental. Deliberately a bad score: a tool
                that only ever shows good news is an advert, not an advisor. */}
            <aside className="hero-verdict" aria-label="Example verdict">
              <div
                className="card col"
                style={{ padding: 28, gap: 14, alignItems: 'center', textAlign: 'center' }}
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
                  A verdict, not a listing
                </span>
                <ShowcaseDealScore score={15} size={148} label="Deal score" />
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--fail)',
                  }}
                >
                  Hard pass
                </span>
                <p
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    color: 'var(--ink-2)',
                    margin: 0,
                    maxWidth: 240,
                  }}
                >
                  A $3.5M Mississauga listing, underwritten as a rental. Cash flow −$23,534/mo. We
                  say so.
                </p>
              </div>
            </aside>
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
                    if (e.key === 'Enter') handleAnalyze()
                  }}
                  disabled={loading}
                  placeholder="Listing link or address"
                  aria-label="Listing link or property address"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    // Mono suits a URL and fights an address; addresses are the
                    // input most people will type. Sans reads as "type anything here".
                    fontFamily: 'inherit',
                    fontSize: 14,
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
                  disabled={loading}
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
                // Disabled while the field is empty rather than letting the click
                // through to a red validation error. Nothing has gone wrong yet —
                // the person simply hasn't pasted anything — so the button reads as
                // "not ready" instead of scolding them for pressing it.
                disabled={loading || url.trim() === ''}
                title={url.trim() === '' ? 'Paste a link or type an address first' : undefined}
                style={{ padding: '14px 22px', fontSize: 15, flexShrink: 0 }}
              >
                {loading
                  ? 'Working…'
                  : stage === 'idle'
                    ? 'Analyze'
                    : stage === 'scraping'
                      ? 'Working…'
                      : 'Open report'}
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

            {addressResult !== null && (
              <div style={{ marginTop: 18 }}>
                <AddressDetailsCard
                  address={addressResult.address}
                  city={addressResult.city}
                  postalCode={addressResult.postalCode}
                  submitting={loading}
                  error={error}
                  onBack={() => {
                    setAddressResult(null)
                    setError(null)
                  }}
                  onSubmit={(details: AddressDetailsValue) => {
                    setLoading(true)
                    setError(null)
                    void (async () => {
                      try {
                        const { token, listing: created } = await startFromAddress({
                          address: addressResult.address,
                          postalCode: addressResult.postalCode,
                          city: addressResult.city,
                          lat: addressResult.coordinates.lat,
                          lng: addressResult.coordinates.lng,
                          ...details,
                        })
                        // Hand off to the same ModeModal the listing-link path
                        // uses. The mode is a real question — an investor and a
                        // tenant get different reports for the same address — and
                        // /analyzing needs it. Skipping the modal and navigating
                        // straight there dropped the mode and bounced back home.
                        setToken(token)
                        setListing(created)
                        setAddressResult(null)
                        setShowModal(true)
                      } catch (err) {
                        setError(
                          err instanceof ApiRequestError
                            ? err.message
                            : 'Could not start the report — please try again.'
                        )
                      } finally {
                        setLoading(false)
                      }
                    })()
                  }}
                />
              </div>
            )}

            {/* Status: error — URL validation failure or scrape API error */}
            {(stage === 'error' || error !== null) && (
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
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {stage === 'error' ? 'Not a usable link' : 'Could not analyze listing'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                    {stage === 'error' ? errorMsg : error}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStage('idle')
                    setErrorMsg('')
                    setError(null)
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

      {/* Real-path mode modal — opened after a successful scrapeUrl() call */}
      <ModeModal
        open={showModal}
        listing={listingPreview}
        onSelect={(mode) => {
          setShowModal(false)
          window.location.href = `/analyzing?token=${token ?? ''}&mode=${mode}`
        }}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}
