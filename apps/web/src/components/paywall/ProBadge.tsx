/**
 * ProBadge — small inline Pro marker with lock icon.
 * Rendered as an accent pill with SVG padlock + tier label.
 *
 * Design source: paywall-components.jsx::ProBadge
 */

interface ProBadgeProps {
  /** Tier label displayed in the pill. Default "Investor Pro". */
  tier?: string
}

export function ProBadge({ tier = 'Investor Pro' }: ProBadgeProps): JSX.Element {
  return (
    <span className="pro-badge">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="11" width="16" height="10" rx="1.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      {tier}
    </span>
  )
}
