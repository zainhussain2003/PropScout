/**
 * DealScore verdict-label unification tests.
 *
 * The showVerdict ladder must agree with the calc engine's get_verdict
 * brackets (≥80 strong / ≥65 good / ≥50 caution / ≥35 marginal / ≥20 do not
 * buy / <20 hard pass) at every boundary — the old hardcoded ≤25/≤35/≤50/≤65/≤80
 * ladder disagreed at each edge (exactly 80 showed "Good deal", 25 showed
 * "Hard pass"). When a backend verdict exists, its label is passed verbatim
 * via verdictLabel and never re-derived.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DealScore } from './DealScore'

describe('DealScore — verdict label matches the calc-engine brackets', () => {
  it.each([
    [80, 'Strong deal'],
    [79, 'Good deal'],
    [65, 'Good deal'],
    [64, 'Caution'],
    [50, 'Caution'],
    [49, 'Marginal'],
    [35, 'Marginal'],
    [34, 'Do not buy'],
    [25, 'Do not buy'],
    [20, 'Do not buy'],
    [19, 'Hard pass'],
    [8, 'Hard pass'],
  ])('score %i → "%s"', (score, label) => {
    render(<DealScore score={score} showVerdict animate={false} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('renders a backend verdictLabel verbatim instead of re-deriving (one source of truth)', () => {
    // A gated backend score can carry a verdict the raw brackets wouldn't
    // produce — the display must never overrule the calc engine.
    render(
      <DealScore score={40} showVerdict verdictLabel="Marginal" tone="caution" animate={false} />
    )
    expect(screen.getByText('Marginal')).toBeInTheDocument()
  })
})
