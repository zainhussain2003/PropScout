/**
 * OwnerValueForm — the landlord states what the property is worth (D-107).
 *
 * Renders inside the hero score card. Rendering only: parsing the typed
 * figure is the one thing it does itself; the request, busy state and error
 * come from useOwnerValue via props. Bounds mirror the API's OWNER_VALUE.
 */

import { useState } from 'react'
import { OWNER_VALUE, MORTGAGE_RATE_BOUNDS } from '../../constants/thresholds'

/** What the form submits (D-107, D-108). */
export interface OwnerValueSubmission {
  value: number
  /** 0 = owned outright; null = evaluating as a purchase. */
  mortgageBalance: number | null
  /** Decimal (0.0389); null when not given or not owned. */
  mortgageRate: number | null
}

interface OwnerValueFormProps {
  /** A previously entered value, pre-filled when changing it. */
  initialValue?: number | null
  initialMortgageBalance?: number | null
  initialMortgageRate?: number | null
  busy: boolean
  error: string | null
  onSubmit: (submission: OwnerValueSubmission) => void
  /** Shown when the form replaces a scored card — lets the person back out. */
  onCancel?: () => void
}

/** "$1,250,000" → 1250000; anything without digits → null. */
export function parseValueInput(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

/** "3.89" or "3.89%" → 0.0389; blank → null; junk → NaN. */
export function parseRateInput(raw: string): number | null {
  if (raw.trim() === '') return null
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const n = Number(cleaned)
  if (cleaned === '' || !Number.isFinite(n)) return Number.NaN
  // Six decimals: "3.89" → 0.0389 exactly, not 0.038900000000000004.
  return Number((n / 100).toFixed(6))
}

export function OwnerValueForm({
  initialValue = null,
  initialMortgageBalance = null,
  initialMortgageRate = null,
  busy,
  error,
  onSubmit,
  onCancel,
}: OwnerValueFormProps): JSX.Element {
  const [raw, setRaw] = useState(initialValue != null ? initialValue.toLocaleString('en-CA') : '')
  const [owned, setOwned] = useState(initialMortgageBalance != null)
  const [rawBalance, setRawBalance] = useState(
    initialMortgageBalance != null ? initialMortgageBalance.toLocaleString('en-CA') : ''
  )
  const [rawRate, setRawRate] = useState(
    initialMortgageRate != null ? (initialMortgageRate * 100).toFixed(2) : ''
  )
  const [touched, setTouched] = useState(false)
  const value = parseValueInput(raw)
  const outOfRange = value != null && (value < OWNER_VALUE.MIN || value > OWNER_VALUE.MAX)
  // Owned: a blank balance means outright (0); the rate is optional.
  const balance = owned ? (rawBalance.trim() === '' ? 0 : parseValueInput(rawBalance)) : null
  const balanceInvalid = owned && (balance == null || (value != null && balance > value))
  const rate = owned && balance != null && balance > 0 ? parseRateInput(rawRate) : null
  const rateInvalid =
    rate != null &&
    (Number.isNaN(rate) || rate < MORTGAGE_RATE_BOUNDS.MIN || rate > MORTGAGE_RATE_BOUNDS.MAX)
  const invalid = value == null || outOfRange || balanceInvalid || rateInvalid

  return (
    <form
      className="col owner-value-form"
      style={{ gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (invalid || busy) return
        onSubmit({ value, mortgageBalance: balance, mortgageRate: rate })
      }}
    >
      <label htmlFor="owner-value" style={{ fontSize: 14, color: 'var(--ink)' }}>
        What is it worth?
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id="owner-value"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => setTouched(true)}
          inputMode="numeric"
          placeholder="850,000"
          aria-invalid={touched && invalid}
          aria-describedby="owner-value-hint"
          disabled={busy}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '10px 12px',
            borderRadius: 10,
            border: `1px solid ${touched && invalid ? 'var(--fail)' : 'var(--line)'}`,
            background: 'var(--surface)',
            color: 'var(--ink)',
            fontSize: 16,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Scoring…' : 'Score it'}
        </button>
      </div>
      <label
        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)' }}
      >
        <input
          type="checkbox"
          checked={owned}
          onChange={(e) => setOwned(e.target.checked)}
          disabled={busy}
          style={{ accentColor: 'var(--accent)' }}
        />
        I already own it
      </label>
      {owned && (
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="col" style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <label htmlFor="owner-balance" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
              Mortgage balance
            </label>
            <input
              id="owner-balance"
              value={rawBalance}
              onChange={(e) => setRawBalance(e.target.value)}
              inputMode="numeric"
              placeholder="0 if owned outright"
              aria-invalid={touched && balanceInvalid}
              disabled={busy}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 10,
                border: `1px solid ${touched && balanceInvalid ? 'var(--fail)' : 'var(--line)'}`,
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 16,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>
          <div className="col" style={{ width: 110, gap: 4 }}>
            <label htmlFor="owner-rate" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
              Rate %
            </label>
            <input
              id="owner-rate"
              value={rawRate}
              onChange={(e) => setRawRate(e.target.value)}
              inputMode="decimal"
              placeholder="optional"
              aria-invalid={touched && rateInvalid}
              disabled={busy || balance === 0}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 10,
                border: `1px solid ${touched && rateInvalid ? 'var(--fail)' : 'var(--line)'}`,
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 16,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}
      <p id="owner-value-hint" style={{ fontSize: 12.5, lineHeight: 1.45, margin: 0 }}>
        {error != null ? (
          <span style={{ color: 'var(--fail)' }}>{error}</span>
        ) : touched && outOfRange ? (
          <span style={{ color: 'var(--fail)' }}>
            Enter a value between ${OWNER_VALUE.MIN.toLocaleString('en-CA')} and $
            {OWNER_VALUE.MAX.toLocaleString('en-CA')}.
          </span>
        ) : touched && value == null ? (
          <span style={{ color: 'var(--fail)' }}>We need a value to score anything.</span>
        ) : touched && balanceInvalid ? (
          <span style={{ color: 'var(--fail)' }}>
            The mortgage balance must be a number no larger than the value.
          </span>
        ) : touched && rateInvalid ? (
          <span style={{ color: 'var(--fail)' }}>
            Enter the rate as a percentage between 1 and 25.
          </span>
        ) : owned ? (
          <span style={{ color: 'var(--muted)' }}>
            Your equity is the value less the balance; nothing is charged for closing. Leave the
            balance blank if you own it outright.
          </span>
        ) : (
          <span style={{ color: 'var(--muted)' }}>
            Purchase price or today&apos;s market value. The report is re-run as a purchase at this
            value with today&apos;s financing.
          </span>
        )}
      </p>
      {onCancel != null && (
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 13,
            color: 'var(--muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Keep the current value
        </button>
      )}
    </form>
  )
}
