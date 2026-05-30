/**
 * TruncatedVerdict — unit tests
 *
 * PR7 · Paywall component tests
 * Test file path: Week3-4 Front end/PR7/truncatedVerdict.test.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TruncatedVerdict } from '../../apps/web/src/components/paywall/TruncatedVerdict'

describe('TruncatedVerdict', () => {
  it('renders the first paragraph text', () => {
    render(<TruncatedVerdict firstParagraph="Scout says this deal is weak." onUnlock={vi.fn()} />)
    expect(screen.getByText('Scout says this deal is weak.')).toBeInTheDocument()
  })

  it('renders the data-testid="verdict-blur" wrapper element', () => {
    render(<TruncatedVerdict firstParagraph="Scout says this deal is weak." onUnlock={vi.fn()} />)
    expect(screen.getByTestId('verdict-blur')).toBeInTheDocument()
  })

  it('renders "Unlock full verdict" button text', () => {
    render(<TruncatedVerdict firstParagraph="Scout says this deal is weak." onUnlock={vi.fn()} />)
    expect(screen.getByText(/Unlock full verdict/)).toBeInTheDocument()
  })

  it('calls onUnlock exactly once when the unlock button is clicked', () => {
    const onUnlock = vi.fn()
    render(<TruncatedVerdict firstParagraph="Scout says this deal is weak." onUnlock={onUnlock} />)
    fireEvent.click(screen.getByText(/Unlock full verdict/))
    expect(onUnlock).toHaveBeenCalledTimes(1)
  })
})
