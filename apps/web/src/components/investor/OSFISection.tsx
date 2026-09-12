/**
 * OSFISection — §05 of the investor report, with the live income input.
 *
 * One implementation for the live report and the demo route (D-073). The
 * demo's copy had no income control and reported "Passes GDS test" at a
 * placeholder income it never showed.
 */

import { useMemo, useState } from 'react'
import { SectionHead } from '../shared/SectionHead'
import { OSFICard } from './OSFICard'
import { computeOSFI, fmtMoney } from '../../lib/investorCalc'
import { DEFAULT_HOUSEHOLD_INCOME, INCOME_SLIDER } from '../../constants/osfi'
import type { FinancingInputs, ListingData } from '../../types/analysis'

export interface OSFISectionProps {
  financing: FinancingInputs
  listing: ListingData
}

export function OSFISection({ financing, listing }: OSFISectionProps): JSX.Element {
  // Income is a live input — the OSFI GDS / qualifying figures recompute on every
  // change, so a buyer can see whether the property pencils at their real income
  // instead of the placeholder default.
  const [income, setIncome] = useState<number>(financing.assumedIncome || DEFAULT_HOUSEHOLD_INCOME)

  const osfi = useMemo(
    () =>
      computeOSFI(
        listing.price,
        financing.downPaymentPct,
        financing.mortgageRate,
        financing.amortizationYears,
        listing.annualTaxes,
        listing.condoFeeMonthly,
        income
      ),
    [
      listing.price,
      listing.annualTaxes,
      listing.condoFeeMonthly,
      financing.downPaymentPct,
      financing.mortgageRate,
      financing.amortizationYears,
      income,
    ]
  )

  return (
    <section className="container tr-section" data-section="05">
      <SectionHead
        n="05"
        topic="OSFI stress test"
        question={
          <>
            Will the bank actually <em>fund</em> this?
          </>
        }
        verdict={
          osfi.pass ? `Passes at ${fmtMoney(income)} income` : `Fails at ${fmtMoney(income)} income`
        }
        tone={osfi.pass ? 'pass' : 'fail'}
      />

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <label
          htmlFor="osfi-income"
          className="mono"
          style={{
            display: 'block',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-2)',
            marginBottom: 12,
          }}
        >
          Your gross household income
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input
            id="osfi-income"
            type="range"
            min={INCOME_SLIDER.min}
            max={INCOME_SLIDER.max}
            step={INCOME_SLIDER.step}
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            aria-label="Gross household income"
            style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span
            className="mono tabular"
            style={{ fontSize: 18, fontWeight: 600, minWidth: 110, textAlign: 'right' }}
          >
            {fmtMoney(income)}
          </span>
        </div>
      </div>

      <OSFICard osfi={osfi} financing={financing} income={income} />
    </section>
  )
}
