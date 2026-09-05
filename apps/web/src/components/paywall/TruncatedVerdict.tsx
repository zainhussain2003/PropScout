/**
 * TruncatedVerdict — AI verdict with first paragraph fully visible,
 * second paragraph blurred and faded out, and an inline upgrade strip.
 * Rendered on a dark (ink) background card.
 *
 * Design source: paywall-components.jsx::TruncatedVerdict
 */

import { ProBadge } from './ProBadge'
import { Icon } from '../shared/Icon'

interface TruncatedVerdictProps {
  /** The first paragraph of the AI verdict — shown in full. */
  firstParagraph: string
  /**
   * The real second paragraph of this property's verdict, blurred as a teaser.
   *
   * Omit it when the tier only produced one paragraph — the component then renders
   * neutral skeleton bars. It must never be given invented prose: this block used to
   * hardcode a fabricated paragraph ("$4,733 going out every month … DSCR 0.45×")
   * which contradicted the real figures on every free report, and which blur does
   * not hide from screen readers, copy-paste, or page-text extraction.
   */
  blurredParagraph?: string
  /** Called when the user clicks "Unlock full verdict" — typically opens UpgradeModal. */
  onUnlock?: () => void
  /** Mode-specific eyebrow, e.g. "Scout AI · tenant verdict". */
  eyebrow?: string
}

export function TruncatedVerdict({
  firstParagraph,
  blurredParagraph,
  onUnlock,
  eyebrow = 'Scout AI · investor verdict',
}: TruncatedVerdictProps): JSX.Element {
  return (
    <div
      style={{
        background: 'var(--ink)',
        color: 'var(--bg)',
        borderRadius: 24,
        padding: 'clamp(36px, 4vw, 56px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header row — live dot + label + tier tag */}
      <div
        className="row gap-8"
        style={{ color: 'color-mix(in oklab, var(--bg) 55%, transparent)', marginBottom: 20 }}
      >
        <span
          className="live-dot"
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: 'var(--accent)',
            flexShrink: 0,
          }}
        />
        <span
          className="mono"
          style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          {eyebrow}
        </span>
        <span style={{ flex: 1 }} />
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'color-mix(in oklab, var(--bg) 40%, transparent)',
          }}
        >
          1 of 3 paragraphs · free tier
        </span>
      </div>

      {/* First paragraph — fully visible */}
      <div
        className="serif"
        style={{
          fontSize: 'clamp(22px, 2.6vw, 32px)',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          color: 'var(--bg)',
        }}
      >
        {firstParagraph}
      </div>

      {/* Fade-out preview of paragraph 2 — blurred and faded.
          aria-hidden + inert to assistive tech: it is a visual "there is more here"
          affordance, not content anyone is meant to read. */}
      <div data-testid="verdict-blur" style={{ position: 'relative', marginTop: 22 }}>
        <div
          className="serif"
          aria-hidden="true"
          style={{
            fontSize: 'clamp(17px, 1.7vw, 21px)',
            lineHeight: 1.5,
            color: 'color-mix(in oklab, var(--bg) 55%, transparent)',
            filter: 'blur(3px)',
            userSelect: 'none',
            maxHeight: 110,
            overflow: 'hidden',
          }}
        >
          {blurredParagraph ?? <VerdictSkeletonLines />}
        </div>
        {/* Gradient fade overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 0%, var(--ink) 80%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Inline upgrade strip */}
      <div
        className="row"
        style={{
          marginTop: 18,
          padding: '14px 18px',
          borderRadius: 14,
          background: 'color-mix(in oklab, var(--bg) 6%, transparent)',
          border: '1px solid color-mix(in oklab, var(--bg) 12%, transparent)',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
          <ProBadge />
          <span style={{ fontSize: 14, color: 'color-mix(in oklab, var(--bg) 85%, transparent)' }}>
            Read the full 3-paragraph verdict with specific dollar gaps and a precise next step.
          </span>
        </div>
        <button className="btn btn-accent" style={{ padding: '10px 16px' }} onClick={onUnlock}>
          Unlock full verdict <Icon name="arrow" size={13} />
        </button>
      </div>
    </div>
  )
}

/**
 * Neutral placeholder bars shown behind the paywall blur when there is no real
 * second paragraph to tease. Deliberately text-free: the alternative — inventing
 * plausible prose — puts numbers in the DOM that contradict the report.
 */
function VerdictSkeletonLines(): JSX.Element {
  const widths = ['96%', '99%', '92%', '61%']
  return (
    <div className="col" style={{ gap: 12, paddingTop: 4 }}>
      {widths.map((w, i) => (
        <div
          key={i}
          style={{
            height: 13,
            width: w,
            borderRadius: 999,
            background: 'color-mix(in oklab, var(--bg) 34%, transparent)',
          }}
        />
      ))}
    </div>
  )
}
