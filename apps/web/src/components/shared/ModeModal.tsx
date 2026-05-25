// ModeModal — routing modal shown after a user pastes a URL and we confirm
// the listing is live.
//
// For-sale listings → Investment / Personal buyer
// For-rent listings → Tenant / Landlord
//
// The user picks ONE option; a loading bar animates, then onSelect fires.
// Backdrop click and Escape close the modal (disabled while loading).
//
// Animation:
//   Backdrop: 0.25s fade
//   Card: translates up 8px + scales 0.98 → 1 over 0.25s

import { useEffect, useRef, useState } from 'react'
import type { ReportMode } from '../../types/analysis'
import type { ListingKind } from '../../lib/validateUrl'
import { Icon } from './Icon'

// ── Mode options ──────────────────────────────────────────────────

interface ModeOption {
  key: ReportMode
  who: string
  title: string
  sub: string
  icon: 'chart' | 'house' | 'key' | 'flag'
  hints: string[]
  free?: boolean
}

const MODE_OPTIONS: Record<ListingKind, ModeOption[]> = {
  sale: [
    {
      key: 'investor',
      who: 'investor',
      title: "I'm buying it as an investment",
      sub: 'I want to rent it out (or model whether I should).',
      icon: 'chart',
      hints: [
        'Cap rate, cash flow, DSCR',
        'OSFI stress test · Ontario LTT',
        'Scout deal score · 0–100',
      ],
    },
    {
      key: 'personal',
      who: 'home buyer',
      title: "I'm buying it to live in",
      sub: 'I want to know the real monthly cost and the right offer.',
      icon: 'house',
      hints: [
        'True monthly cost of ownership',
        'Fair-market band from recent sales',
        'School catchments · walkability',
      ],
    },
  ],
  rent: [
    {
      key: 'tenant',
      who: 'tenant',
      title: "I'm evaluating this as a tenant",
      sub: "I want to know if it's priced fairly and how to negotiate.",
      icon: 'key',
      hints: [
        'Rent positioning vs building & FSA',
        'Listing accuracy · fake-bedroom flags',
        'Negotiation target & leverage',
      ],
      free: true,
    },
    {
      key: 'landlord',
      who: 'landlord',
      title: "I'm pricing my own unit",
      sub: 'I want to know if my asking rent pencils against the market.',
      icon: 'flag',
      hints: ['Yield vs market median', 'Building supply pressure', '12-month trend & vacancy'],
    },
  ],
}

// ── Listing preview data ──────────────────────────────────────────

export interface ListingPreviewData {
  kind: ListingKind
  address: string
  price: string
  beds: string
  sqft: string
  extra?: string
}

// ── ChoiceCard ────────────────────────────────────────────────────

interface ChoiceCardProps {
  opt: ModeOption
  selected: boolean
  dimmed: boolean
  loading: boolean
  onClick: () => void
}

