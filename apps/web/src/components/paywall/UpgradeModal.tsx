/**
 * UpgradeModal — feature-specific upgrade pitch modal with 5 copy variants.
 * Closes on Escape key or backdrop click.
 *
 * Design source: paywall-components.jsx::UpgradeModal + FEATURE_COPY
 */

import { useEffect, useRef } from 'react'
import { ProBadge } from './ProBadge'
import { Icon } from '../shared/Icon'

type FeatureKey = 'pdf' | 'portfolio' | 'sunscout' | 'verdict' | 'generic'

interface FeatureCopy {
  headline: string
  sub: string
}

const FEATURE_COPY: Record<FeatureKey, FeatureCopy> = {
  pdf: {
    headline: 'Export this report as a polished PDF.',
    sub: 'Share with your agent, partner, or lender — formatted and branded.',
  },
  portfolio: {
    headline: 'Save this to your portfolio.',
    sub: "Track every deal you've analysed. Compare side by side. Export the lot.",
  },
  sunscout: {
    headline: 'See how shadows fall across this property.',
    sub: 'SunScout 3D models neighbouring buildings and shows you light by hour.',
  },
  verdict: {
    headline: 'Read the full AI verdict.',
    sub: 'The second paragraph is where Scout gets specific — comparable rents, flag explanations, negotiation leverage.',
  },
  generic: {
    headline: 'Unlock Investor Pro.',
    sub: 'Full AI verdicts, PDF export, portfolio tracker, SunScout 3D — everything.',
  },
}

const PRO_FEATURES = [
  'Unlimited analyses — all four report types',
  'Full 3-paragraph AI verdicts with dollar gaps',
  'Financing sliders · OSFI · 35% down · conservative',
  'SunScout with building obstruction (Mapbox 3D)',
  'Branded PDF export · shareable links',
  'Portfolio tracker · up to 10 properties',
]

interface UpgradeModalProps {
  /** Whether the modal is visible. */
  open: boolean
  /** Called when the user dismisses the modal. */
  onClose: () => void
  /** Which feature-specific copy variant to show. Defaults to "generic". */
  feature?: FeatureKey | string
}

export function UpgradeModal({ open, onClose, feature }: UpgradeModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  // Restore focus to the triggering element when the modal closes
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement
    } else {
      ;(triggerRef.current as HTMLElement | null)?.focus()
    }
  }, [open])

  // Focus trap: move initial focus in; constrain Tab / Shift+Tab to modal contents
  useEffect(() => {
    if (!open || !modalRef.current) return
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(selector))
    if (focusable.length > 0) focusable[0].focus()

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return
      const current = Array.from(modalRef.current?.querySelectorAll<HTMLElement>(selector) ?? [])
      if (current.length === 0) return
      const first = current[0]
      const last = current[current.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Close on Escape key; lock body scroll when open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const key = (feature as FeatureKey | undefined) ?? 'generic'
  const copy = FEATURE_COPY[key] ?? FEATURE_COPY.generic

  return (
    <div
      data-testid="upgrade-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
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
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--surface)',
          color: 'var(--ink)',
          borderRadius: 24,
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-pop)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 2,
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'color-mix(in oklab, var(--surface) 88%, transparent)',
            border: '1px solid var(--line)',
            cursor: 'pointer',
            color: 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
          }}
        >
          ×
        </button>

        {/* Scrollable inner */}
        <div
          className="mm-scroll"
          style={{ overflowY: 'auto', padding: 'clamp(26px, 2.8vw, 36px)' }}
        >
          <ProBadge />

          <h2
            className="serif"
            style={{
              fontSize: 'clamp(26px, 2.8vw, 36px)',
              lineHeight: 1.1,
              marginTop: 18,
              marginBottom: 12,
            }}
          >
            {copy.headline}
          </h2>

          <p style={{ fontSize: 15, color: 'var(--ink-2)', marginBottom: 24, lineHeight: 1.55 }}>
            {copy.sub}
          </p>

          {/* What's included list */}
          <div
            style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              padding: 20,
              marginBottom: 22,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 12,
              }}
            >
              What's in Investor Pro
            </div>
            <div className="col" style={{ gap: 10 }}>
              {PRO_FEATURES.map((feat) => (
                <div
                  key={feat}
                  className="row gap-10"
                  style={{ fontSize: 14, color: 'var(--ink-2)' }}
                >
                  <span style={{ color: 'var(--accent)', flexShrink: 0 }}>
                    <Icon name="check" size={14} stroke={2} />
                  </span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price block */}
          <div
            className="row"
            style={{
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div className="col" style={{ gap: 2 }}>
              <span className="serif tabular" style={{ fontSize: 40, lineHeight: 1 }}>
                $10
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>/mo</span>
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                or $100/yr · 2 months free
              </span>
            </div>
            <span
              className="chip"
              style={{
                background: 'color-mix(in oklab, var(--pass) 10%, transparent)',
                borderColor: 'color-mix(in oklab, var(--pass) 30%, transparent)',
                color: 'var(--pass)',
              }}
            >
              14-day money-back
            </span>
          </div>

          {/* Action buttons */}
          <div className="col gap-10">
            <button
              className="btn btn-accent"
              style={{ width: '100%', justifyContent: 'center', padding: 16, fontSize: 15 }}
            >
              Upgrade now <Icon name="arrow" size={14} />
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', padding: 14 }}
            >
              Not right now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
