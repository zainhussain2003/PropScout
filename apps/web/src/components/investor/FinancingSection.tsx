/**
 * FinancingSection — §02 of the investor report: the live sliders under one
 * section head.
 *
 * One implementation for the live report and the demo route (D-073). The
 * live copy asked "Does the deal pencil at your numbers?" directly beneath
 * §01's "Does the deal pencil?" — the same question twice in a row. This
 * keeps the demo's distinct question and the live report's verdict chip.
 */

import { SectionHead } from '../shared/SectionHead'
import { FinancingSliders, type FinancingBase } from './FinancingSliders'
import type { FinancingInputs } from '../../types/analysis'

export interface FinancingSectionProps {
  price: number
  financing: FinancingInputs
  onFinancingChange: (f: FinancingInputs) => void
  /** What the analysis ran with; presets are relative to it. See FinancingSliders. */
  base?: FinancingBase
}

export function FinancingSection({
  price,
  financing,
  onFinancingChange,
  base,
}: FinancingSectionProps): JSX.Element {
  return (
    <section className="container tr-section" data-section="02">
      <SectionHead
        n="02"
        topic="Financing scenarios"
        question={
          <>
            How do the <em>numbers</em> change?
          </>
        }
        verdict={
          financing.owned === true
            ? financing.downPaymentPct >= 1
              ? 'Owned outright'
              : `${Math.round(financing.downPaymentPct * 100)}% equity · ${(financing.mortgageRate * 100).toFixed(2)}%`
            : `${Math.round(financing.downPaymentPct * 100)}% down · ${(financing.mortgageRate * 100).toFixed(2)}%`
        }
        tone="caution"
      />
      <FinancingSliders
        financing={financing}
        price={price}
        onChange={onFinancingChange}
        base={base}
      />
    </section>
  )
}
