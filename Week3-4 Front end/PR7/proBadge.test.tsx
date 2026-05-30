/**
 * ProBadge — unit tests
 *
 * PR7 · Paywall component tests
 * Test file path: Week3-4 Front end/PR7/proBadge.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProBadge } from '../../apps/web/src/components/paywall/ProBadge'

describe('ProBadge', () => {
  it('renders "Investor Pro" label by default', () => {
    render(<ProBadge />)
    expect(screen.getByText('Investor Pro')).toBeInTheDocument()
  })

  it('has the .pro-badge class on the root element', () => {
    const { container } = render(<ProBadge />)
    expect(container.firstChild).toHaveClass('pro-badge')
  })

  it('contains a lock SVG with aria-hidden="true"', () => {
    const { container } = render(<ProBadge />)
    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).not.toBeNull()
  })

  it('renders a custom tier label when tier prop is provided', () => {
    render(<ProBadge tier="Professional" />)
    expect(screen.getByText('Professional')).toBeInTheDocument()
    expect(screen.queryByText('Investor Pro')).not.toBeInTheDocument()
  })
})
