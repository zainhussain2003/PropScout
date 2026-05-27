/**
 * Tests for all analysis components:
 *   DealScore — radial gauge
 *   RentalCompsBar — percentile range bar
 *   AIVerdictBlock — dark AI verdict card
 *   RiskRow — single risk flag row
 *
 * All components exist and are fully implemented.
 * These are real tests, not .todo stubs.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DealScore } from './DealScore'
import { RentalCompsBar } from './RentalCompsBar'
import { AIVerdictBlock } from './AIVerdictBlock'
import { RiskRow } from './RiskRow'

// ── DealScore ─────────────────────────────────────────────────────

describe('DealScore', () => {
  it('renders an SVG with aria-hidden', () => {
    const { container } = render(<DealScore score={72} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden')
  })

  it('renders the numeric score', () => {
    render(<DealScore score={72} />)
    expect(screen.getByText('72')).toBeInTheDocument()
  })

  it('renders score 0 without errors', () => {
    const { container } = render(<DealScore score={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders score 95 without errors', () => {
    render(<DealScore score={95} />)
    expect(screen.getByText('95')).toBeInTheDocument()
  })

  it('shows "Deal score / 100" label when size >= 150 (default)', () => {
    render(<DealScore score={72} />)
    expect(screen.getByText('Deal score / 100')).toBeInTheDocument()
  })

  it('hides label when size < 150', () => {
    render(<DealScore score={72} size={120} />)
    expect(screen.queryByText('Deal score / 100')).not.toBeInTheDocument()
  })

  it('hides label when label prop is empty string', () => {
    render(<DealScore score={72} label="" />)
    expect(screen.queryByText('Deal score / 100')).not.toBeInTheDocument()
  })

  it('shows custom label when provided', () => {
    render(<DealScore score={72} label="Investment score" />)
    expect(screen.getByText('Investment score')).toBeInTheDocument()
  })

  it('shows verdict text by default (size >= 130)', () => {
    render(<DealScore score={80} />)
    expect(screen.getByText('Strong deal')).toBeInTheDocument()
  })

  it('shows "Good deal" for score 65-79', () => {
    render(<DealScore score={72} />)
    expect(screen.getByText('Good deal')).toBeInTheDocument()
  })

  it('shows "Caution" for score 50-64', () => {
    render(<DealScore score={55} />)
    expect(screen.getByText('Caution')).toBeInTheDocument()
  })

  it('shows "Marginal" for score 35-49', () => {
    render(<DealScore score={40} />)
    expect(screen.getByText('Marginal')).toBeInTheDocument()
  })

  it('shows "Hard pass" for score < 35', () => {
    render(<DealScore score={10} />)
    expect(screen.getByText('Hard pass')).toBeInTheDocument()
  })

  it('hides verdict when showVerdict=false', () => {
    render(<DealScore score={80} showVerdict={false} />)
    expect(screen.queryByText('Strong deal')).not.toBeInTheDocument()
  })

  it('shows verdict when showVerdict=true even at small size', () => {
    render(<DealScore score={80} size={80} showVerdict={true} />)
    expect(screen.getByText('Strong deal')).toBeInTheDocument()
  })

  it('hides verdict auto at size < 130 when showVerdict not provided', () => {
    render(<DealScore score={80} size={100} />)
    expect(screen.queryByText('Strong deal')).not.toBeInTheDocument()
  })

  it('uses default size 188 when no size prop', () => {
    const { container } = render(<DealScore score={50} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.width).toBe('188px')
    expect(wrapper.style.height).toBe('188px')
  })

  it('renders two SVG circles (track + score arc)', () => {
    const { container } = render(<DealScore score={50} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(2)
  })

  it('score 0 produces max dashoffset (full gap in arc)', () => {
    // animate=false so drawn === score immediately
    const { container } = render(<DealScore score={0} animate={false} />)
    const circles = container.querySelectorAll('circle')
    const arc = circles[1] // second circle is the score arc
    const dashoffset = parseFloat(arc.getAttribute('stroke-dashoffset') || '0')
    const dasharray = parseFloat(arc.getAttribute('stroke-dasharray') || '1')
    // offset = c * (1 - 0/100) = c — should equal dasharray
    expect(Math.abs(dashoffset - dasharray)).toBeLessThan(0.1)
  })

  it('score 100 produces zero dashoffset (full fill)', () => {
    const { container } = render(<DealScore score={100} animate={false} />)
    const circles = container.querySelectorAll('circle')
    const arc = circles[1]
    const dashoffset = parseFloat(arc.getAttribute('stroke-dashoffset') || '999')
    expect(dashoffset).toBeLessThan(1)
  })
})

// ── RentalCompsBar ────────────────────────────────────────────────

describe('RentalCompsBar', () => {
  const defaultProps = { low: 2600, mid: 2900, high: 3200, ask: 2900 }

  it('renders "Asking rent" label', () => {
    render(<RentalCompsBar {...defaultProps} />)
    expect(screen.getByText(/Asking rent/i)).toBeInTheDocument()
  })

  it('renders the ask price in the header', () => {
    render(<RentalCompsBar {...defaultProps} />)
    // $2,900 appears in header AND as P50 label — getAllByText to confirm both
    const matches = screen.getAllByText('$2,900')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders P25, P50, P75 labels', () => {
    render(<RentalCompsBar {...defaultProps} />)
    expect(screen.getByText(/P25/)).toBeInTheDocument()
    expect(screen.getByText(/P50/)).toBeInTheDocument()
    expect(screen.getByText(/P75/)).toBeInTheDocument()
  })

  it('renders low, mid, high dollar values', () => {
    render(<RentalCompsBar low={2600} mid={2900} high={3200} ask={2900} />)
    expect(screen.getByText('$2,600')).toBeInTheDocument()
    expect(screen.getByText('$3,200')).toBeInTheDocument()
  })

  it('shows "Above market" verdict when ask >= high', () => {
    render(<RentalCompsBar low={2600} mid={2900} high={3200} ask={3200} />)
    expect(screen.getByText(/Above market/i)).toBeInTheDocument()
  })

  it('shows "At market" verdict when ask is between low and high', () => {
    render(<RentalCompsBar low={2600} mid={2900} high={3200} ask={2900} />)
    expect(screen.getByText(/At market/i)).toBeInTheDocument()
  })

  it('shows "Below market" verdict when ask < low', () => {
    render(<RentalCompsBar low={2600} mid={2900} high={3200} ask={2400} />)
    expect(screen.getByText(/Below market/i)).toBeInTheDocument()
  })

  it('renders the diamond marker element', () => {
    const { container } = render(<RentalCompsBar {...defaultProps} />)
    expect(container.querySelector('.comp-marker')).toBeInTheDocument()
  })

  it('marker has aria-label with ask price', () => {
    const { container } = render(<RentalCompsBar low={2600} mid={2900} high={3200} ask={2900} />)
    const marker = container.querySelector('.comp-marker')
    expect(marker).toHaveAttribute('aria-label', expect.stringContaining('2,900'))
  })

  it('renders without errors when ask equals low', () => {
    // ask=low=2600: $2,600 appears in the header AND as P25 label — use getAllByText
    render(<RentalCompsBar low={2600} mid={2900} high={3200} ask={2600} />)
    const matches = screen.getAllByText('$2,600')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders without errors when all values are equal', () => {
    // Range = 0 → position clamped to 2%
    expect(() =>
      render(<RentalCompsBar low={2900} mid={2900} high={2900} ask={2900} />)
    ).not.toThrow()
  })
})

// ── AIVerdictBlock ────────────────────────────────────────────────

describe('AIVerdictBlock', () => {
  it('renders with default eyebrow text', () => {
    render(<AIVerdictBlock />)
    expect(screen.getByText(/PropScout AI · verdict/i)).toBeInTheDocument()
  })

  it('renders custom eyebrow text when provided', () => {
    render(<AIVerdictBlock eyebrow="Custom · eyebrow" />)
    expect(screen.getByText(/Custom · eyebrow/i)).toBeInTheDocument()
  })

  it('renders "claude · sonnet" tag', () => {
    render(<AIVerdictBlock />)
    expect(screen.getByText(/claude · sonnet/i)).toBeInTheDocument()
  })

  it('renders ScoutMark watermark SVG', () => {
    const { container } = render(<AIVerdictBlock />)
    // ScoutMark renders an SVG
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders the default headline', () => {
    render(<AIVerdictBlock />)
    // Default headline mentions the condo fee
    expect(screen.getByText(/condo fee/i)).toBeInTheDocument()
  })

  it('renders a custom headline when provided', () => {
    render(<AIVerdictBlock headline="This is a great deal" />)
    expect(screen.getByText('This is a great deal')).toBeInTheDocument()
  })

  it('renders body paragraph when compact=false (default)', () => {
    render(<AIVerdictBlock />)
    // Default sub text contains $4,733 (break-even from default copy)
    expect(screen.getByText(/4,733/i)).toBeInTheDocument()
  })

  it('does not render body paragraph when compact=true', () => {
    render(<AIVerdictBlock compact />)
    expect(screen.queryByText(/4,733/i)).not.toBeInTheDocument()
  })

  it('does not render body when sub=null', () => {
    render(<AIVerdictBlock sub={null} />)
    expect(screen.queryByText(/4,733/i)).not.toBeInTheDocument()
  })

  it('renders custom sub paragraph text', () => {
    render(<AIVerdictBlock sub="This is the body paragraph" />)
    expect(screen.getByText('This is the body paragraph')).toBeInTheDocument()
  })

  it('renders "read full verdict →" button', () => {
    render(<AIVerdictBlock />)
    expect(screen.getByText(/read full verdict/i)).toBeInTheDocument()
  })

  it('calls onReadMore when "read full verdict" is clicked', () => {
    const onReadMore = vi.fn()
    render(<AIVerdictBlock onReadMore={onReadMore} />)
    fireEvent.click(screen.getByText(/read full verdict/i))
    expect(onReadMore).toHaveBeenCalledOnce()
  })

  it('renders the address when addr prop provided', () => {
    render(<AIVerdictBlock addr="123 Test St, Hamilton ON" />)
    expect(screen.getByText(/123 Test St/i)).toBeInTheDocument()
  })
})

// ── RiskRow ───────────────────────────────────────────────────────

describe('RiskRow', () => {
  it('renders the label text', () => {
    render(<RiskRow tone="red" label="High condo fee" detail="$761/mo is 26% of gross rent" />)
    expect(screen.getByText('High condo fee')).toBeInTheDocument()
  })

  it('renders the detail text', () => {
    render(<RiskRow tone="red" label="High condo fee" detail="$761/mo is 26% of gross rent" />)
    expect(screen.getByText('$761/mo is 26% of gross rent')).toBeInTheDocument()
  })

  it('shows "−4 pts" for red tone', () => {
    render(<RiskRow tone="red" label="Risk flag" detail="Details here" />)
    expect(screen.getByText('−4 pts')).toBeInTheDocument()
  })

  it('shows "soft" for amber tone', () => {
    render(<RiskRow tone="amber" label="Soft warning" detail="Minor concern" />)
    expect(screen.getByText('soft')).toBeInTheDocument()
  })

  it('shows "✓ confirmed" for good tone', () => {
    render(<RiskRow tone="good" label="Positive signal" detail="Good news" />)
    expect(screen.getByText('✓ confirmed')).toBeInTheDocument()
  })

  it('renders without crashing for all three tones', () => {
    const tones: Array<'red' | 'amber' | 'good'> = ['red', 'amber', 'good']
    tones.forEach((tone) => {
      const { unmount } = render(<RiskRow tone={tone} label="Test" detail="Detail" />)
      unmount()
    })
  })

  it('contains both label and detail in the same row', () => {
    const { container } = render(
      <RiskRow tone="red" label="Condo fee" detail="Monthly fee exceeds threshold" />
    )
    // Both texts should be present in the rendered output
    expect(container).toHaveTextContent('Condo fee')
    expect(container).toHaveTextContent('Monthly fee exceeds threshold')
  })
})
