/**
 * RiskFlagsSection — §06 of the investor / landlord report.
 *
 * One implementation for the live report and the demo route (D-073).
 */

import { SectionHead } from '../shared/SectionHead'
import { Icon } from '../shared/Icon'
import { RiskRow } from '../analysis/RiskRow'
import type { ListingData, FlagOverrideControls } from '../../types/analysis'

export interface RiskFlagsSectionProps {
  listing: ListingData
  /** Omitted on the demo route: nothing to persist, so nothing is dismissable. */
  flagOverrides?: FlagOverrideControls
}

export function RiskFlagsSection({ listing, flagOverrides }: RiskFlagsSectionProps): JSX.Element {
  const redFlags = listing.riskFlags.filter((f) => f.tone === 'red')
  const amberFlags = listing.riskFlags.filter((f) => f.tone === 'amber')
  // No "−X pts" line here: with the severe gate, score impact is gate + standard
  // tier, not a single deduction — and re-deriving it on the frontend is exactly
  // the second computation that drifts from the calc engine. The score itself is
  // shown (from the backend) in the hero gauge.

  // Ambers are soft warnings — the chip must read caution, not pass-green
  const verdictTone =
    redFlags.length > 1
      ? 'fail'
      : redFlags.length === 1 || amberFlags.length > 0
        ? 'caution'
        : 'caution'
  const verdictLabel =
    redFlags.length > 0
      ? `${redFlags.length} red · ${amberFlags.length} amber`
      : amberFlags.length > 0
        ? `${amberFlags.length} amber flag${amberFlags.length > 1 ? 's' : ''}`
        : 'No wording flags'

  return (
    <section className="container tr-section" data-section="06">
      <SectionHead
        n="06"
        topic="Risk flags"
        question={
          <>
            What could <em>break</em> this thesis?
          </>
        }
        verdict={verdictLabel}
        tone={verdictTone}
      />

      <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
        {listing.riskFlags.length === 0 ? (
          <div
            style={{
              padding: 28,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              color: 'var(--caution)',
            }}
          >
            <Icon name="flag" size={16} />
            <span style={{ fontSize: 14, lineHeight: 1.5 }}>
              No risk language was found in the listing description. This wording scan is not an
              inspection or a clean bill of health.
            </span>
          </div>
        ) : (
          listing.riskFlags.map((f) => (
            <RiskRow
              key={f.id}
              tone={f.tone}
              label={f.label}
              detail={f.detail}
              dismissable={flagOverrides?.canOverride ?? false}
              dismissed={flagOverrides?.overrides.has(f.id) ?? false}
              onToggleDismiss={() => flagOverrides?.onToggle(f.id)}
            />
          ))
        )}
      </div>
    </section>
  )
}