function ChoiceCard({ opt, selected, dimmed, loading, onClick }: ChoiceCardProps): JSX.Element {
  const [hovered, setHovered] = useState(false)
  const active = selected || hovered

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={loading}
      aria-pressed={selected}
      style={{
        flex: '1 1 0',
        textAlign: 'left',
        background: selected
          ? 'color-mix(in oklab, var(--accent) 8%, var(--surface))'
          : 'var(--surface)',
        border: '1.5px solid',
        borderColor: selected ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--line)',
        borderRadius: 18,
        padding: '20px 20px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: dimmed ? 0.45 : 1,
        transform: active && !dimmed && !loading ? 'translateY(-2px)' : 'translateY(0)',
        transition:
          'border-color .18s ease, transform .18s ease, opacity .25s ease, background-color .25s ease, box-shadow .18s ease',
        boxShadow:
          active && !dimmed && !loading
            ? '0 16px 36px -16px color-mix(in oklab, var(--accent) 35%, transparent), 0 2px 6px rgba(14,19,32,.05)'
            : '0 1px 0 rgba(14,19,32,.03)',
        font: 'inherit',
        color: 'inherit',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      {/* Free pill — tenant only */}
      {opt.free && (
        <span
          className="mono"
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            padding: '3px 8px',
            borderRadius: 999,
            background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
          }}
        >
          Free forever
        </span>
      )}

      {/* Icon disc */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: active ? 'var(--accent)' : 'var(--bg-elev)',
          color: active ? 'var(--accent-ink)' : 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          transition: 'background-color .18s ease, color .18s ease',
        }}
      >
        <Icon name={opt.icon} size={20} stroke={1.6} />
      </div>

      {/* Eyebrow */}
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: active ? 'var(--accent)' : 'var(--muted)',
          marginBottom: 6,
          transition: 'color .18s ease',
        }}
      >
        For the {opt.who}
      </div>

      {/* Title */}
      <div
        className="serif"
        style={{ fontSize: 22, lineHeight: 1.12, letterSpacing: '-0.015em', marginBottom: 6 }}
      >
        {opt.title}
      </div>

      {/* Sub */}
      <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.5 }}>
        {opt.sub}
      </div>

      {/* Hints */}
      <div className="col" style={{ gap: 8 }}>
        {opt.hints.map((h) => (
          <div
            key={h}
            className="row gap-8"
            style={{ fontSize: 12.5, color: 'var(--muted)', alignItems: 'flex-start' }}
          >
            <span
              style={{
                color: active ? 'var(--accent)' : 'var(--muted)',
                marginTop: 2,
                transition: 'color .18s ease',
              }}
            >
              <Icon name="check" size={12} stroke={2} />
            </span>
            <span>{h}</span>
          </div>
        ))}
      </div>

      {/* Bottom arrow */}
      <div
        className="row gap-8"
        style={{ marginTop: 18, alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: active ? 'var(--accent)' : 'var(--muted)',
            transition: 'color .18s ease',
          }}
        >
          Open this report
        </span>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: active ? 'var(--accent)' : 'transparent',
            border: '1px solid',
            borderColor: active ? 'var(--accent)' : 'var(--line-strong)',
            color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition:
              'background-color .18s ease, color .18s ease, border-color .18s ease, transform .18s ease',
            transform: active ? 'translateX(2px)' : 'none',
          }}
        >
          <Icon name="arrow" size={13} />
        </span>
      </div>
    </button>
  )
}

// ── ListingPreview ────────────────────────────────────────────────

