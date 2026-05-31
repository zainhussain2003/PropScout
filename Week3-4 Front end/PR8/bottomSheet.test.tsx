/**
 * PR8 · BottomSheet component tests
 * Test file path: Week3-4 Front end/PR8/bottomSheet.test.tsx
 *
 * BottomSheet renders null when closed, and a fixed-position sheet with
 * a drag handle when open. Backdrop click closes; sheet content click
 * does not. Escape key closes via window keydown listener.
 *
 * Drag handle: <div aria-hidden="true"> (36×4px pill) inside the sheet div.
 * Backdrop: outer <div role="dialog" aria-modal="true"> — onClick → onClose.
 * Sheet div: inner div — onClick → e.stopPropagation() (no close).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomSheet } from '../../apps/web/src/components/shared/BottomSheet'

// ── BottomSheet ───────────────────────────────────────────────────────────────

describe('BottomSheet', () => {
  it('renders null when open=false', () => {
    const { container } = render(
      <BottomSheet open={false} onClose={vi.fn()}>
        content
      </BottomSheet>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders children when open=true', () => {
    render(
      <BottomSheet open onClose={vi.fn()}>
        <div>test child</div>
      </BottomSheet>
    )
    expect(screen.getByText('test child')).toBeInTheDocument()
  })

  it('drag handle element present when open=true', () => {
    const { container } = render(
      <BottomSheet open onClose={vi.fn()}>
        content
      </BottomSheet>
    )
    // Drag handle is a div with aria-hidden="true" inside the sheet
    const handle = container.querySelector('[aria-hidden="true"]')
    expect(handle).toBeInTheDocument()
  })

  it('backdrop element present (role=dialog)', () => {
    render(
      <BottomSheet open onClose={vi.fn()}>
        content
      </BottomSheet>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('clicking the backdrop calls onClose', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <div>sheet content</div>
      </BottomSheet>
    )
    // The backdrop is the role="dialog" element; clicking it directly triggers onClose
    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking sheet content does NOT call onClose', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <div>sheet content</div>
      </BottomSheet>
    )
    // Click inside the sheet (stopPropagation prevents reaching backdrop handler)
    fireEvent.click(screen.getByText('sheet content'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Escape key calls onClose', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        content
      </BottomSheet>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Escape key does NOT call onClose when closed', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open={false} onClose={onClose}>
        content
      </BottomSheet>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('children are rendered inside the sheet', () => {
    render(
      <BottomSheet open onClose={vi.fn()}>
        <div>test child</div>
      </BottomSheet>
    )
    expect(screen.getByText('test child')).toBeInTheDocument()
  })
})
