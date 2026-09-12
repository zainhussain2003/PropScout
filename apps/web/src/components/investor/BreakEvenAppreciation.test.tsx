import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BreakEvenAppreciation } from './BreakEvenAppreciation'
import type { HoldCaseRow } from '../../types/analysis'

/** Buttermill at its calibrated −$2,126.82/mo, as the calc engine returns it. */
const SHORTFALL_ROWS: HoldCaseRow[] = [
  {
    year: 5,
    cashInvested: 159_453,
    cumulativeContribution: 127_609,
    totalCashIn: 287_062,
    mortgageBalance: 515_091,
    principalRepaid: 68_829,
    breakEvenSalePrice: 802_153,
    breakEvenAnnualRate: 0.0191,
  },
  {
    year: 20,
    cashInvested: 159_453,
    cumulativeContribution: 510_437,
    totalCashIn: 669_890,
    mortgageBalance: 177_387,
    principalRepaid: 406_533,
    breakEvenSalePrice: 847_276,
    breakEvenAnnualRate: 0.0075,
  },
]

describe('BreakEvenAppreciation', () => {
  it('shows the required growth rate for each hold period', () => {
    render(<BreakEvenAppreciation holdCase={SHORTFALL_ROWS} cashFlowMonthly={-2_126.82} />)
    expect(screen.getByText('1.9%')).toBeInTheDocument()
    expect(screen.getByText('0.8%')).toBeInTheDocument()
    expect(screen.getByText(/If you hold 5 years/)).toBeInTheDocument()
    expect(screen.getByText(/If you hold 20 years/)).toBeInTheDocument()
  })

  it('shows the cash required beside every rate', () => {
    // The load-bearing rule: 0.8% a year reads as "fine" until you see that it
    // takes $669,890 to get there. A rate must never appear on its own.
    render(<BreakEvenAppreciation holdCase={SHORTFALL_ROWS} cashFlowMonthly={-2_126.82} />)
    expect(screen.getByText('$669,890')).toBeInTheDocument()
    expect(screen.getByText('$287,062')).toBeInTheDocument()
    expect(screen.getAllByText("Cash you'd put in")).toHaveLength(SHORTFALL_ROWS.length)
  })

  it('states the monthly cost when the property runs a shortfall', () => {
    render(<BreakEvenAppreciation holdCase={SHORTFALL_ROWS} cashFlowMonthly={-2_126.82} />)
    expect(screen.getByText(/costs you \$2,127 a month to hold/)).toBeInTheDocument()
  })

  it('renders a negative required rate with a minus sign, not as a positive', () => {
    // A property that can lose value and still return the cash is a real and
    // favourable result; rendering −2.5% as 2.5% would invert the meaning.
    const rows: HoldCaseRow[] = [{ ...SHORTFALL_ROWS[1], breakEvenAnnualRate: -0.025 }]
    render(<BreakEvenAppreciation holdCase={rows} cashFlowMonthly={850} />)
    expect(screen.getByText('−2.5%')).toBeInTheDocument()
    expect(screen.queryByText('2.5%')).not.toBeInTheDocument()
  })

  it('does not claim the growth rate is achievable', () => {
    // No local appreciation series is connected (D-058), so the component must
    // not editorialise. Guards against a future copy edit adding a verdict.
    render(<BreakEvenAppreciation holdCase={SHORTFALL_ROWS} cashFlowMonthly={-2_126.82} />)
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\b(likely|unlikely|achievable|realistic growth|typical for)\b/i)
    // `can.t` because the copy uses a typographic apostrophe (&rsquo;).
    expect(text).toMatch(/can.t tell you whether these growth rates are\s+realistic/i)
  })

  it('says getting even is not a return', () => {
    render(<BreakEvenAppreciation holdCase={SHORTFALL_ROWS} cashFlowMonthly={-2_126.82} />)
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/not the same as earning a return/i)
  })

  it('presents every rate as a minimum and says selling costs are excluded', () => {
    // Selling costs are left out because commission is negotiated, not
    // published. An unlabelled figure would understate the bar — the direction
    // that flatters a deal — so the page must say so in both places.
    render(<BreakEvenAppreciation holdCase={SHORTFALL_ROWS} cashFlowMonthly={-2_126.82} />)
    expect(screen.getAllByText('a year, at least')).toHaveLength(SHORTFALL_ROWS.length)
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/These are minimums, and your real figure is higher/i)
    expect(text).toMatch(/commission is\s+negotiated rather than published/i)
    // And it must not claim a commission figure of its own.
    expect(text).not.toMatch(/\b5%\s*(selling\s*)?commission\b/i)
  })

  it('renders nothing when the calc engine returned no hold case', () => {
    const { container } = render(
      <BreakEvenAppreciation holdCase={[]} cashFlowMonthly={-2_126.82} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
