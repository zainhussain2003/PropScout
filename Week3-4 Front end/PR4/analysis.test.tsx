/**
 * analysis.test.tsx — unit + snapshot tests for all 7 analysis/ components.
 *
 * Components under test:
 *   DealScore, Metric, RentalCompsBar, AIVerdictBlock,
 *   RiskRow, MiniMap, PropertyHero
 *
 * Coverage:
 *   - rendering (every visible element), ARIA accessibility,
 *     prop-driven behaviour, one snapshot per component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe } from 'jest-axe'

import { DealScore } from '../../apps/web/src/components/analysis/DealScore'
import { Metric } from '../../apps/web/src/components/analysis/Metric'
import { RentalCompsBar } from '../../apps/web/src/components/analysis/RentalCompsBar'
import { AIVerdictBlock } from '../../apps/web/src/components/analysis/AIVerdictBlock'
import { RiskRow } from '../../apps/web/src/components/analysis/RiskRow'
import { MiniMap } from '../../apps/web/src/components/analysis/MiniMap'
import { PropertyHero } from '../../apps/web/src/components/analysis/PropertyHero'

import type { DealScoreData, ListingData, MapPin } from '../../apps/web/src/types/analysis'
import { mockVaughanAnalysis } from './testHelpers'
import { toDealScoreData } from '../../apps/web/src/lib/investorCalc'

// ── Shared fixtures ────────────────────────────────────────────────────────────

const VAUGHAN_SCORE: DealScoreData = toDealScoreData(mockVaughanAnalysis.dealScore!)

/** Convenience reference to Vaughan mock metrics for inline numeric values. */
const VAUGHAN_LISTING = mockVaughanAnalysis.metrics

// ── DealScore ──────────────────────────────────────────────────────────────────

