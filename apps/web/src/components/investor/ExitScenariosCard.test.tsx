/**
 * ExitScenariosCard — the sale-return table under §07 (D-110).
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ExitScenariosCard } from './ExitScenariosCard'
import { EquitySection } from './EquitySection'
import {
  VAUGHAN_LISTING,
  VAUGHAN_STABLE_METRICS,
  DEFAULT_FINANCING_INPUTS,
} from '../../constants/demoData'
import { computeDemoMetrics, enrichMetrics } from '../../lib/investorCalc'
import { computeExitScenarios } from '../../lib/exitScenarios'

function metricsFor(listing: typeof VAUGHAN_LISTING): ReturnType<typeof enrichMetrics> {
  const base = computeDemoMetrics(VAUGHAN_STABLE_METRICS, listing, DEFAULT_FINANCING_INPUTS)
  return enrichMetrics(base, listing, DEFAULT_FINANCING_INPUTS)
}

describe('ExitScenariosCard (D-110)', () => {
  it('renders the four price paths at a 10-year hold with the same figures as the library', () => {
    const metrics = metricsFor(VAUGHAN_LISTING)
    render(
      <ExitScenariosCard
        metrics={metrics}
        listing={VAUGHAN_LISTING}
        financing={DEFAULT_FINANCING_INPUTS}
      />
    )
    const card = screen.getByTestId('exit-scenarios')
    for (const h of ['Stress', 'Flat', 'Conservative', 'Base']) {
      expect(within(card).getByText(h)).toBeInTheDocument()
    }
    expect(within(card).getByRole('button', { name: '10 yrs' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    const flat = computeExitScenarios({
      price: VAUGHAN_LISTING.price,
      principal: metrics.principal,
      mortgageRate: DEFAULT_FINANCING_INPUTS.mortgageRate,
      amortizationYears: DEFAULT_FINANCING_INPUTS.amortizationYears,
      cashFlowMonthly: metrics.cashFlowMonthly,
      totalCashInvested: metrics.totalCashInvested,
      baseAppreciationRate: DEFAULT_FINANCING_INPUTS.appreciationRate,
      holdYears: 10,
    })[1]!
    // Flat sells at the asking price.
    expect(within(card).getAllByText('$729,900').length).toBeGreaterThan(0)
    expect(
      within(card).getByText(`−$${Math.round(flat.sellingCosts).toLocaleString('en-CA')}`)
    ).toBeInTheDocument()
    expect(within(card).getByText(/Before tax/)).toBeInTheDocument()
    expect(within(card).getByText(/Capital gains tax .* is not deducted/)).toBeInTheDocument()
    // The return row is the IRR on the dated stream (D-123), labelled as such.
    expect(within(card).getByText('IRR, before tax')).toBeInTheDocument()
    expect(within(card).getByText(/IRR counts your cash at closing/)).toBeInTheDocument()
    expect(within(card).queryByText('A year, on your cash')).not.toBeInTheDocument()
  })

  it('the hold-period chips change the figures', () => {
    const metrics = metricsFor(VAUGHAN_LISTING)
    render(
      <ExitScenariosCard
        metrics={metrics}
        listing={VAUGHAN_LISTING}
        financing={DEFAULT_FINANCING_INPUTS}
      />
    )
    const before = screen.getByTestId('exit-scenarios').textContent
    fireEvent.click(screen.getByRole('button', { name: '20 yrs' }))
    expect(screen.getByRole('button', { name: '20 yrs' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Selling after 20 years/)).toBeInTheDocument()
    expect(screen.getByTestId('exit-scenarios').textContent).not.toBe(before)
  })

  it('EquitySection renders the card only when given the listing and financing', () => {
    const metrics = metricsFor(VAUGHAN_LISTING)
    const { rerender } = render(<EquitySection metrics={metrics} />)
    expect(screen.queryByTestId('exit-scenarios')).not.toBeInTheDocument()
    rerender(
      <EquitySection
        metrics={metrics}
        listing={VAUGHAN_LISTING}
        financing={DEFAULT_FINANCING_INPUTS}
      />
    )
    expect(screen.getByTestId('exit-scenarios')).toBeInTheDocument()
  })
})
