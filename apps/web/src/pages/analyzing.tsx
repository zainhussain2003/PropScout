/**
 * AnalyzingPage — /analyzing
 *
 * Shown immediately after the user selects a mode in ModeModal. On mount:
 *   1. Calls triggerAnalysis(token, mode) to kick off the pipeline.
 *   2. Starts polling fetchReport(token) every 2s.
 *   3. Navigates to /r/[token] when status === 'complete'.
 *   4. Shows an error state on failure.
 *
 * Visual design is ported from docs/design_handoff_propscout_mvp/designs/pre-report.jsx.
 * Do not change layout, colours, step labels, or progress bar styling without
 * updating the design source first.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Wordmark } from '../components/shared/Wordmark'
import { Icon } from '../components/shared/Icon'
import {
  triggerAnalysis,
  fetchReport,
  freeLimitDetails,
  ApiRequestError,
  type FreeLimitDetails,
} from '../lib/services/analysisService'
import { startCheckout } from '../lib/services/billingService'
import { HardLimitGate } from '../components/paywall/HardLimitGate'
import { useAuth } from '../hooks/useAuth'
import type { ReportMode } from '../types/analysis'

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_MODES: readonly string[] = ['investor', 'personal', 'tenant', 'landlord']

const POLL_INTERVAL_MS = 2000

/**
 * How long to keep polling before giving the user back control.
 *
 * The pipeline takes roughly 25–60s (scrape, calc engine, narrative), so three
 * minutes is generous. It needs a bound at all because a failure is currently
 * indistinguishable from work in progress: `updateAnalysisStatus` in the API is
 * a no-op, and `getAnalysisStatus` derives state purely from whether
 * `calculated_metrics` is set — null reads as 'pending'. So a run that died
 * server-side leaves a row that says "pending" forever, and this page polled it
 * forever, every two seconds, with a progress bar implying work was happening.
 *
 * Measured against a timestamp rather than counting ticks: a background tab
 * throttles intervals, and a tick count would then mean a different wall-clock
 * bound depending on whether the user watched.
 */
const POLL_TIMEOUT_MS = 3 * 60 * 1000

