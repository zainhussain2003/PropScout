import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PaywallContext } from './PaywallContext'
import { TierUnavailableNotice } from './TierUnavailableNotice'

function renderWith(
  status: 'resolved' | 'unavailable' | 'loading' | 'signed-out',
  refreshTier = vi.fn()
): ReturnType<typeof vi.fn> {
  render(
    <PaywallContext.Provider
      value={{
        tier: 'free',
        tierStatus: status,
        refreshTier,
        openUpgradeModal: () => undefined,
        openHardGate: () => undefined,
      }}
    >
      <TierUnavailableNotice />
    </PaywallContext.Provider>
  )
  return refreshTier
}

describe('TierUnavailableNotice', () => {
  it('renders nothing when the plan is known, loading, or there is no session', () => {
    for (const s of ['resolved', 'loading', 'signed-out'] as const) {
      renderWith(s)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    }
  })

  it('says billing status is unavailable while beta access remains free', () => {
    renderWith('unavailable')
    expect(screen.getByRole('status')).toHaveTextContent(/could not confirm your billing status/)
    expect(screen.getByRole('status')).toHaveTextContent(/Beta report features remain free/)
  })

  it('retries on request', () => {
    const refresh = renderWith('unavailable')
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
