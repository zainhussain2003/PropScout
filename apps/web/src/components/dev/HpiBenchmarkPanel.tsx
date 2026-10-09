import type { HpiBenchmark } from '../../lib/services/devHpiService'

const percent = (value: number | null): string =>
  value === null ? 'Unavailable' : `${value.toFixed(2)}%`

export function HpiBenchmarkPanel({ benchmark }: { benchmark: HpiBenchmark }): JSX.Element {
  return (
    <section aria-label="HPI benchmark" className="card">
      <h2>
        {benchmark.market} · {benchmark.housing_type}
      </h2>
      <p>
        {benchmark.month} ·{' '}
        {benchmark.synthetic ? 'Synthetic test data' : 'Private local CREA data'}
      </p>
      <p>
        Area benchmark context. This is not an appraisal or a listing-specific fair market value.
      </p>
      {benchmark.change_basis === 'derived_hpi_exact_months' && (
        <p>
          Not seasonally adjusted. Changes are derived from HPI index comparisons to exactly 1, 6,
          12, 36 and 60 months earlier. Missing history stays unavailable.
        </p>
      )}
      <dl>
        <dt>Benchmark price (CAD)</dt>
        <dd>
          {benchmark.benchmark_price === null
            ? 'Unavailable'
            : new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD',
                maximumFractionDigits: 0,
              }).format(benchmark.benchmark_price)}
        </dd>
        <dt>HPI index</dt>
        <dd>{benchmark.hpi_index === null ? 'Unavailable' : benchmark.hpi_index.toFixed(2)}</dd>
        <dt>1-month change</dt>
        <dd>{percent(benchmark.change_1m)}</dd>
        <dt>6-month change</dt>
        <dd>{percent(benchmark.change_6m)}</dd>
        <dt>1-year change</dt>
        <dd>{percent(benchmark.change_1y)}</dd>
        <dt>3-year change</dt>
        <dd>{percent(benchmark.change_3y)}</dd>
        <dt>5-year change</dt>
        <dd>{percent(benchmark.change_5y)}</dd>
      </dl>
      <p>
        {benchmark.synthetic ? 'Synthetic fixture. Official data source:' : 'Source:'} The Canadian
        Real Estate Association (CREA). Imported{' '}
        {new Date(benchmark.imported_at).toLocaleDateString('en-CA')}.
      </p>
      <p>
        Local development only. Keep real values out of screenshots, exports and shared previews.
      </p>
    </section>
  )
}
