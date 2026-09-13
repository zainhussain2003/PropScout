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

  it('says the plan could not be confirmed, and that nothing changed', () => {
    renderWith('unavailable')
    expect(screen.getByRole('status')).toHaveTextContent(/couldn.t confirm your plan/)
    expect(screen.getByRole('status')).toHaveTextContent(/nothing about your account has changed/)
  })

  it('retries on request', () => {
    const refresh = renderWith('unavailable')
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }))
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
