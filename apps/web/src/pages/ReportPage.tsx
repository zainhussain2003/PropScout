/**
 * ReportPage — /r/:token
 *
 * Fetches a completed analysis by token and routes to the correct report
 * component based on analysis.mode. Handles:
 *   - Loading spinner while fetching
 *   - Polling retry if status is pending/processing (share-link entry)
 *   - 404 / 410 / failed error states
 *
 * The four report pages (InvestorReport, TenantReport, etc.) are rendered
 * with real analysis + listing data via compatibility shims.
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchReport, ApiRequestError } from '../lib/services/analysisService'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'
import { InvestorReport } from './InvestorReport'
import { TenantReport } from './TenantReport'
import { PersonalBuyerPage } from './PersonalBuyerPage'
import { LandlordPage } from './LandlordPage'
import { Wordmark } from '../components/shared/Wordmark'
import { Icon } from '../components/shared/Icon'

// ── Loading state ─────────────────────────────────────────────────────────────

function ReportLoadingPage(): JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
      }}
    >
      <Wordmark height={24} />
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          border: '3px solid var(--line)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }}
        aria-hidden="true"
      />
      <p
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        Loading report…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Error state ───────────────────────────────────────────────────────────────

interface ReportErrorPageProps {
  code: string
  message: string
  onRetry: () => void
}

function ReportErrorPage({ code, message, onRetry }: ReportErrorPageProps): JSX.Element {
  const is404 = code === 'NOT_FOUND'
  const is410 = code === 'EXPIRED'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        textAlign: 'center',
        padding: '0 24px',
      }}
    >
      <Wordmark height={24} />

      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          background: 'color-mix(in oklab, var(--fail) 12%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="flag" size={24} />
      </div>

      <div className="col" style={{ gap: 8, maxWidth: 420 }}>
        <h2 className="serif" style={{ fontSize: 28 }}>
          {is404 ? 'Report not found' : is410 ? 'This link has expired' : 'Report unavailable'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>{message}</p>
      </div>

      <button className="btn btn-primary" onClick={onRetry} style={{ padding: '14px 24px' }}>
        Back to home <Icon name="arrow" size={13} />
      </button>
    </div>
  )
}

// ── Report router ─────────────────────────────────────────────────────────────

interface ReportRouterProps {
  analysis: Analysis
  listing: Listing
}

function ReportRouter({ analysis, listing }: ReportRouterProps): JSX.Element {
  switch (analysis.mode) {
    case 'investor':
      return <InvestorReport analysis={analysis} listing={listing} />
    case 'landlord':
      return <LandlordPage analysis={analysis} listing={listing} />
    case 'personal':
      return <PersonalBuyerPage analysis={analysis} listing={listing} />
    case 'tenant':
      return <TenantReport analysis={analysis} listing={listing} />
  }
}

// ── ReportPage ────────────────────────────────────────────────────────────────

const POLL_RETRY_MS = 2000
const POLL_TIMEOUT_MS = 60_000

export function ReportPage(): JSX.Element {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [result, setResult] = useState<{ analysis: Analysis; listing: Listing } | null>(null)
  const [error, setError] = useState<{ code: string; message: string } | null>(null)

  const mountedRef = useRef(true)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (!token) {
      navigate('/')
      return
    }
    if (token === 'demo') return // handled by the demo early return below

    // Reset on each effect run so StrictMode remounts don't leave it false.
    mountedRef.current = true

    const load = async (): Promise<void> => {
      try {
        const data = await fetchReport(token)
        if (!mountedRef.current) return

        if (data.status === 'pending' || data.status === 'processing') {
          // Record when polling started so we can enforce the timeout.
          if (pollStartRef.current === null) pollStartRef.current = Date.now()

          if (Date.now() - pollStartRef.current >= POLL_TIMEOUT_MS) {
            if (mountedRef.current)
              setError({
                code: 'TIMEOUT',
                message: 'This is taking longer than expected — try again.',
              })
            return
          }

          // Share link opened before analysis completed — poll until done.
          retryRef.current = setTimeout(() => {
            if (mountedRef.current) void load()
          }, POLL_RETRY_MS)
          return
        }

        if (data.status === 'failed') {
          if (mountedRef.current)
            setError({ code: 'FAILED', message: 'Analysis failed — please start over.' })
          return
        }

        // status === 'complete'
        if (!data.analysis || !data.listing) {
          if (mountedRef.current)
            setError({ code: 'NO_DATA', message: 'Report data is missing — please try again.' })
          return
        }

        if (mountedRef.current) setResult({ analysis: data.analysis, listing: data.listing })
      } catch (err) {
        if (!mountedRef.current) return
        if (err instanceof ApiRequestError) {
          if (err.code === 'NOT_FOUND' || err.code === 'EXPIRED') {
            setError({
              code: err.code,
              message:
                err.code === 'EXPIRED'
                  ? 'This report link has expired. Reports are available for 30 days.'
                  : 'This report was not found. It may have been deleted.',
            })
          } else {
            setError({
              code: err.code,
              message: 'Something went wrong loading this report — try again.',
            })
          }
        } else {
          setError({
            code: 'UNKNOWN',
            message: 'Something went wrong loading this report — try again.',
          })
        }
      }
    }

    void load()

    return () => {
      mountedRef.current = false
      if (retryRef.current !== null) {
        clearTimeout(retryRef.current)
        retryRef.current = null
      }
    }
  }, [token, navigate])

  // Demo bypass — render with built-in fixture data, no API call needed.
  if (token === 'demo') {
    const mode = searchParams.get('mode') ?? 'investor'
    switch (mode) {
      case 'tenant':
        return <TenantReport tier="free" />
      case 'personal':
        return <PersonalBuyerPage tier="free" />
      case 'landlord':
        return <LandlordPage tier="free" />
      default:
        return <InvestorReport tier="free" />
    }
  }

  if (error) {
    return (
      <ReportErrorPage code={error.code} message={error.message} onRetry={() => navigate('/')} />
    )
  }

  if (!result) {
    return <ReportLoadingPage />
  }

  return <ReportRouter analysis={result.analysis} listing={result.listing} />
}