const STEPS = [
  'Fetched listing from Realtor.ca',
  'Read address, price and unit details',
  'Pulled rental comps for this area',
  'Detected building and neighbourhood data',
  'Scanning listing description for flags',
  'Running investment calculations',
  'Building evidence-based verdict',
  'Assembling your report',
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

type PollStatus = 'pending' | 'processing' | 'complete' | 'failed' | null

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** "12 days" / "1 day" until the quota resets — never "0 days" or negative. */
function daysUntilLabel(iso: string, now: number = Date.now()): string {
  const days = Math.max(1, Math.ceil((new Date(iso).getTime() - now) / MS_PER_DAY))
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

/** "Oct 1" style label for the reset date, in the user's locale. */
function shortDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function stepState(status: PollStatus, i: number): 'done' | 'active' | 'pending' {
  if (status === 'complete') return 'done'
  if (status === 'pending') {
    if (i < 2) return 'done'
    if (i === 2) return 'active'
    return 'pending'
  }
  if (status === 'processing') {
    if (i < 6) return 'done'
    if (i < 8) return 'active'
    return 'pending'
  }
  return 'pending'
}

function pctForStatus(s: PollStatus): number {
  if (s === 'pending') return 30
  if (s === 'processing') return 70
  if (s === 'complete') return 100
  return 5
}

function modeLabelFor(mode: string): string {
  if (mode === 'tenant') return 'Tenant view'
  if (mode === 'landlord') return 'Landlord view'
  if (mode === 'personal') return 'Personal buyer'
  return 'Investor view'
}

// ── MiniNav ───────────────────────────────────────────────────────────────────

interface MiniNavProps {
  onCancel: () => void
}

function MiniNav({ onCancel }: MiniNavProps): JSX.Element {
  return (
    <header
      style={{
        borderBottom: '1px solid var(--line)',
        background: 'color-mix(in oklab, var(--bg) 84%, transparent)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
      }}
    >
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        <Wordmark height={22} />
        <button
          onClick={onCancel}
          className="btn btn-ghost"
          style={{ padding: '10px 14px', fontSize: 12 }}
        >
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>
            <Icon name="arrow" size={12} />
          </span>
          Cancel & start over
        </button>
      </div>
    </header>
  )
}

// ── AnalyzingPage ─────────────────────────────────────────────────────────────

export function AnalyzingPage(): JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const modeRaw = searchParams.get('mode')
  // The session is what attributes the analysis to the account and what the
  // free quota is checked against (D-071). Triggering before it has resolved
  // would run every signed-in user's first report as a guest.
  const { session, loading: authLoading } = useAuth()
  const accessToken = session?.access_token ?? null

  const [status, setStatus] = useState<PollStatus>(null)
  const [error, setError] = useState<string | null>(null)
  // The free-tier quota refusal. Its own state, not `error`: nothing failed,
  // and the way out is a plan change or a calendar, not "try again".
  const [limit, setLimit] = useState<FreeLimitDetails | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)
  // Distinct from `error`: we stopped waiting, which is not the same claim as
  // "it failed". The analysis may still be running server-side.
  const [stalled, setStalled] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const handleCancel = (): void => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    navigate('/')
  }

  useEffect(() => {
    // Guard — both params required; invalid mode → home.
    if (!token || !modeRaw || !VALID_MODES.includes(modeRaw)) {
      navigate('/')
      return
    }
    if (authLoading) return

    const mode = modeRaw as ReportMode

    // Reset on each effect run so StrictMode remounts don't leave it false.
    mountedRef.current = true
    setStalled(false)

    // Demo token — skip the real pipeline and navigate directly to the fixture report.
    if (token === 'demo') {
      navigate(`/r/demo?mode=${mode}`)
      return
    }

    const run = async (): Promise<void> => {
      // Step 1 — fire the orchestrator pipeline.
      try {
        await triggerAnalysis(token, mode, accessToken)
      } catch (err) {
        if (!mountedRef.current) return
        const quota = freeLimitDetails(err)
        if (quota != null) {
          setLimit(quota)
        } else if (err instanceof ApiRequestError) {
          setError(err.message)
        } else {
          setError('Something went wrong — please try again.')
        }
        return
      }

      if (!mountedRef.current) return

      // Step 2 — poll until complete, failed, or the bound above is reached.
      const startedAt = Date.now()
      intervalRef.current = setInterval(() => {
        void (async () => {
          if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
            if (intervalRef.current !== null) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            if (mountedRef.current) setStalled(true)
            return
          }
          try {
            const result = await fetchReport(token)
            if (!mountedRef.current) return

            if (mountedRef.current) setStatus(result.status)

            if (result.status === 'complete') {
              if (intervalRef.current !== null) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
              navigate(`/r/${token}`)
              return
            }

            if (result.status === 'failed') {
              if (intervalRef.current !== null) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
              }
              if (mountedRef.current) setError('Analysis failed — please try again.')
              return
            }
          } catch (err) {
            if (!mountedRef.current) return
            if (intervalRef.current !== null) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            if (err instanceof ApiRequestError) {
              if (err.code === 'NOT_FOUND' || err.code === 'EXPIRED') {
                navigate('/')
                return
              }
              if (mountedRef.current) setError(err.message)
            } else {
              if (mountedRef.current) setError('Something went wrong — please try again.')
            }
          }
        })()
      }, POLL_INTERVAL_MS)
    }

    void run()

    return () => {
      mountedRef.current = false
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [token, modeRaw, navigate, attempt, authLoading, accessToken])

  const handleUpgrade = (): void => {
    if (accessToken == null) return
    setBillingError(null)
    void startCheckout('pro', accessToken).catch((err: Error) => {
      setBillingError(err.message)
    })
  }

  // Milestone target from the poll status (5 → 30 → 70 → 100). On its own this
  // JUMPS and, worse, sits frozen at 5% for the whole ~25s scrape (status stays
  // null until the first poll returns). Ease a displayed value toward the target
  // every 200ms, and while still waiting on the first status, creep up to a soft
  // cap so the bar always feels alive — never a dead 5%.
  const targetPct = pctForStatus(status)
  const [displayPct, setDisplayPct] = useState(5)
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayPct((cur) => {
        const softTarget = status === null ? Math.max(targetPct, 24) : targetPct
        if (cur >= softTarget) return cur
        const step = Math.max(0.4, (softTarget - cur) * 0.06)
        return Math.min(softTarget, cur + step)
      })
    }, 200)
    return () => clearInterval(id)
  }, [status, targetPct])
  const pct = Math.round(displayPct)
  const label = modeRaw !== null ? modeLabelFor(modeRaw) : 'Analyzing'

  // ── Error state ─────────────────────────────────────────────────────────────

  if (stalled) {
    return (
      <div>
        <MiniNav onCancel={handleCancel} />
        <main className="container" style={{ paddingTop: 80, paddingBottom: 120 }}>
          <div
            style={{
              maxWidth: 520,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <span style={{ color: 'var(--caution)' }}>
              <Icon name="flag" size={32} />
            </span>
            <h2 className="serif" style={{ fontSize: 28 }}>
              This is taking longer than it should
            </h2>
            {/* Deliberately not "it failed" — we stopped checking, and we do
                not know which. Saying it failed would be a claim the page
                cannot support; saying nothing and spinning forever was the
                previous behaviour. */}
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>
              We&rsquo;ve stopped checking after three minutes. The analysis may still finish on its
              own, or it may have stopped — we can&rsquo;t tell from here. Checking again is safe,
              and it won&rsquo;t start a second analysis.
            </p>
            <div className="row gap-12" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setAttempt((n) => n + 1)}
                className="btn btn-primary"
                style={{ padding: '14px 24px' }}
              >
                Check again <Icon name="arrow" size={14} />
              </button>
              <button
                onClick={handleCancel}
                className="btn btn-ghost"
                style={{ padding: '14px 24px' }}
              >
                Start over
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error !== null) {
    return (
      <div>
        <MiniNav onCancel={handleCancel} />
        <main className="container" style={{ paddingTop: 80, paddingBottom: 120 }}>
          <div
            style={{
              maxWidth: 520,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <span style={{ color: 'var(--fail)' }}>
              <Icon name="flag" size={32} />
            </span>
            <h2 className="serif" style={{ fontSize: 28 }}>
              Analysis could not complete
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>{error}</p>
            <button
              onClick={handleCancel}
              className="btn btn-primary"
              style={{ padding: '14px 24px' }}
            >
              Start over <Icon name="arrow" size={14} />
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Free-tier limit reached ─────────────────────────────────────────────────
  //
  // Full-screen gate over the (now idle) progress page. The figures are the
  // API's, not the client's: `used` is the count it refused on and `resetsAt`
  // is the start of its next UTC month, so the gate cannot disagree with the
  // account page about either.

  if (limit != null) {
    return (
      <div>
        <MiniNav onCancel={handleCancel} />
        <HardLimitGate
          onClose={handleCancel}
          onUpgrade={handleUpgrade}
          monthlyLimit={limit.limit}
          used={limit.used}
          resetsIn={daysUntilLabel(limit.resetsAt)}
          resetDate={shortDateLabel(limit.resetsAt)}
        />
        {billingError != null && (
          <p
            role="alert"
            style={{
              position: 'fixed',
              bottom: 24,
              left: 0,
              right: 0,
              textAlign: 'center',
              zIndex: 2147483641,
              color: 'var(--bg)',
              fontSize: 14,
            }}
          >
            {billingError}
          </p>
        )}
      </div>
    )
  }

  // ── Progress state ──────────────────────────────────────────────────────────

  return (
    <div>
      <MiniNav onCancel={handleCancel} />

      <main className="container" style={{ paddingTop: 80, paddingBottom: 120 }}>
        <div
          style={{
            maxWidth: 920,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 56,
          }}
        >
          {/* Token / mode strip */}
          <div
            className="row gap-12"
            style={{
              padding: '16px 22px',
              borderRadius: 14,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent)' }}
              className="live-dot"
            />
            <span
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Analyzing
            </span>
            <span
              className="mono"
              style={{
                fontSize: 12,
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                minWidth: 0,
              }}
            >
              {token ?? '…'}
            </span>
            <span className="chip">{label}</span>
          </div>

          {/* Headline */}
          <div className="col" style={{ gap: 22, textAlign: 'center', alignItems: 'center' }}>
            <h1
              className="serif"
              style={{ textWrap: 'balance', maxWidth: 720 } as React.CSSProperties}
            >
              {status === 'processing' ? (
                <>
                  Running the numbers and{' '}
                  <em style={{ color: 'var(--accent)' }}>writing your verdict</em>.
                </>
              ) : (
                <>
                  Reading the listing and pulling{' '}
                  <em style={{ color: 'var(--accent)' }}>rental comps</em>.
                </>
              )}
            </h1>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 520, lineHeight: 1.6 }}>
              Most reports finish in{' '}
              <span className="tabular" style={{ color: 'var(--ink)' }}>
                under 20 seconds
              </span>
              . Sit tight — or open another tab and we&apos;ll be here when you get back.
            </p>
          </div>

          {/* Progress bar */}
          <div className="col" style={{ gap: 12, maxWidth: 720, margin: '0 auto', width: '100%' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="mono tabular" style={{ fontSize: 12, color: 'var(--muted)' }}>
                {pct}%
              </span>
              <span className="mono tabular" style={{ fontSize: 12, color: 'var(--muted)' }}>
                ~{Math.max(2, Math.round((100 - pct) / 8))}s remaining
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: 'var(--line)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  borderRadius: 999,
                  transition: 'width .8s ease',
                }}
              />
              <div
                className="shimmer"
                style={{ position: 'absolute', inset: 0, opacity: 0.5, borderRadius: 999 }}
              />
            </div>
          </div>

          {/* Two-column: steps + live preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            {/* Steps list */}
            <div className="card col" style={{ padding: 32, gap: 18 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                What we&apos;re doing
              </span>
              {STEPS.map((step, i) => {
                const state = stepState(status, i)
                return (
                  <div
                    key={step}
                    className="row gap-12"
                    style={{
                      fontSize: 14,
                      color: state !== 'pending' ? 'var(--ink)' : 'var(--muted)',
                      transition: 'color .2s ease',
                    }}
                  >
                    {state === 'done' ? (
                      <span style={{ color: 'var(--pass)', flexShrink: 0 }}>
                        <Icon name="check" size={14} stroke={2.4} />
                      </span>
                    ) : state === 'active' ? (
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          border: '2px solid var(--accent)',
                          borderTopColor: 'transparent',
                          animation: 'spin 0.8s linear infinite',
                          flexShrink: 0,
                          display: 'inline-block',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          border: '1.5px solid var(--line-strong)',
                          flexShrink: 0,
                          display: 'inline-block',
                        }}
                      />
                    )}
                    <span>{step}</span>
                  </div>
                )
              })}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>

            {/* Live preview */}
            <div className="col" style={{ gap: 22 }}>
              <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Photo placeholder */}
                <div
                  className="photo-ph"
                  style={{
                    height: 180,
                    position: 'relative',
                    opacity: status === 'processing' || status === 'complete' ? 1 : 0.4,
                    transition: 'opacity .4s ease',
                  }}
                >
                  <span>
                    {status === 'processing' || status === 'complete'
                      ? 'Listing confirmed'
                      : 'Fetching listing…'}
                  </span>
                </div>

                <div className="col" style={{ padding: 24, gap: 14 }}>
                  {/* Progressive chips */}
                  <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                    {(
                      [
                        { txt: 'Listing found', show: status !== null },
                        { txt: 'Price confirmed', show: status !== null },
                        {
                          txt: 'Unit details',
                          show: status === 'processing' || status === 'complete',
                        },
                        { txt: label, show: true },
                      ] as { txt: string; show: boolean }[]
                    ).map(({ txt, show }) => (
                      <span
                        key={txt}
                        className="chip"
                        style={{
                          opacity: show ? 1 : 0.35,
                          transition: 'opacity .25s ease',
                          color: show ? 'var(--ink)' : 'var(--muted)',
                        }}
                      >
                        {show && (
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 999,
                              background: 'var(--pass)',
                            }}
                          />
                        )}
                        {txt}
                      </span>
                    ))}
                  </div>

                  <div
                    className="serif"
                    style={{
                      fontSize: 18,
                      lineHeight: 1.2,
                      color: status !== null ? 'var(--ink)' : 'var(--muted)',
                      transition: 'color .3s ease',
                    }}
                  >
                    {status !== null ? 'Reading listing data…' : 'Connecting to Realtor.ca…'}
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {status === 'processing' || status === 'complete'
                      ? 'Listing data confirmed'
                      : 'Reading location…'}
                  </div>
                </div>
              </div>

              {/* Comps found card */}
              <div
                className="card row"
                style={{
                  padding: 22,
                  gap: 18,
                  alignItems: 'center',
                  opacity: status === 'processing' || status === 'complete' ? 1 : 0.4,
                  transition: 'opacity .4s ease',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="map" size={20} />
                </div>
                <div className="col grow" style={{ gap: 4 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                    }}
                  >
                    Comps
                  </span>
                  <span style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>
                    {status === 'processing' || status === 'complete'
                      ? 'Comps pulled · analysis in progress'
                      : 'Searching the comps database…'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reassurance strip */}
          <div
            className="row"
            style={{
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 22,
              color: 'var(--muted)',
              fontSize: 12,
              marginTop: 12,
            }}
          >
            <span className="row gap-6">
              <Icon name="check" size={12} /> Realtor.ca · live
            </span>
            <span className="row gap-6">
              <Icon name="check" size={12} /> Rental comps verified
            </span>
            <span className="row gap-6">
              <Icon name="check" size={12} /> No data leaves your account
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
