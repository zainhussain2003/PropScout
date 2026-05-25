// ModeModal.test.tsx — Unit tests for the ModeModal routing component.
//
// Tests:
//   - Renders nothing when open=false
//   - Renders backdrop and card when open=true
//   - Shows for-sale options when listing.kind === 'sale'
//   - Shows for-rent options when listing.kind === 'rent'
//   - Shows listing preview strip when listing is provided
//   - Calls onClose when Escape is pressed (not loading)
//   - Calls onSelect with the correct mode after selection animation
//   - Shows "Free forever" pill on the tenant card only
//   - "Why are we asking" toggle works
//   - Close button calls onClose
//   - Shows loading bar after a card is clicked

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ModeModal } from './ModeModal'
import type { ListingPreviewData } from './ModeModal'

afterEach(() => {
  vi.useRealTimers()
})

const SALE_LISTING: ListingPreviewData = {
  kind: 'sale',
  address: '5702-5 Buttermill Ave, Vaughan ON',
  price: '$729,900',
  beds: '3 bed · 2 bath',
  sqft: '~1,250 sqft',
}

const RENT_LISTING: ListingPreviewData = {
  kind: 'rent',
  address: 'Unit 3705 · 28 Charles St E, Toronto ON',
  price: '$2,150/mo',
  beds: '1+den · 1 bath',
  sqft: '~620 sqft',
}

// ── Render helper ─────────────────────────────────────────────────

function renderModal(props: {
  open?: boolean
  /** Pass `null` explicitly to test no-listing state; omit to use SALE_LISTING. */
  listing?: ListingPreviewData | null
  onClose?: () => void
  onSelect?: (mode: string) => void
}): { onClose: () => void; onSelect: (mode: string) => void } & ReturnType<typeof render> {
  const onClose = props.onClose ?? vi.fn()
  const onSelect = props.onSelect ?? vi.fn()
  // null is intentional (no listing); undefined means "use default"
  const listing = props.listing !== undefined ? props.listing : SALE_LISTING
  return {
    onClose,
    onSelect,
    ...render(
      <ModeModal
        open={props.open ?? true}
        listing={listing}
        onClose={onClose}
        onSelect={onSelect}
      />
    ),
  }
}

// ── Tests ─────────────────────────────────────────────────────────

