/**
 * LockedSection — unit tests
 *
 * PR7 · Paywall component tests
 * Test file path: Week3-4 Front end/PR7/lockedSection.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LockedSection } from '../../apps/web/src/components/paywall/LockedSection'

describe('LockedSection', () => {
  it('renders the headline', () => {
    render(<LockedSection headline="See full analysis" sub="Upgrade to unlock" height={300} />)
    expect(screen.getByText('See full analysis')).toBeInTheDocument()
  })

  it('renders the sub copy', () => {
    render(<LockedSection headline="See full analysis" sub="Upgrade to unlock" height={300} />)
    expect(screen.getByText('Upgrade to unlock')).toBeInTheDocument()
  })

  it('renders "Upgrade to Pro" CTA from the embedded UpgradeCard', () => {
    render(<LockedSection headline="See full analysis" sub="Upgrade to unlock" height={300} />)
    expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument()
  })

  it('renders without error when mockContent is omitted', () => {
    expect(() =>
      render(<LockedSection headline="See full analysis" sub="Upgrade to unlock" />)
    ).not.toThrow()
  })
})
