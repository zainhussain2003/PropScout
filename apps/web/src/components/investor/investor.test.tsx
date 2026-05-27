/**
 * Tests for investor report components.
 *
 * AssumptionFields is already tested in AssumptionFields.test.tsx.
 * This file covers remaining investor-specific components.
 *
 * Components not yet built are tested with it.todo() — they will pass
 * once the component is built in the investor report PR.
 */

import { describe, it } from 'vitest'

// ── FinancingSliders ──────────────────────────────────────────────
// Not yet built — will be implemented in the investor report PR.

describe('FinancingSliders', () => {
  it.todo('renders sliders for down payment %, rate, and amortization years')
  it.todo('onChange fires when any slider value changes')
  it.todo('onChange receives updated financing object, not a raw DOM event')
  it.todo('down payment slider: min=5, max=50, step=5')
  it.todo('rate slider: min=2, max=10, step=0.25')
  it.todo('amortization slider: min=10, max=30, step=5')
  it.todo('slider labels update to reflect current value on drag')
  it.todo('all three sliders are operable via keyboard arrow keys')
  it.todo('each slider has aria-label or associated label element')
  it.todo('changing down payment slider calls onChange with new down_pct')
  it.todo('changing rate slider calls onChange with new rate')
  it.todo('changing amortization slider calls onChange with new amortization_years')
})

// ── EquityChart ───────────────────────────────────────────────────

describe('EquityChart', () => {
  it.todo('renders an SVG or canvas element (not empty)')
  it.todo('renders 20 data points — one per year of the projection')
  it.todo('hover on a data point shows tooltip with year, equity, and cash invested')
  it.todo('all-zero equityCurve prop renders without errors')
  it.todo('totalCashInvested = 0 renders without division error')
  it.todo('chart grows monotonically for a positive-appreciation property')
})

// ── OSFICard ──────────────────────────────────────────────────────

describe('OSFICard', () => {
  it.todo('renders the qualifying rate value')
  it.todo('renders the stress test monthly payment')
  it.todo('renders pass/fail indicator based on GDS threshold')
  it.todo('renders the GDS and TDS percentages')
  it.todo('shows "passes" indicator when GDS < 39%')
  it.todo('shows "fails" indicator when GDS >= 39%')
})

// ── LTTTable ─────────────────────────────────────────────────────

describe('LTTTable', () => {
  it.todo('renders at least 3 bracket rows for Ontario LTT')
  it.todo('renders the provincial LTT total row')
  it.todo('renders MLTT row when is_toronto=true')
  it.todo('does not render MLTT row when is_toronto=false')
  it.todo('all dollar values are formatted as $X,XXX')
  it.todo('total row sums all component rows correctly')
})

// ── InvestmentMetricsSection ──────────────────────────────────────

describe('InvestmentMetricsSection', () => {
  it.todo(
    'renders 8 metric tiles: cap rate, cash flow, CoC, DSCR, GRM, NOI, break-even rent, total cash invested'
  )
  it.todo('cap rate tile shows % format')
  it.todo('cash flow tile shows $/mo format with sign')
  it.todo('negative cash flow shows negative sign (−$X,XXX/mo)')
  it.todo('DSCR tile shows x suffix (e.g. 0.45x)')
  it.todo('GRM tile shows integer (e.g. 20)')
  it.todo('all 8 tiles render without crashing when passed Vaughan calibration data')
})

// ── NeighbourhoodSection ──────────────────────────────────────────

describe('NeighbourhoodSection', () => {
  it.todo('renders Walk Score value and label')
  it.todo('renders Transit Score value and label')
  it.todo('renders Bike Score value and label')
  it.todo('renders the neighbourhood map (MiniMap component)')
  it.todo('score 0 renders "0" not blank')
  it.todo('score 100 renders "100" not blank')
})

// ── STRPlaceholderSection ─────────────────────────────────────────

describe('STRPlaceholderSection', () => {
  it.todo('renders Phase 2 coming-soon placeholder')
  it.todo('renders STR legality card with city-specific rules')
  it.todo('renders AirDNA "coming soon" badge')
  it.todo('does not crash when str_legality prop is missing')
})

// ── Investor report page — integration ───────────────────────────

describe('Investor report page integration', () => {
  it.todo('all 11 section headings render (§ 01 through § 11)')
  it.todo('PropertyHero renders with address and score')
  it.todo('DealScore gauge present and starts animation on load')
  it.todo('FinancingSliders are present on the page')
  it.todo('dragging down payment slider updates DealScore, cap rate, and cash flow')
  it.todo('dragging rate slider updates monthly payment and cash flow')
  it.todo('changing amortization to 30yr reduces monthly payment vs 25yr')
  it.todo('EquityChart present with 20 data points')
  it.todo('InvestmentMetricsSection: 8 metric tiles present')
  it.todo('OSFICard renders with qualifying rate displayed')
  it.todo('LTTTable renders with at least 3 bracket rows')
  it.todo('STRPlaceholderSection renders (Phase 2 placeholder)')
  it.todo('Vaughan calibration dataset loads without errors (no undefined props)')
  it.todo('axe passes on full investor report render with mocked data')
})

// ── Regression: slider recalc correctness ────────────────────────

describe('Investor financing slider recalculation', () => {
  it.todo('start with Vaughan inputs (deal score ~0) — baseline established')
  it.todo('change down payment to 35% → cash flow improves (less negative)')
  it.todo('change rate to 3.0% → monthly payment decreases vs 4.79% base')
  it.todo('change amortization to 30yr → monthly payment decreases vs 25yr')
  it.todo('all displayed metrics reflect new inputs — no stale values after slider change')
  it.todo('Hamilton inputs at baseline → positive cash flow displayed')
})