describe('ModeModal', () => {
  // ── Visibility ────────────────────────────────────────────────────

  it('renders nothing when open=false', () => {
    renderModal({ open: false })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the modal dialog when open=true', () => {
    renderModal({ open: true })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('shows the "One quick question" eyebrow', () => {
    renderModal({ open: true })
    expect(screen.getByText(/one quick question/i)).toBeTruthy()
  })

  // ── For-sale options ─────────────────────────────────────────────

  it('shows Investment option title for a sale listing', () => {
    renderModal({ listing: SALE_LISTING })
    // Card title is specific to the choice card
    expect(screen.getByText("I'm buying it as an investment")).toBeTruthy()
  })

  it('shows Personal option title for a sale listing', () => {
    renderModal({ listing: SALE_LISTING })
    expect(screen.getByText("I'm buying it to live in")).toBeTruthy()
  })

  it('shows the sale routing question', () => {
    renderModal({ listing: SALE_LISTING })
    // "buying this" is unique to the sale question
    expect(screen.getByText(/buying this/i)).toBeTruthy()
  })

  // ── For-rent options ─────────────────────────────────────────────

  it('shows Tenant option title for a rent listing', () => {
    renderModal({ listing: RENT_LISTING })
    expect(screen.getByText("I'm evaluating this as a tenant")).toBeTruthy()
  })

  it('shows Landlord option title for a rent listing', () => {
    renderModal({ listing: RENT_LISTING })
    expect(screen.getByText("I'm pricing my own unit")).toBeTruthy()
  })

  it('shows the rent routing question', () => {
    renderModal({ listing: RENT_LISTING })
    // "looking at this" is unique to the rent question
    expect(screen.getByText(/looking at this/i)).toBeTruthy()
  })

  // ── Listing preview ───────────────────────────────────────────────

  it('shows the listing address in the preview strip', () => {
    renderModal({ listing: SALE_LISTING })
    expect(screen.getByText(/buttermill/i)).toBeTruthy()
  })

  it('shows "for sale" in the listing preview status', () => {
    renderModal({ listing: SALE_LISTING })
    expect(screen.getByText(/listing found · for sale/i)).toBeTruthy()
  })

  it('shows "for rent" in the listing preview status for rent listings', () => {
    renderModal({ listing: RENT_LISTING })
    expect(screen.getByText(/listing found · for rent/i)).toBeTruthy()
  })

  // ── Free pill ────────────────────────────────────────────────────

  it('shows "Free forever" pill only on the tenant card', () => {
    renderModal({ listing: RENT_LISTING })
    const pills = screen.getAllByText(/free forever/i)
    expect(pills).toHaveLength(1)
  })

  it('does not show "Free forever" pill on sale listing cards', () => {
    renderModal({ listing: SALE_LISTING })
    expect(screen.queryByText(/free forever/i)).toBeNull()
  })

  // ── Close behaviour (synchronous — no fake timers needed) ─────────

  it('calls onClose when the × button is clicked', () => {
    const { onClose } = renderModal({})
    const closeBtn = screen.getByLabelText(/close/i)
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', () => {
    const { onClose } = renderModal({})
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // ── Why we ask toggle ────────────────────────────────────────────

  it('shows explanation when "Why are we asking" is clicked', () => {
    renderModal({})
    const btn = screen.getByText(/why are we asking/i)
    fireEvent.click(btn)
    expect(screen.getByText(/tailor the whole report/i)).toBeTruthy()
  })

  it('hides explanation when toggle is clicked again', () => {
    renderModal({})
    const btn = screen.getByText(/why are we asking/i)
    fireEvent.click(btn)
    fireEvent.click(screen.getByText(/hide why we ask/i))
    expect(screen.queryByText(/tailor the whole report/i)).toBeNull()
  })

  // ── Mode selection ───────────────────────────────────────────────

  it('shows loading bar after a choice card is clicked', () => {
    vi.useFakeTimers()
    renderModal({ listing: SALE_LISTING })

    // Find the Investment choice card button by its specific title text
    const investBtn = screen.getByText("I'm buying it as an investment").closest('button')
    expect(investBtn).toBeTruthy()

    act(() => {
      fireEvent.click(investBtn!)
      vi.advanceTimersByTime(200)
    })

    expect(screen.getByText(/opening your report/i)).toBeTruthy()
  })

  it('calls onSelect with "investor" after the progress animation completes', async () => {
    vi.useFakeTimers()
    const { onSelect } = renderModal({ listing: SALE_LISTING })

    const investBtn = screen.getByText("I'm buying it as an investment").closest('button')
    expect(investBtn).toBeTruthy()

    act(() => {
      fireEvent.click(investBtn!)
      // Advance through full animation: 9 ticks × 180ms = 1620ms + 250ms delay
      vi.advanceTimersByTime(2500)
    })

    vi.useRealTimers()

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('investor')
    })
  })

  it('calls onSelect with "tenant" for rent listings', async () => {
    vi.useFakeTimers()
    const { onSelect } = renderModal({ listing: RENT_LISTING })

    const tenantBtn = screen.getByText("I'm evaluating this as a tenant").closest('button')
    expect(tenantBtn).toBeTruthy()

    act(() => {
      fireEvent.click(tenantBtn!)
      vi.advanceTimersByTime(2500)
    })

    vi.useRealTimers()

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('tenant')
    })
  })

  // ── null listing ─────────────────────────────────────────────────

  it('renders without a listing preview when listing is null', () => {
    renderModal({ listing: null })
    expect(screen.getByRole('dialog')).toBeTruthy()
    // Preview strip is absent
    expect(screen.queryByText(/listing found/i)).toBeNull()
  })
})
