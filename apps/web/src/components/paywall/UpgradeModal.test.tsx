/**
 * UpgradeModal — "Upgrade now" does something (audit paywall row).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UpgradeModal } from './UpgradeModal'

describe('UpgradeModal — Upgrade now', () => {
  it('calls onUpgrade', () => {
    const onUpgrade = vi.fn()
    render(<UpgradeModal open onClose={() => undefined} onUpgrade={onUpgrade} />)
    fireEvent.click(screen.getByRole('button', { name: /Upgrade now/i }))
    expect(onUpgrade).toHaveBeenCalledTimes(1)
  })

  it('shows the error the upgrade produced instead of swallowing it', () => {
    render(
      <UpgradeModal
        open
        onClose={() => undefined}
        onUpgrade={() => undefined}
        error="Paid plans are not open yet."
      />
    )
    expect(screen.getByText(/Paid plans are not open yet/i)).toBeInTheDocument()
  })

  it('renders no upgrade button at all when nothing is wired to it', () => {
    render(<UpgradeModal open onClose={() => undefined} />)
    expect(screen.queryByRole('button', { name: /Upgrade now/i })).not.toBeInTheDocument()
  })
})
