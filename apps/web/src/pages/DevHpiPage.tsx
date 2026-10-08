import { useEffect, useState } from 'react'
import { HpiBenchmarkPanel } from '../components/dev/HpiBenchmarkPanel'
import {
  hpiOptions,
  readDevHpi,
  type HpiChoice,
  type HpiBenchmark,
} from '../lib/services/devHpiService'

export function DevHpiPage(): JSX.Element {
  const [choices, setChoices] = useState<HpiChoice[]>([])
  const [market, setMarket] = useState('')
  const [housingType, setHousingType] = useState('')
  const [month, setMonth] = useState('')
  const selected =
    market && housingType && month
      ? JSON.stringify({ market, housing_type: housingType, month })
      : ''
  const options = hpiOptions(choices, market, housingType)
  const [benchmark, setBenchmark] = useState<HpiBenchmark | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setBenchmark(null)
    const choice = selected ? (JSON.parse(selected) as HpiChoice) : undefined
    void readDevHpi(choice, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setChoices(result.choices)
        setBenchmark(result.benchmark)
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [selected])
  return (
    <main className="container" style={{ padding: 'var(--space-6)' }}>
      <h1>Local HPI benchmark testing</h1>
      <p>This private development view does not change report calculations.</p>
      <label htmlFor="hpi-market">Market</label>
      <select
        id="hpi-market"
        value={market}
        onChange={(event) => {
          setMarket(event.target.value)
          setHousingType('')
          setMonth('')
        }}
      >
        <option value="">Choose market</option>
        {options.markets.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <label htmlFor="hpi-housing">Housing type</label>
      <select
        id="hpi-housing"
        value={housingType}
        disabled={!market}
        onChange={(event) => {
          setHousingType(event.target.value)
          setMonth('')
        }}
      >
        <option value="">Choose housing type</option>
        {options.housingTypes.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <label htmlFor="hpi-month">Month</label>
      <select
        id="hpi-month"
        value={month}
        disabled={!housingType}
        onChange={(event) => setMonth(event.target.value)}
      >
        <option value="">Choose month</option>
        {options.months.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {loading && <p role="status">Loading local benchmarks…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && choices.length === 0 && <p>No imported benchmarks.</p>}
      {!loading && !error && selected && !benchmark && (
        <p>Observation unavailable. Refresh the available months.</p>
      )}
      {benchmark && <HpiBenchmarkPanel benchmark={benchmark} />}
    </main>
  )
}
