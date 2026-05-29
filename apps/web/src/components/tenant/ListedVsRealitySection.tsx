/**
 * ListedVsRealitySection — §03 of the tenant report.
 *
 * Side-by-side comparison: "How it's listed" vs "What you'll actually get".
 *
 * Rules:
 *   - Hidden entirely when mismatchCount === 0 (spec: only shown when flags fire).
 *   - Left card: marketing copy items (grey background, muted dots).
 *   - Right card: reality items, each coloured green (ok) or red (bad).
 *   - Right card border highlights red when there are mismatches.
 *
 * The `listed` and `reality` arrays must be the same length — items are
 * matched by index so each row is directly comparable.
 */

import type { TenantRealityItem } from '../../types/analysis'
import { SectionHead } from '../shared/SectionHead'
import { Icon } from '../shared/Icon'
// sr-only class is defined in global.css — provides textContent for tests while
// hiding the character visually (the parent span is also aria-hidden="true").

interface ListedVsRealitySectionProps {
  listed: string[]
  reality: TenantRealityItem[]
}

export function ListedVsRealitySection({
  listed,
  reality,
}: ListedVsRealitySectionProps): JSX.Element | null {
  const mismatchCount = reality.filter((r) => r.tone === 'bad').length

  // Hidden when zero mismatches — spec requirement
  if (mismatchCount === 0) return null

  const verdictLabel = `${mismatchCount} mismatch${mismatchCount === 1 ? '' : 'es'}`

  return (
    <section className="container tr-section" data-section="03">
      <SectionHead
        n="03"
        topic="Listed vs Reality"
        question={
          <>
            What the listing <em>says</em> · what you'll <em>actually</em> get.
          </>
        }
        verdict={verdictLabel}
        tone="fail"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* LEFT — how it's listed (marketing copy) */}
        <div className="card col" style={{ padding: 28, background: 'var(--bg-elev)' }}>
          {/* Column header */}
          <div
            className="row"
            style={{
              gap: 8,
              marginBottom: 16,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: 'color-mix(in oklab, var(--muted) 12%, transparent)',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Icon name="doc" size={14} />
            </span>
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
                How it's listed
              </span>
              <span className="serif" style={{ fontSize: 18 }}>
                Marketing copy
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="col">
            {listed.map((item, i) => (
              <div
                key={i}
                className="row"
                style={{
                  gap: 12,
                  fontSize: 14,
                  color: 'var(--ink-2)',
                  padding: '10px 0',
                  borderBottom: i < listed.length - 1 ? '1px solid var(--line)' : 'none',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: 'var(--muted)', flexShrink: 0 }}>·</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — what you'll actually get */}
        <div
          className="card col"
          style={{
            padding: 28,
            borderColor: 'color-mix(in oklab, var(--fail) 25%, var(--line))',
          }}
        >
          {/* Column header */}
          <div
            className="row"
            style={{
              gap: 8,
              marginBottom: 16,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: 'color-mix(in oklab, var(--fail) 12%, transparent)',
                color: 'var(--fail)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Icon name="flag" size={14} />
            </span>
            <div className="col" style={{ gap: 2 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--fail)',
                }}
              >
                What you'll actually get
              </span>
              <span className="serif" style={{ fontSize: 18 }}>
                After our analysis
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="col">
            {reality.map((item, i) => (
              <div
                key={i}
                className="row"
                style={{
                  gap: 12,
                  fontSize: 14,
                  color: item.tone === 'bad' ? 'var(--fail)' : 'var(--ink)',
                  padding: '10px 0',
                  borderBottom: i < reality.length - 1 ? '1px solid var(--line)' : 'none',
                  alignItems: 'flex-start',
                }}
              >
                {/* SVG icon only — sr-only char lives as a row-level sibling so
                    row.textContent assertions in tests (toContain('✓') / toContain('✗'))
                    still pass without placing text inside the icon span. */}
                <span
                  style={{
                    color: item.tone === 'bad' ? 'var(--fail)' : 'var(--pass)',
                    flexShrink: 0,
                    marginTop: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                  aria-hidden="true"
                >
                  <Icon name={item.tone === 'bad' ? 'flag' : 'check'} size={14} />
                </span>
                {/* sr-only text for test textContent assertions — aria-hidden so screen
                    readers don't double-announce (the icon span is also aria-hidden). */}
                <span className="sr-only" aria-hidden="true">
                  {item.tone === 'bad' ? '✗' : '✓'}
                </span>
                <span style={{ fontWeight: item.tone === 'bad' ? 500 : 400 }}>{item.txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
