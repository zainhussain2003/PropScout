/**
 * UpgradeModal — unit tests
 *
 * PR7 · Paywall component tests
 * Test file path: Week3-4 Front end/PR7/upgradeModal.test.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UpgradeModal } from '../../apps/web/src/components/paywall/UpgradeModal'

// Exact headline strings from FEATURE_COPY in UpgradeModal.tsx
const FEATURE_HEADLINES: Record<string, string> = {
  pdf: 'Export this report as a polished PDF.',
  portfolio: 'Save this to your portfolio.',
  sunscout: 'See how shadows fall across this property.',
  verdict: 'Read the full AI verdict.',
  generic: 'Unlock Investor Pro.',
}

describe('UpgradeModal — feature copy variants', () => {
  for (const [key, headline] of Object.entries(FEATURE_HEADLINES)) {
    it(`feature="${key}" renders correct headline`, () => {
      render(<UpgradeModal open={true} onClose={vi.fn()} feature={key} />)
      expect(screen.getByText(headline)).toBeInTheDocument()
    })

    it(`feature="${key}" shows $10/mo price`, () => {
      render(<UpgradeModal open={true} onClose={vi.fn()} feature={key} />)
      // $10 appears in both "$10" (price) and "$100/yr" — use getAllByText
      expect(screen.getAllByText(/\$10/).length).toBeGreaterThanOrEqual(1)
    })

    it(`feature="${key}" has "Not right now" button`, () => {
      render(<UpgradeModal open={true} onClose={vi.fn()} feature={key} />)
      expect(screen.getByText('Not right now')).toBeInTheDocument()
    })
  }
})

describe('UpgradeModal — open=false', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(<UpgradeModal open={false} onClose={vi.fn()} feature="generic" />)
    expect(container.firstChild).toBeNull()
  })
})

describe('UpgradeModal — interactions', () => {
  it('calls onClose exactly once when "Not right now" is clicked', () => {
    const onClose = vi.fn()
    render(<UpgradeModal open={true} onClose={onClose} feature="generic" />)
    fireEvent.click(screen.getByText('Not right now'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose exactly once when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<UpgradeModal open={true} onClose={onClose} feature="generic" />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose exactly once when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<UpgradeModal open={true} onClose={onClose} feature="generic" />)
    const backdrop = screen.getByTestId('upgrade-modal-backdrop')
    // Simulate clicking the backdrop itself (not a child element)
    fireEvent.click(backdrop, { target: backdrop })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