describe('DealScore', () => {
  it('renders the clamped score as a visible number', () => {
    render(<DealScore score={8} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('clamps scores above 95 to 95', () => {
    render(<DealScore score={110} />)
    expect(screen.getByText('95')).toBeInTheDocument()
  })

  it('clamps negative scores to 0', () => {
    render(<DealScore score={-5} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('has a descriptive aria-label with score and max', () => {
    render(<DealScore score={8} />)
    expect(screen.getByLabelText('Deal score: 8 out of 95')).toBeInTheDocument()
  })

  it('renders the optional label text when provided', () => {
    render(<DealScore score={8} label="Deal score / 100" />)
    expect(screen.getByText('Deal score / 100')).toBeInTheDocument()
  })

  it('renders verdict text when showVerdict=true and score ≤ 25', () => {
    render(<DealScore score={8} showVerdict />)
    expect(screen.getByText('Hard pass')).toBeInTheDocument()
  })

  it('renders "Strong deal" verdict text when showVerdict=true and score > 80', () => {
    render(<DealScore score={85} showVerdict />)
    expect(screen.getByText('Strong deal')).toBeInTheDocument()
  })

  it('renders "Good deal" verdict text for score 65–80', () => {
    render(<DealScore score={72} showVerdict />)
    expect(screen.getByText('Good deal')).toBeInTheDocument()
  })

  it('renders sm size (84px viewBox)', () => {
    const { container } = render(<DealScore score={50} size="sm" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 84 84')
  })

  it('renders lg size (180px viewBox)', () => {
    const { container } = render(<DealScore score={50} size="lg" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 180 180')
  })

  it('SVG has aria-hidden="true" (outer wrapper div carries the label)', () => {
    const { container } = render(<DealScore score={50} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(<DealScore score={72} label="Deal score / 100" showVerdict />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <DealScore score={8} size="md" label="Deal score / 100" showVerdict animate={false} />
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── Metric ─────────────────────────────────────────────────────────────────────

describe('Metric', () => {
  it('renders label, value, and sub text', () => {
    render(<Metric label="Cap rate" value="1.47%" sub="Below 3% threshold" />)
    expect(screen.getByText('Cap rate')).toBeInTheDocument()
    expect(screen.getByText('1.47%')).toBeInTheDocument()
    expect(screen.getByText('Below 3% threshold')).toBeInTheDocument()
  })

  it('renders without sub text when sub is omitted', () => {
    render(<Metric label="NOI" value="$10,730" />)
    expect(screen.getByText('$10,730')).toBeInTheDocument()
    // No sub node — just make sure no crash
  })

  it('applies fail colour variable for status=fail', () => {
    const { container } = render(<Metric label="Cash flow" value="−$2,431" status="fail" />)
    // The value element uses STATUS_COLOR which maps fail → var(--fail)
    const valueEl = container.querySelector('.mono.tabular') as HTMLElement
    expect(valueEl.style.color).toBe('var(--fail)')
  })

  it('applies pass colour variable for status=pass', () => {
    const { container } = render(<Metric label="DSCR" value="1.16×" status="pass" />)
    const valueEl = container.querySelector('.mono.tabular') as HTMLElement
    expect(valueEl.style.color).toBe('var(--pass)')
  })

  it('applies neutral colour (var(--ink)) by default', () => {
    const { container } = render(<Metric label="GRM" value="20.97" />)
    const valueEl = container.querySelector('.mono.tabular') as HTMLElement
    expect(valueEl.style.color).toBe('var(--ink)')
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <Metric label="Cap rate" value="1.47%" sub="Below 3% threshold" status="fail" />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <Metric label="Cap rate" value="1.47%" sub="Below 3% threshold" status="fail" />
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── RentalCompsBar ─────────────────────────────────────────────────────────────

describe('RentalCompsBar', () => {
  it('has role="region" with a descriptive aria-label', () => {
    render(<RentalCompsBar low={2700} mid={2900} high={3200} ask={2900} />)
    const region = screen.getByRole('region')
    expect(region).toHaveAttribute(
      'aria-label',
      'Rental comps: low $2,700, mid $2,900, high $3,200, estimate $2,900'
    )
  })

  it('renders low, mid, and high dollar labels', () => {
    render(<RentalCompsBar low={2700} mid={2900} high={3200} ask={2900} />)
    expect(screen.getByText('$2,700')).toBeInTheDocument()
    expect(screen.getByText('$2,900')).toBeInTheDocument()
    expect(screen.getByText('$3,200')).toBeInTheDocument()
  })

  it('diamond marker has aria-label with the estimate value', () => {
    render(<RentalCompsBar low={2700} mid={2900} high={3200} ask={2900} />)
    expect(screen.getByLabelText('Estimated rent: $2,900')).toBeInTheDocument()
  })

  it('shows "above comp range" warning when ask > high', () => {
    render(<RentalCompsBar low={2700} mid={2900} high={3200} ask={3500} />)
    expect(screen.getByText(/above comp range/i)).toBeInTheDocument()
  })

  it('shows "below comp range" warning when ask < low', () => {
    render(<RentalCompsBar low={2700} mid={2900} high={3200} ask={2400} />)
    expect(screen.getByText(/below comp range/i)).toBeInTheDocument()
  })

  it('shows hover tooltip when diamond is moused over', () => {
    render(<RentalCompsBar low={2700} mid={2900} high={3200} ask={2900} />)
    const diamond = screen.getByLabelText('Estimated rent: $2,900')
    fireEvent.mouseEnter(diamond)
    // Tooltip header appears
    expect(screen.getByText('Rent estimate')).toBeInTheDocument()
    expect(screen.getByText('Estimate')).toBeInTheDocument()
  })

  it('hides tooltip after mouse leave', () => {
    render(<RentalCompsBar low={2700} mid={2900} high={3200} ask={2900} />)
    const diamond = screen.getByLabelText('Estimated rent: $2,900')
    fireEvent.mouseEnter(diamond)
    fireEvent.mouseLeave(diamond)
    expect(screen.queryByText('Rent estimate')).not.toBeInTheDocument()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(<RentalCompsBar low={2700} mid={2900} high={3200} ask={2900} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(<RentalCompsBar low={2700} mid={2900} high={3200} ask={2900} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── AIVerdictBlock ─────────────────────────────────────────────────────────────

describe('AIVerdictBlock', () => {
  it('renders the eyebrow text', () => {
    render(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="Hard pass."
        sub="Deeply negative cash flow on every scenario."
      />
    )
    expect(screen.getByText(/Scout AI · investor verdict/i)).toBeInTheDocument()
  })

  it('renders the headline', () => {
    render(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="Hard pass."
        sub="Deeply negative cash flow on every scenario."
      />
    )
    expect(screen.getByText('Hard pass.')).toBeInTheDocument()
  })

  it('renders the sub paragraph', () => {
    render(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="Hard pass."
        sub="Deeply negative cash flow on every scenario."
      />
    )
    expect(screen.getByText('Deeply negative cash flow on every scenario.')).toBeInTheDocument()
  })

  it('renders JSX headline nodes', () => {
    render(
      <AIVerdictBlock
        eyebrow="eyebrow"
        headline={
          <>
            Numbers don't <em>pencil</em>.
          </>
        }
        sub="details"
      />
    )
    expect(screen.getByText('pencil')).toBeInTheDocument()
  })

  it('ScoutMark watermark has aria-hidden="true"', () => {
    const { container } = render(<AIVerdictBlock eyebrow="eyebrow" headline="headline" sub="sub" />)
    // The watermark wrapper div has aria-hidden
    const watermark = container.querySelector('[aria-hidden="true"]')
    expect(watermark).toBeInTheDocument()
  })

  it('model tag "claude · sonnet 4.6" is always rendered', () => {
    render(<AIVerdictBlock eyebrow="eyebrow" headline="headline" sub="sub" />)
    expect(screen.getByText('claude · sonnet 4.6')).toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <AIVerdictBlock
        eyebrow="Scout AI · investor verdict"
        headline="Hard pass."
        sub="Deeply negative cash flow on every scenario."
      />
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── RiskRow ────────────────────────────────────────────────────────────────────

describe('RiskRow', () => {
  it('renders the flag label', () => {
    render(<RiskRow tone="red" label="Condo-fee burden" detail="$761/mo · 26% of rent" />)
    expect(screen.getByText('Condo-fee burden')).toBeInTheDocument()
  })

  it('renders the detail text', () => {
    render(<RiskRow tone="red" label="Condo-fee burden" detail="$761/mo · 26% of rent" />)
    expect(screen.getByText('$761/mo · 26% of rent')).toBeInTheDocument()
  })

  it('left bar uses var(--fail) for tone="red"', () => {
    const { container } = render(<RiskRow tone="red" label="Test" detail="detail" />)
    // The coloured bar is the first child span with aria-hidden
    const bar = container.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(bar.style.background).toBe('var(--fail)')
  })

  it('left bar uses var(--caution) for tone="amber"', () => {
    const { container } = render(<RiskRow tone="amber" label="Test" detail="detail" />)
    const bar = container.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(bar.style.background).toBe('var(--caution)')
  })

  it('left bar uses var(--pass) for tone="green"', () => {
    const { container } = render(<RiskRow tone="green" label="Test" detail="detail" />)
    const bar = container.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(bar.style.background).toBe('var(--pass)')
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(<RiskRow tone="red" label="Condo-fee burden" detail="$761/mo" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <RiskRow tone="red" label="Condo-fee burden" detail="$761/mo · 26% of rent" />
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── MiniMap ────────────────────────────────────────────────────────────────────

describe('MiniMap', () => {
  it('has role="img" for the map container', () => {
    render(<MiniMap address="5702-5 Buttermill Ave, Vaughan" />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('aria-label includes the property address', () => {
    render(<MiniMap address="5702-5 Buttermill Ave, Vaughan" />)
    const map = screen.getByRole('img')
    expect(map.getAttribute('aria-label')).toContain('5702-5 Buttermill Ave, Vaughan')
  })

  it('accepts custom height prop without error', () => {
    const { container } = render(<MiniMap address="5702-5 Buttermill Ave, Vaughan" height={400} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('accepts pins prop without error', () => {
    const pins: MapPin[] = [{ lat: 43.7956, lng: -79.5279, label: 'Subject property' }]
    const { container } = render(<MiniMap address="5702-5 Buttermill Ave, Vaughan" pins={pins} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(<MiniMap address="5702-5 Buttermill Ave, Vaughan" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(<MiniMap address="5702-5 Buttermill Ave, Vaughan" height={280} />)
    expect(container.firstChild).toMatchSnapshot()
  })
})

// ── PropertyHero ───────────────────────────────────────────────────────────────

describe('PropertyHero', () => {
  const LISTING: ListingData = {
    id: 'vaughan',
    addressLine1: 'Unit 5702 · 5 Buttermill Avenue',
    addressLine2: 'Vaughan · L4K · VMC Corridor',
    postal: 'L4K 5W4',
    province: 'ON',
    isToronto: false,
    propertyType: 'Condo apartment',
    beds: '3',
    baths: '2',
    sqft: 950,
    parking: '1',
    yearBuilt: 2020,
    rentControl: false,
    price: 729900,
    annualTaxes: 3326,
    condoFeeMonthly: 761,
    rentEstimate: 2900,
    rentLow: 2700,
    rentHigh: 3200,
    compCount: 8,
    compConfidence: 'medium',
    market: { cmhcVacancy: 0.018, rentalDOM: 18, rentTrend: 'declining' },
    riskFlags: [],
    chips: ['Investment · For sale', 'Vaughan · L4K', 'Condo · 950 sqft'],
  }

  const cashFlowMonthly = VAUGHAN_LISTING!.cashFlowMonthly
  const capRate = VAUGHAN_LISTING!.capRate
  const dscr = VAUGHAN_LISTING!.dscr

  it('renders the property address', () => {
    render(
      <PropertyHero
        listing={LISTING}
        score={VAUGHAN_SCORE}
        cashFlowMonthly={cashFlowMonthly}
        capRate={capRate}
        dscr={dscr}
      />
    )
    expect(screen.getByText('Unit 5702 · 5 Buttermill Avenue')).toBeInTheDocument()
  })

  it('renders the deal score total', () => {
    render(
      <PropertyHero
        listing={LISTING}
        score={VAUGHAN_SCORE}
        cashFlowMonthly={cashFlowMonthly}
        capRate={capRate}
        dscr={dscr}
      />
    )
    // DealScore renders the number; score.total = 8 (clamped)
    expect(screen.getByLabelText('Deal score: 8 out of 100')).toBeInTheDocument()
  })

  it('renders the verdict label', () => {
    render(
      <PropertyHero
        listing={LISTING}
        score={VAUGHAN_SCORE}
        cashFlowMonthly={cashFlowMonthly}
        capRate={capRate}
        dscr={dscr}
      />
    )
    // 'Hard pass' is the label for verdict = hard_pass
    expect(screen.getByText('Hard pass')).toBeInTheDocument()
  })

  it('renders all listing chips', () => {
    render(
      <PropertyHero
        listing={LISTING}
        score={VAUGHAN_SCORE}
        cashFlowMonthly={cashFlowMonthly}
        capRate={capRate}
        dscr={dscr}
      />
    )
    expect(screen.getByText('Investment · For sale')).toBeInTheDocument()
    expect(screen.getByText('Vaughan · L4K')).toBeInTheDocument()
    expect(screen.getByText('Condo · 950 sqft')).toBeInTheDocument()
  })

  it('renders "Analyze another listing" button', () => {
    render(
      <PropertyHero
        listing={LISTING}
        score={VAUGHAN_SCORE}
        cashFlowMonthly={cashFlowMonthly}
        capRate={capRate}
        dscr={dscr}
      />
    )
    expect(screen.getByRole('button', { name: /analyze another listing/i })).toBeInTheDocument()
  })

  it('calls onBack when the "Analyze another listing" button is clicked', () => {
    const onBack = vi.fn()
    render(
      <PropertyHero
        listing={LISTING}
        score={VAUGHAN_SCORE}
        cashFlowMonthly={cashFlowMonthly}
        capRate={capRate}
        dscr={dscr}
        onBack={onBack}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /analyze another listing/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('displays the asking price', () => {
    render(
      <PropertyHero
        listing={LISTING}
        score={VAUGHAN_SCORE}
        cashFlowMonthly={cashFlowMonthly}
        capRate={capRate}
        dscr={dscr}
      />
    )
    // fmtMoney(729900) → '$729,900'
    expect(screen.getByText('$729,900')).toBeInTheDocument()
  })

  it('has no axe accessibility violations', async () => {
    const { container } = render(
      <PropertyHero
        listing={LISTING}
        score={VAUGHAN_SCORE}
        cashFlowMonthly={cashFlowMonthly}
        capRate={capRate}
        dscr={dscr}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <PropertyHero
        listing={LISTING}
        score={VAUGHAN_SCORE}
        cashFlowMonthly={cashFlowMonthly}
        capRate={capRate}
        dscr={dscr}
      />
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})
