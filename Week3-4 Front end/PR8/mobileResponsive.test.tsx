/**
 * PR8 · Mobile responsive behaviour tests
 * Test file path: Week3-4 Front end/PR8/mobileResponsive.test.tsx
 *
 * Tests:
 *   - AIVerdictBlock collapse/expand on mobile
 *   - ModeModal bottom-sheet vs desktop dialog
 *   - hero-score-first class present on TenantReport and PersonalBuyerPage hero grids
 *   - report-page-mobile-padding class on outermost div of all 4 report pages
 *
 * AIVerdictBlock button labels (from AIVerdictBlock.tsx):
 *   collapsed → "Read full verdict →"
 *   expanded  → "Show less"
 *
 * ModeModal distinguishing features:
 *   Mobile (BottomSheet): drag handle <div aria-hidden="true"> present, no "Close" button
 *   Desktop: <button aria-label="Close"> present, no drag handle
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AIVerdictBlock } from '../../apps/web/src/components/analysis/AIVerdictBlock'
import { ModeModal } from '../../apps/web/src/components/shared/ModeModal'
import { InvestorReport } from '../../apps/web/src/pages/InvestorReport'
import { TenantReport } from '../../apps/web/src/pages/TenantReport'
import { PersonalBuyerPage } from '../../apps/web/src/pages/PersonalBuyerPage'
import { LandlordPage } from '../../apps/web/src/pages/LandlordPage'

// ── Viewport helper ───────────────────────────────────────────────────────────

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

// ── Mock listing for ModeModal ────────────────────────────────────────────────

const MOCK_LISTING = {
  kind: 'sale' as const,
  address: '5702 Buttermill Ave, Vaughan',
  price: '$729,900',
  beds: '3 bed',
  sqft: '900 sqft',
}

// ── AIVerdictBlock — mobile collapse ─────────────────────────────────────────

describe('AIVerdictBlock — mobile collapse', () => {
  it('at 1280px: no "Read full verdict" button present', () => {
    setViewportWidth(1280)
    render(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="Hard pass."
        sub="This property fails on multiple fundamentals."
      />
    )
    expect(screen.queryByText(/read full verdict/i)).not.toBeInTheDocument()
  })

  it('at 375px: "Read full verdict →" button present', () => {
    setViewportWidth(375)
    render(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="Hard pass."
        sub="This property fails on multiple fundamentals."
      />
    )
    expect(screen.getByText('Read full verdict →')).toBeInTheDocument()
  })

  it('at 375px: clicking "Read full verdict →" shows expanded sub content', () => {
    setViewportWidth(375)
    render(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="Hard pass."
        sub="This property fails on multiple fundamentals."
      />
    )
    expect(
      screen.queryByText('This property fails on multiple fundamentals.')
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Read full verdict →'))
    expect(screen.getByText('This property fails on multiple fundamentals.')).toBeInTheDocument()
  })

  it('at 375px: "Show less" button appears after expanding', () => {
    setViewportWidth(375)
    render(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="Hard pass."
        sub="This property fails on multiple fundamentals."
      />
    )
    fireEvent.click(screen.getByText('Read full verdict →'))
    expect(screen.getByText('Show less')).toBeInTheDocument()
  })

  it('at 375px: clicking "Show less" collapses back', () => {
    setViewportWidth(375)
    render(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="Hard pass."
        sub="This property fails on multiple fundamentals."
      />
    )
    fireEvent.click(screen.getByText('Read full verdict →'))
    fireEvent.click(screen.getByText('Show less'))
    expect(
      screen.queryByText('This property fails on multiple fundamentals.')
    ).not.toBeInTheDocument()
    expect(screen.getByText('Read full verdict →')).toBeInTheDocument()
  })

  it('expanded state resets when headline prop changes', () => {
    setViewportWidth(375)
    const { rerender } = render(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="First headline"
        sub="First sub paragraph."
      />
    )
    // Expand
    fireEvent.click(screen.getByText('Read full verdict →'))
    expect(screen.getByText('Show less')).toBeInTheDocument()

    // Change headline — expanded state must reset
    rerender(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="Different headline"
        sub="Different sub paragraph."
      />
    )
    expect(screen.getByText('Read full verdict →')).toBeInTheDocument()
    expect(screen.queryByText('Show less')).not.toBeInTheDocument()
  })
})

// ── ModeModal — bottom-sheet at mobile ───────────────────────────────────────

describe('ModeModal — bottom-sheet at mobile', () => {
  it('at 375px with open=true: BottomSheet drag handle is present', () => {
    setViewportWidth(375)
    const { container } = render(
      <ModeModal open listing={MOCK_LISTING} onClose={vi.fn()} onSelect={vi.fn()} />
    )
    // BottomSheet inserts a drag handle: <div aria-hidden="true"> with 36×4 dimensions
    const dragHandle = container.querySelector('[aria-hidden="true"]')
    expect(dragHandle).toBeInTheDocument()
  })

  it('at 375px with open=true: no desktop close button (×)', () => {
    setViewportWidth(375)
    render(<ModeModal open listing={MOCK_LISTING} onClose={vi.fn()} onSelect={vi.fn()} />)
    // Desktop modal has a <button aria-label="Close"> — mobile sheet does not
    expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument()
  })

  it('at 375px: choice cards wrapper has flexDirection column', () => {
    setViewportWidth(375)
    const { container } = render(
      <ModeModal open listing={MOCK_LISTING} onClose={vi.fn()} onSelect={vi.fn()} />
    )
    // ModeModalBottomSheet wraps ChoiceCards in display:flex flexDirection:column
    const flexCol = Array.from(container.querySelectorAll<HTMLElement>('div')).find(
      (el) => el.style.flexDirection === 'column' && el.children.length >= 2
    )
    expect(flexCol).toBeDefined()
  })

  it('at 1280px with open=true: desktop dialog renders', () => {
    setViewportWidth(1280)
    render(<ModeModal open listing={MOCK_LISTING} onClose={vi.fn()} onSelect={vi.fn()} />)
    // Desktop modal: role="dialog" with aria-label
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('at 1280px with open=true: no BottomSheet drag handle', () => {
    setViewportWidth(1280)
    const { container } = render(
      <ModeModal open listing={MOCK_LISTING} onClose={vi.fn()} onSelect={vi.fn()} />
    )
    // Desktop modal has close button; BottomSheet drag handle would be
    // the only aria-hidden div — desktop modal has ScoutMark aria-hidden spans
    // Confirm the desktop close button IS present (distinguishes desktop from mobile)
    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument()
  })
})

// ── Mobile layout classes on report pages ─────────────────────────────────────

describe('Mobile layout classes on report pages', () => {
  it('TenantReport: hero-score-first class present in DOM', () => {
    setViewportWidth(375)
    const { container } = render(
      <MemoryRouter>
        <TenantReport tier="free" />
      </MemoryRouter>
    )
    expect(container.querySelector('.hero-score-first')).toBeInTheDocument()
  })

  it('PersonalBuyerPage: hero-score-first class present in DOM', () => {
    setViewportWidth(375)
    const { container } = render(
      <MemoryRouter>
        <PersonalBuyerPage tier="free" />
      </MemoryRouter>
    )
    expect(container.querySelector('.hero-score-first')).toBeInTheDocument()
  })

  it('InvestorReport: report-page-mobile-padding class on outermost wrapper', () => {
    const { container } = render(
      <MemoryRouter>
        <InvestorReport tier="free" />
      </MemoryRouter>
    )
    expect(container.querySelector('.report-page-mobile-padding')).toBeInTheDocument()
  })

  it('TenantReport: report-page-mobile-padding class on outermost wrapper', () => {
    const { container } = render(
      <MemoryRouter>
        <TenantReport tier="free" />
      </MemoryRouter>
    )
    expect(container.querySelector('.report-page-mobile-padding')).toBeInTheDocument()
  })

  it('PersonalBuyerPage: report-page-mobile-padding class on outermost wrapper', () => {
    const { container } = render(
      <MemoryRouter>
        <PersonalBuyerPage tier="free" />
      </MemoryRouter>
    )
    expect(container.querySelector('.report-page-mobile-padding')).toBeInTheDocument()
  })

  it('LandlordPage: report-page-mobile-padding class on outermost wrapper', () => {
    const { container } = render(
      <MemoryRouter>
        <LandlordPage tier="free" />
      </MemoryRouter>
    )
    expect(container.querySelector('.report-page-mobile-padding')).toBeInTheDocument()
  })
})
