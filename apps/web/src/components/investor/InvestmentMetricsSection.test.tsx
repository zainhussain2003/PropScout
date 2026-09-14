/**
 * InvestmentMetricsSection — a listing with no sale price shows no
 * price-derived tile (D-103).
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InvestmentMetricsSection } from './InvestmentMetricsSection'
import { VAUGHAN_LISTING } from '../../constants/demoData'
import { computeDemoMetrics, enrichMetrics } from '../../lib/investorCalc'
import { DEFAULT_FINANCING_INPUTS, VAUGHAN_STABLE_METRICS } from '../../constants/demoData'

function metricsFor(listing: typeof VAUGHAN_LISTING): ReturnType<typeof enrichMetrics> {
  const base = computeDemoMetrics(VAUGHAN_STABLE_METRICS, listing, DEFAULT_FINANCING_INPUTS)
  return enrichMetrics(base, listing, DEFAULT_FINANCING_INPUTS)
}

describe('InvestmentMetricsSection — no purchase price', () => {
  it('hides price-derived tiles and says why on a rental listing', () => {
    const listing = { ...VAUGHAN_LISTING, price: 0 }
    render(<InvestmentMetricsSection metrics={metricsFor(listing)} listing={listing} />)
    expect(screen.getByText(/Operating view · no purchase price/i)).toBeInTheDocument()
    expect(screen.getByText(/no purchase price\. Cap rate/i)).toBeInTheDocument()
    expect(screen.queryByText(/^Cap rate$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Monthly payment$/)).not.toBeInTheDocument()
    expect(screen.getByText(/^NOI$/)).toBeInTheDocument()
    expect(screen.getByText(/^Break-even rent$/)).toBeInTheDocument()
  })

  it('shows all eight tiles when there is a price', () => {
    render(
      <InvestmentMetricsSection metrics={metricsFor(VAUGHAN_LISTING)} listing={VAUGHAN_LISTING} />
    )
    expect(screen.getByText(/^Cap rate$/)).toBeInTheDocument()
    expect(screen.getByText(/^Monthly payment$/)).toBeInTheDocument()
    expect(screen.queryByText(/Operating view/i)).not.toBeInTheDocument()
  })
})
