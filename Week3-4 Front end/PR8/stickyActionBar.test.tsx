/**
 * PR8 · StickyActionBar component tests
 * Test file path: Week3-4 Front end/PR8/stickyActionBar.test.tsx
 *
 * StickyActionBar returns null at desktop widths (>480px) and renders
 * at mobile widths (≤480px). Three buttons: Save, Share, PDF.
 * Callbacks: onSave, onShare, onPDF (all optional).
 *
 * Button labels from StickyActionBar.tsx: "Save", "Share", "PDF"
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StickyActionBar } from '../../apps/web/src/components/shared/StickyActionBar'

// ── Viewport helper ───────────────────────────────────────────────────────────

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

// ── StickyActionBar ───────────────────────────────────────────────────────────

describe('StickyActionBar', () => {
  it('returns null at desktop width (1280px)', () => {
    setViewportWidth(1280)
    const { container } = render(<StickyActionBar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders at mobile width (375px)', () => {
    setViewportWidth(375)
    const { container } = render(<StickyActionBar />)
    expect(container).not.toBeEmptyDOMElement()
  })

  it('Save button present at 375px', () => {
    setViewportWidth(375)
    render(<StickyActionBar />)
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('Share button present at 375px', () => {
    setViewportWidth(375)
    render(<StickyActionBar />)
    expect(screen.getByText('Share')).toBeInTheDocument()
  })

  it('PDF button present at 375px', () => {
    setViewportWidth(375)
    render(<StickyActionBar />)
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('clicking Save calls onSave prop', () => {
    setViewportWidth(375)
    const onSave = vi.fn()
    render(<StickyActionBar onSave={onSave} />)
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('clicking Share calls onShare prop', () => {
    setViewportWidth(375)
    const onShare = vi.fn()
    render(<StickyActionBar onShare={onShare} />)
    fireEvent.click(screen.getByText('Share'))
    expect(onShare).toHaveBeenCalledOnce()
  })

  it('clicking PDF calls onPDF prop', () => {
    setViewportWidth(375)
    const onPDF = vi.fn()
    render(<StickyActionBar onPDF={onPDF} />)
    fireEvent.click(screen.getByText('PDF'))
    expect(onPDF).toHaveBeenCalledOnce()
  })

  it('bar disappears after resize from 375px to 1280px', async () => {
    setViewportWidth(375)
    const { container } = render(<StickyActionBar />)
    expect(container).not.toBeEmptyDOMElement()
    setViewportWidth(1280)
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })
})
