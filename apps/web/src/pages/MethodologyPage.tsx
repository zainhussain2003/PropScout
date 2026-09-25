import { Footer } from '../components/shared/Footer'

export function MethodologyPage(): JSX.Element {
  return (
    <>
      <main className="container col gap-24 hy-methodology">
        <a href="/">Back to PropScout</a>
        <h1>How to read a PropScout report</h1>
        <p>
          PropScout screens Ontario properties using listing facts, available comparable data and
          explicit assumptions. Estimates are not appraisals, mortgage approvals or predictions.
        </p>
        <h2 id="calculations">Calculations and assumptions</h2>
        <p>
          Mortgage payments use Canadian semi-annual compounding. Net operating income is rent less
          operating costs, before mortgage payments. Cap rate divides that income by property value.
          Cash flow subtracts debt service. Cash-on-cash compares annual cash flow with the cash
          invested, including applicable purchase closing costs.
        </p>
        <p>
          Ontario land transfer tax and Toronto municipal tax are calculated separately. Toronto
          residential estimates use the schedule effective April 1, 2026 for one or two
          single-family residences. Rebates, non-resident taxes and special property classifications
          require separate verification with your closing professional.
        </p>
        <p>
          The stress rate is the greater of contract rate plus two percentage points or 5.25%. The
          GDS screen uses 39%, property taxes, half the condo fee and $150 monthly heating. Other
          debts and a lender's rental-income treatment can change eligibility.
        </p>
        <p>
          Financing controls explore scenarios and update the displayed financial metrics and score.
          The written verdict describes the original analysis; changing a slider does not generate a
          new written assessment.
        </p>
        <h2 id="sources">Sources, freshness and gaps</h2>
        <p>
          Rental estimates use available asking-rent comparables. Asking prices are not proof of
          signed leases. Read each report's sample count, confidence and Sources section before
          relying on the range. Sparse or stale observations limit the conclusion.
        </p>
        <p>
          Listing details may be missing. Rates, taxes, maintenance, vacancy and insurance can be
          estimates. The report's Sources section distinguishes observed values from defaults.
          School proximity does not establish catchment eligibility. SunScout models direct
          sunlight; unknown building heights and window details limit precision.
        </p>
        <ul>
          <li>
            <a href="https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rates-and-fees/">
              Toronto municipal transfer-tax schedule
            </a>
          </li>
          <li>
            <a href="https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/calculating-gds-tds">
              CMHC debt-service calculation guidance
            </a>
          </li>
        </ul>
        <h2 id="help">Need help?</h2>
        <p>
          Check the listing facts and assumptions first. For a failed report or a discrepancy,
          contact <a href="mailto:support@propscout.ca">support@propscout.ca</a> with the report
          link and the figure in question. Do not email passwords or payment details.
        </p>
        <p>
          <a href="/terms#not-advice">Limitations and terms</a> · <a href="/privacy">Privacy</a>
        </p>
      </main>
      <Footer />
    </>
  )
}
