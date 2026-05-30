/**
 * HardLimitGate — unit tests
 *
 * PR7 · Paywall component tests
 * Test file path: Week3-4 Front end/PR7/hardLimitGate.test.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HardLimitGate } from '../../apps/web/src/components/paywall/HardLimitGate'

describe('HardLimitGate — monthlyLimit=3, used=3', () => {
  it('renders exactly 3 dot elements', () => {
    render(<HardLimitGate onClose={vi.fn()} monthlyLimit={3} used={3} resetsIn="32 days" />)
    const dots = screen.getAllByTestId('hard-limit-dot')
    expect(dots).toHaveLength(3)
  })

  it('renders "32 days" text', () => {
    render(<HardLimitGate onClose={vi.fn()} monthlyLimit={3} used={3} resetsIn="32 days" />)
    // "32 days" appears both in the body and in the reset date row
    expect(screen.getAllByText(/32 days/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders "$10" price text', () => {
    render(<HardLimitGate onClose={vi.fn()} monthlyLimit={3} used={3} resetsIn="32 days" />)
    // "$10" appears in both the "$10" price and "$100/yr" line
    expect(screen.getAllByText(/\$10/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Upgrade now" button', () => {
    render(<HardLimitGate onClose={vi.fn()} monthlyLimit={3} used={3} resetsIn="32 days" />)
    expect(screen.getByText(/Upgrade now/)).toBeInTheDocument()
  })

  it('renders "Wait it out" button', () => {
    render(<HardLimitGate onClose={vi.fn()} monthlyLimit={3} used={3} resetsIn="32 days" />)
    expect(screen.getByText('Wait it out')).toBeInTheDocument()
  })
})

describe('HardLimitGate — interactions', () => {
  it('calls onClose exactly once when "Wait it out" is clicked', () => {
    const onClose = vi.fn()
    render(<HardLimitGate onClose={onClose} monthlyLimit={3} used={3} resetsIn="32 days" />)
    fireEvent.click(screen.getByText('Wait it out'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('HardLimitGate — monthlyLimit=5, used=2', () => {
  it('renders exactly 5 dot elements', () => {
    render(<HardLimitGate onClose={vi.fn()} monthlyLimit={5} used={2} />)
    const dots = screen.getAllByTestId('hard-limit-dot')
    expect(dots).toHaveLength(5)
  })
})