function ListingPreview({ listing }: { listing: ListingPreviewData }): JSX.Element {
  return (
    <div
      className="row gap-16"
      style={{
        padding: 14,
        borderRadius: 14,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        alignItems: 'stretch',
      }}
    >
      {/* Photo placeholder */}
      <div
        className="photo-ph"
        style={{ width: 88, height: 64, borderRadius: 10, padding: 0, flexShrink: 0 }}
      />

      <div className="col grow" style={{ gap: 4, justifyContent: 'center', minWidth: 0 }}>
        {/* Status */}
        <div className="row gap-8" style={{ alignItems: 'center' }}>
          <span
            className="live-dot"
            style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pass)' }}
          />
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--pass)',
            }}
          >
            Listing found · {listing.kind === 'sale' ? 'for sale' : 'for rent'}
          </span>
        </div>

        {/* Address */}
        <div
          className="serif"
          style={{
            fontSize: 18,
            lineHeight: 1.2,
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {listing.address}
        </div>

        {/* Details */}
        <div
          className="row gap-8"
          style={{ fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}
        >
          <span className="tabular">{listing.price}</span>
          <span>·</span>
          <span>{listing.beds}</span>
          <span>·</span>
          <span>{listing.sqft}</span>
          {listing.extra && (
            <>
              <span>·</span>
              <span>{listing.extra}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ModeModal ─────────────────────────────────────────────────────

export interface ModeModalProps {
  /** Whether the modal is visible */
  open: boolean
  /** Listing data to show in the preview strip */
  listing: ListingPreviewData | null
  /** Called when the user closes without selecting */
  onClose: () => void
  /** Called with the chosen report mode once the loading animation finishes */
  onSelect: (mode: ReportMode) => void
}

export function ModeModal({
  open,
  listing,
  onClose,
  onSelect,
}: ModeModalProps): JSX.Element | null {
  const kind: ListingKind = listing?.kind ?? 'sale'
  const options = MODE_OPTIONS[kind]

  const [selected, setSelected] = useState<ReportMode | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [whyOpen, setWhyOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset state when modal opens / listing changes
  useEffect(() => {
    if (open) {
      setSelected(null)
      setLoading(false)
      setProgress(0)
      setWhyOpen(false)
      // Small delay so CSS transition fires from the initial state
      const t = setTimeout(() => setMounted(true), 10)
      return () => clearTimeout(t)
    } else {
      setMounted(false)
    }
  }, [open, listing])

  // Esc to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onClose])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (tickRef.current != null) clearInterval(tickRef.current)
    }
  }, [])

  if (!open) return null

  const handleSelect = (k: ReportMode): void => {
    if (loading) return
    setSelected(k)
    setLoading(true)
    setProgress(0)

    let p = 0
    tickRef.current = setInterval(() => {
      p += 12
      setProgress(Math.min(p, 100))
      if (p >= 100) {
        if (tickRef.current != null) clearInterval(tickRef.current)
        setTimeout(() => onSelect(k), 250)
      }
    }, 180)
  }

  const question =
    kind === 'sale' ? (
      <>
        Are you buying this <em style={{ color: 'var(--accent)' }}>as an investment</em>, or to live
        in?
      </>
    ) : (
      <>
        Are you a <em style={{ color: 'var(--accent)' }}>tenant</em> looking at this, or a landlord
        pricing it?
      </>
    )

  return (
    /* Backdrop */
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
      role="dialog"
      aria-modal
      aria-label="Choose your report type"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483640,
        background: 'rgba(10, 13, 20, 0.55)',
        backdropFilter: 'blur(10px) saturate(140%)',
        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
    >
      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--surface)',
          color: 'var(--ink)',
          borderRadius: 24,
          border: '1px solid var(--line)',
          boxShadow: '0 32px 64px -24px rgba(14,19,32,.45)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          disabled={loading}
          onMouseEnter={(e) => {
            if (loading) return
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = 'var(--accent)'
            el.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.color = 'var(--ink-2)'
            el.style.borderColor = 'var(--line)'
          }}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 2,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'color-mix(in oklab, var(--surface) 88%, transparent)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid var(--line)',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
            lineHeight: '1',
            opacity: loading ? 0.35 : 1,
            transition: 'color .15s ease, border-color .15s ease, background-color .15s ease',
            fontFamily: 'inherit',
          }}
        >
          ×
        </button>

        {/* Scrollable inner */}
        <div
          style={{
            overflowY: 'auto',
            padding: 'clamp(22px, 2.6vw, 34px)',
          }}
        >
          {/* Listing preview */}
          {listing && <ListingPreview listing={listing} />}

          {/* Question */}
          <div className="col" style={{ marginTop: 20, marginBottom: 20 }}>
            <span className="section-tag" style={{ marginBottom: 12 }}>
              One quick question
            </span>
            <h2
              className="serif"
              style={{
                fontSize: 'clamp(24px, 2.4vw, 32px)',
                lineHeight: 1.12,
                letterSpacing: '-0.025em',
                margin: 0,
                padding: 0,
              }}
            >
              {question}
            </h2>
          </div>

          {/* Choice cards */}
          <div className="row gap-16" style={{ alignItems: 'stretch' }}>
            {options.map((opt) => (
              <ChoiceCard
                key={opt.key}
                opt={opt}
                selected={selected === opt.key}
                dimmed={selected !== null && selected !== opt.key}
                loading={loading}
                onClick={() => handleSelect(opt.key)}
              />
            ))}
          </div>

          {/* Loading bar */}
          {loading && (
            <div className="col gap-10" style={{ marginTop: 22 }}>
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
                  Opening your report · {progress}%
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  ~12s
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
            </div>
          )}

          {/* Why we ask */}
          <div className="col" style={{ marginTop: 18, alignItems: 'center' }}>
            <button
              onClick={() => setWhyOpen(!whyOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--muted)',
                padding: '6px 12px',
                fontFamily: 'inherit',
              }}
            >
              {whyOpen ? '— Hide why we ask' : '+ Why are we asking this?'}
            </button>
            {whyOpen && (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  textAlign: 'center',
                  maxWidth: 520,
                  marginTop: 4,
                  lineHeight: 1.6,
                }}
              >
                The numbers that matter for a <em>tenant</em> are different from the numbers a{' '}
                <em>landlord</em> cares about — even on the same listing. We tailor the whole report
                to your angle so you're not reading sections that don't apply. You can switch later
                from inside the report.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
