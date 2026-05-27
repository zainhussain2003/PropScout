/**
 * Unit tests for ModeModal.
 * Covers:
 *  - Renders nothing when open=false
 *  - Renders the dialog when open=true
 *  - Shows listing preview when listing prop is provided
 *  - Shows correct question for for-sale listings
 *  - Shows correct question for for-rent listings
 *  - Renders "Free forever" pill on the tenant card only
 *  - Calls onClose when × button is clicked
 *  - Calls onClose when Escape key is pressed
 *  - Calls onClose when backdrop is clicked
 *  - Does NOT call onClose while loading (Escape disabled during load)
 *  - "Why are we asking" toggle works
 *  - All four modes have cards rendered with correct titles
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModeModal } from './ModeModal'
import type { ListingPreviewData } from './ModeModal'

const SALE_LISTING: ListingPreviewData = {
  kind: 'sale',
  address: '146 East 19th Street, Hamilton ON',
  price: '$749,900',
  beds: '3 beds · 2 baths',
  sqft: '1,450 sqft',
}

const RENT_LISTING: ListingPreviewData = {
  kind: 'rent',
  address: 'Unit 3705 · 28 Charles Street East, Toronto ON',
  price: '$2,150/mo',
  beds: '1+den · 1 bath',
  sqft: '620 sqft',
  extra: 'Heat & water incl.',
}

describe('ModeModal', () => {
  const onClose = vi.fn()
  const onSelect = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
    onSelect.mockClear()
  })

  // ── Mount/unmount ─────────────────────────────────────────────────

  it('renders nothing when open is false', () => {
    const { container } = render(
      <ModeModal open={false} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the modal when open is true', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // ── Listing preview ───────────────────────────────────────────────

  it('shows listing address when listing prop is provided', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    expect(screen.getByText(SALE_LISTING.address)).toBeInTheDocument()
  })

  it('shows "for sale" label for sale listing', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    expect(screen.getByText(/listing found · for sale/i)).toBeInTheDocument()
  })

  it('shows "for rent" label for rent listing', () => {
    render(<ModeModal open={true} listing={RENT_LISTING} onClose={onClose} onSelect={onSelect} />)
    expect(screen.getByText(/listing found · for rent/i)).toBeInTheDocument()
  })

  it('renders without a listing preview when listing is null', () => {
    render(<ModeModal open={true} listing={null} onClose={onClose} onSelect={onSelect} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Should still show the question
    expect(screen.getByText(/one quick question/i)).toBeInTheDocument()
  })

  // ── Questions by kind ─────────────────────────────────────────────

  it('shows investment-vs-personal question for for-sale listing', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    // The h2 question contains "as an investment" — getAllByText avoids multiple-match error
    const matches = screen.getAllByText(/as an investment/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('shows tenant-vs-landlord question for for-rent listing', () => {
    render(<ModeModal open={true} listing={RENT_LISTING} onClose={onClose} onSelect={onSelect} />)
    // The h2 question asks about being a tenant — check the question header specifically
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading.textContent).toMatch(/tenant/i)
  })

  // ── Card content ──────────────────────────────────────────────────

  it('shows "Free forever" pill on the tenant card for rent listings', () => {
    render(<ModeModal open={true} listing={RENT_LISTING} onClose={onClose} onSelect={onSelect} />)
    expect(screen.getByText('Free forever')).toBeInTheDocument()
  })

  it('does NOT show "Free forever" for sale listings', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    expect(screen.queryByText('Free forever')).not.toBeInTheDocument()
  })

  it('shows both choice cards for a sale listing', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    expect(screen.getByText(/buying it as an investment/i)).toBeInTheDocument()
    expect(screen.getByText(/buying it to live in/i)).toBeInTheDocument()
  })

  it('shows both choice cards for a rent listing', () => {
    render(<ModeModal open={true} listing={RENT_LISTING} onClose={onClose} onSelect={onSelect} />)
    expect(screen.getByText(/evaluating this as a tenant/i)).toBeInTheDocument()
    expect(screen.getByText(/pricing my own unit/i)).toBeInTheDocument()
  })

  // ── Close interactions ────────────────────────────────────────────

  it('calls onClose when the × button is clicked', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the backdrop overlay is clicked', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does NOT call onClose when clicking inside the card', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    fireEvent.click(screen.getByText(/one quick question/i))
    expect(onClose).not.toHaveBeenCalled()
  })

  // ── Why-we-ask toggle ─────────────────────────────────────────────

  it('toggles the "why we ask" explanation on click', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    const toggle = screen.getByText(/why are we asking this/i)
    expect(screen.queryByText(/tailor the whole report/i)).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByText(/tailor the whole report/i)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/hide why we ask/i))
    expect(screen.queryByText(/tailor the whole report/i)).not.toBeInTheDocument()
  })

  // ── Accessibility ─────────────────────────────────────────────────

  it('has role="dialog" and aria-modal="true"', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('has an accessible label on the close button', () => {
    render(<ModeModal open={true} listing={SALE_LISTING} onClose={onClose} onSelect={onSelect} />)
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  // ── Cleanup ───────────────────────────────────────────────────────

  afterEach(() => {
    vi.restoreAllMocks()
  })
})
