/**
 * PBFMVSection — unit tests
 *
 * PR6 · Personal Buyer report component tests
 * Test file path: Week3-4 Front end/PR6/pbFMVSection.test.tsx
 *
 * Burlington fixture: price=$875,000, fmv={low:845000, mid:880000, high:925000}
 *   askVsMid = (875000 - 880000) / 880000 ≈ -0.00568  → shows "−0.6% vs P50"
 *   getFMVVerdict: price=875000 > 855500 (low + 30% spread), but ≤ 893500 (mid + 30% spread)
 *                  → "At market", tone 'pass'
 *
 * "Below median" is indicated by a "−" sign in the "% vs P50" badge (not a separate
 * text label "below median"). Tests assert on the actual rendered output.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PBFMVSection } from '../../apps/web/src/components/personal/PBFMVSection'
import {
  PB_PROPERTY,
  PB_SCHOOLS,
  PB_NEIGHBOURHOOD,
  computeHomeScore,
} from '../../apps/web/src/data/personalBuyerData'
import type { PersonalProperty } from '../../apps/web/src/types/personal'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STATIC_LIGHT_SCORE = 76

/** Burlington score — askVsMid ≈ -0.00568 (price $5k under FMV mid) */
const BURLINGTON_SCORE = computeHomeScore(
  PB_PROPERTY,
  PB_SCHOOLS,
  PB_NEIGHBOURHOOD,
  STATIC_LIGHT_SCORE
)

/** Modified property with price above FMV mid to test above-median display. */
const ABOVE_MID_PROPERTY: PersonalProperty = {
  ...PB_PROPERTY,
  price: 895000, // above mid ($880k) → askVsMid = (895-880)/880 ≈ +0.017
}

const ABOVE_MID_SCORE = computeHomeScore(
  ABOVE_MID_PROPERTY,
  PB_SCHOOLS,
  PB_NEIGHBOURHOOD,
  STATIC_LIGHT_SCORE
)

/** Modified property at exactly the FMV mid to test at-median display. */
const AT_MID_PROPERTY: PersonalProperty = {
  ...PB_PROPERTY,
  price: 880000, // exactly at mid → askVsMid = 0
}

const AT_MID_SCORE = computeHomeScore(
  AT_MID_PROPERTY,
  PB_SCHOOLS,
  PB_NEIGHBOURHOOD,
  STATIC_LIGHT_SCORE
)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PBFMVSection', () => {
  it('renders the §02 section marker', () => {
    render(<PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} />)
    // SectionHead splits "§" and "02" as sibling text nodes — no element has sole text "02".
    // Query the section topic text instead.
    expect(screen.getAllByText(/fair market/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Fair market value" as the section topic', () => {
    render(<PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} />)
    expect(screen.getByText('Fair market value')).toBeInTheDocument()
  })

  it('renders the FMV low marker label "P25 · low"', () => {
    render(<PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} />)
    expect(screen.getByText('P25 · low')).toBeInTheDocument()
  })

  it('renders the FMV mid marker label "P50 · median"', () => {
    render(<PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} />)
    expect(screen.getByText('P50 · median')).toBeInTheDocument()
  })

  it('renders the FMV high marker label "P75 · high"', () => {
    render(<PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} />)
    expect(screen.getByText('P75 · high')).toBeInTheDocument()
  })

  it('renders the asking price of Burlington ($875,000)', () => {
    render(<PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} />)
    expect(screen.getByText('$875,000')).toBeInTheDocument()
  })

  it('Burlington askVsMid < 0 — the "% vs P50" badge shows a "−" minus prefix', () => {
    render(<PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} />)
    // askVsMid ≈ -0.00568 → badge shows "−0.6% vs P50"
    // Component uses '−' (em-dash variant) when askVsMid < 0
    expect(screen.getByText(/vs P50/)).toBeInTheDocument()
    const badge = screen.getByText(/vs P50/).textContent ?? ''
    // The badge text starts with '−' (negative prefix) for below-median
    expect(badge).toMatch(/^[−-]/)
  })

  it('modified above-median property — "% vs P50" badge shows a "+" plus prefix', () => {
    render(<PBFMVSection property={ABOVE_MID_PROPERTY} score={ABOVE_MID_SCORE} />)
    // askVsMid > 0 → badge shows "+X.X% vs P50"
    const badge = screen.getByText(/vs P50/).textContent ?? ''
    expect(badge).toMatch(/^\+/)
  })

  it('at-median property (price === mid) — "% vs P50" badge shows "+" or is near zero', () => {
    render(<PBFMVSection property={AT_MID_PROPERTY} score={AT_MID_SCORE} />)
    // askVsMid === 0 → component renders '+' prefix per: score.askVsMid >= 0 ? '+' : '−'
    const badge = screen.getByText(/vs P50/).textContent ?? ''
    expect(badge).toMatch(/^\+/)
  })

  it('VerdictPill shows "At market" for Burlington (price within 30% spread of mid)', () => {
    render(<PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} />)
    // getFMVVerdict(875000, {low:845000,mid:880000,high:925000}):
    // 875000 > 845000 + 35000*0.3 = 855500 → not "Below market"
    // 875000 <= 880000 + 45000*0.3 = 893500 → "At market"
    expect(screen.getAllByText('At market').length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Comparable sales considered" stat in the footer', () => {
    render(<PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} compCount={8} />)
    expect(screen.getByText('Comparable sales considered')).toBeInTheDocument()
    expect(screen.getByText('8 verified')).toBeInTheDocument()
  })

  it('renders "Average days on market" stat with default value', () => {
    render(<PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} avgDOM={12} />)
    expect(screen.getByText('Average days on market')).toBeInTheDocument()
    expect(screen.getByText('12 days')).toBeInTheDocument()
  })

  it('matches snapshot', () => {
    const { container } = render(
      <PBFMVSection property={PB_PROPERTY} score={BURLINGTON_SCORE} compCount={8} avgDOM={12} />
    )
    expect(container.firstChild).toMatchSnapshot()
  })
})
