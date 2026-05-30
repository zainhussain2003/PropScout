/**
 * UpgradeCard — unit tests
 *
 * PR7 · Paywall component tests
 * Test file path: Week3-4 Front end/PR7/upgradeCard.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UpgradeCard } from '../../apps/web/src/components/paywall/UpgradeCard'

describe('UpgradeCard — required props only', () => {
  it('renders the headline', () => {
    render(<UpgradeCard headline="Unlock Pro" sub="Get access" />)
    expect(screen.getByText('Unlock Pro')).toBeInTheDocument()
  })

  it('renders the sub copy', () => {
    render(<UpgradeCard headline="Unlock Pro" sub="Get access" />)
    expect(screen.getByText('Get access')).toBeInTheDocument()
  })

  it('renders the default "Upgrade to Pro" CTA label', () => {
    render(<UpgradeCard headline="Unlock Pro" sub="Get access" />)
    expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument()
  })

  it('renders the "$10/mo · cancel anytime" pricing footer', () => {
    render(<UpgradeCard headline="Unlock Pro" sub="Get access" />)
    expect(screen.getByText(/\$10\/mo · cancel anytime/)).toBeInTheDocument()
  })

  it('has a .pro-badge element in the DOM', () => {
    const { container } = render(<UpgradeCard headline="Unlock Pro" sub="Get access" />)
    expect(container.querySelector('.pro-badge')).not.toBeNull()
  })
})

describe('UpgradeCard — custom ctaLabel', () => {
  it('renders "Get Pro" instead of "Upgrade to Pro"', () => {
    render(<UpgradeCard headline="Unlock Pro" sub="Get access" ctaLabel="Get Pro" />)
    expect(screen.getByText(/Get Pro/)).toBeInTheDocument()
    expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument()
  })
})

describe('UpgradeCard — prop variants smoke tests', () => {
  it('renders without error with size="sm"', () => {
    expect(() => render(<UpgradeCard headline="Unlock" sub="Sub" size="sm" />)).not.toThrow()
  })

  it('renders without error with dark=true', () => {
    expect(() => render(<UpgradeCard headline="Unlock" sub="Sub" dark />)).not.toThrow()
  })

  it('renders without error with dense=true', () => {
    expect(() => render(<UpgradeCard headline="Unlock" sub="Sub" dense />)).not.toThrow()
  })
})
