/**
 * TierUnavailableNotice — shown when the API could not confirm the signed-in
 * user's plan (audit A-10).
 *
 * The gates fall back to 'free' because they need a value and the server
 * enforces the real entitlements. Without this notice a paying user whose /me
 * call failed would see locks and upgrade prompts presented as fact. The
 * notice says what is true — we could not confirm — and offers a retry.
 */

import { usePaywall } from './PaywallContext'
import { Icon } from '../shared/Icon'

export function TierUnavailableNotice(): JSX.Element | null {
  const { tierStatus, refreshTier } = usePaywall()
  if (tierStatus !== 'unavailable') return null

  return (
    <div
      role="status"
      className="container row"
      style={{
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        margin: '12px auto 0',
        padding: '10px 16px',
        borderRadius: 12,
        fontSize: 13,
        color: 'var(--ink)',
        background: 'color-mix(in oklab, var(--caution) 10%, var(--surface))',
        border: '1px solid color-mix(in oklab, var(--caution) 35%, transparent)',
      }}
    >
      <span className="row gap-8" style={{ alignItems: 'center' }}>
        <Icon name="flag" size={14} />
        We couldn&rsquo;t confirm your plan just now. Paid features may look locked until we can
        &mdash; nothing about your account has changed.
      </span>
      {refreshTier != null && (
        <button className="btn btn-ghost" onClick={refreshTier} style={{ padding: '6px 12px' }}>
          Try again
        </button>
      )}
    </div>
  )
}
