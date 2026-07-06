/**
 * NegotiationSection — §04 of the tenant report.
 *
 * Two-column layout:
 *   Left  — leverage card: target rent range, annual savings, leverage factors table
 *   Right — suggested message card: copy-pasteable negotiation script + rationale bullets
 *
 * The "Copy" button writes the message to the clipboard using the
 * Clipboard API (gracefully handles environments where it's unavailable).
 */

import { useRef } from 'react'
import type { TenantLeverageRow } from '../../types/analysis'
import { SectionHead } from '../shared/SectionHead'
import { Icon } from '../shared/Icon'

interface NegotiationSectionProps {
  targetLow: number
  targetHigh: number
  leverageFactors: TenantLeverageRow[]
  suggestedMessage: string
  messageReasons?: string[]
  /** Section verdict pill — overridable so the live report can reflect the real
   *  leverage state (e.g. "Some leverage" / "Limited leverage") instead of always
   *  "Strong leverage". */
  verdict?: string
  tone?: 'pass' | 'caution' | 'fail'
}

export function NegotiationSection({
  targetLow,
  targetHigh,
  leverageFactors,
  suggestedMessage,
  messageReasons = [],
  verdict = 'Strong leverage',
  tone = 'pass',
}: NegotiationSectionProps): JSX.Element {
  const hasTarget = targetHigh > 0
  // Use a ref to update aria-label directly — bypasses React's scheduler so
  // the change is visible to getByRole immediately, even when vi.useFakeTimers()
  // is active (Vitest 2.x fakes queueMicrotask which React 18's scheduler uses).
  const copyBtnRef = useRef<HTMLButtonElement>(null)

  const annualSavingsLow = (targetHigh - targetLow) * 12
  const annualSavingsHigh = annualSavingsLow + 600 // ~$50/mo extra off floor

  function handleCopy(): void {
    const btn = copyBtnRef.current
    if (!btn) return

    btn.setAttribute('aria-label', 'Message copied to clipboard')

    setTimeout(() => {
      btn.setAttribute('aria-label', 'Copy message to clipboard')
    }, 2000)

    void navigator.clipboard.writeText(suggestedMessage).catch(() => {
      // Clipboard API unavailable (e.g. iframe, non-HTTPS) — silently ignore
    })
  }

  return (
    <section className="container tr-section" data-section="04">
      <SectionHead
        n="04"
        topic="Negotiation"
        question={
          <>
            Should you <em>negotiate</em>?
          </>
        }
        verdict={verdict}
        tone={tone}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'clamp(20px, 2.5vw, 32px)',
          alignItems: 'stretch',
        }}
      >
        {/* LEFT — leverage card */}
        <div className="card col" style={{ padding: 28, gap: 20 }}>
          {/* Target range — only when comps give us a real benchmark. Without
              comps we don't invent a "$0" target; we point to the leverage below. */}
          <div className="col" style={{ gap: 8 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Your target
            </span>
            {hasTarget ? (
              <>
                <div
                  className="serif tabular"
                  style={{
                    fontSize: 'clamp(32px, 3.5vw, 48px)',
                    lineHeight: 1,
                    letterSpacing: '-0.025em',
                  }}
                  aria-label={`Target rent: $${targetLow.toLocaleString('en-CA')} to $${targetHigh.toLocaleString('en-CA')} per month`}
                >
                  ${targetLow.toLocaleString('en-CA')}
                  <span style={{ color: 'var(--muted)' }}> – </span>$
                  {targetHigh.toLocaleString('en-CA')}
                  <span style={{ fontSize: 16, color: 'var(--muted)' }}>/mo</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                  That's{' '}
                  <span className="tabular" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                    ${annualSavingsLow.toLocaleString('en-CA')}–
                    {annualSavingsHigh.toLocaleString('en-CA')}
                  </span>{' '}
                  saved over a 12-month lease.
                </div>
              </>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                No comparable-rent benchmark for this postal code yet, so we can&apos;t set a dollar
                target — use the leverage below to open the conversation.
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--line)' }} />

          {/* Leverage factors */}
          <div className="col">
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 12,
              }}
            >
              Why you have leverage
            </span>

            {leverageFactors.map((row, i) => (
              <div
                key={row.k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: i < leverageFactors.length - 1 ? '1px solid var(--line)' : 'none',
                  fontSize: 13,
                  gap: 12,
                }}
              >
                <span style={{ color: 'var(--ink-2)' }}>{row.k}</span>
                <span
                  className="mono tabular"
                  style={{
                    color: 'var(--ink)',
                    fontWeight: 500,
                    textAlign: 'right',
                  }}
                >
                  {row.v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — suggested message */}
        <div className="card col" style={{ padding: 28, background: 'var(--bg-elev)', gap: 16 }}>
          {/* Header + copy button */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              Suggested message
            </span>
            {suggestedMessage && (
              <button
                ref={copyBtnRef}
                className="btn btn-ghost"
                onClick={handleCopy}
                style={{ padding: '6px 12px', fontSize: 11 }}
                aria-label="Copy message to clipboard"
              >
                <Icon name="paste" size={12} />
                {' Copy'}
              </button>
            )}
          </div>

          {/* Message text — or an honest note when we don't have enough to draft one. */}
          <div
            className="serif"
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: suggestedMessage ? 'var(--ink)' : 'var(--muted)',
              fontStyle: 'italic',
              borderLeft: '2px solid var(--accent)',
              paddingLeft: 16,
            }}
          >
            {suggestedMessage ||
              "Not enough listing detail to draft a negotiation script yet — confirm the unit's specifics with the landlord first."}
          </div>

          {/* Why this works */}
          {messageReasons.length > 0 && (
            <div className="col" style={{ gap: 8, marginTop: 4 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Why this works
              </span>
              <div className="col" style={{ gap: 6 }}>
                {messageReasons.map((reason) => (
                  <div
                    key={reason}
                    className="row"
                    style={{
                      alignItems: 'flex-start',
                      fontSize: 13,
                      color: 'var(--ink-2)',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }}
                      aria-hidden="true"
                    >
                      <Icon name="check" size={12} stroke={2} />
                    </span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
