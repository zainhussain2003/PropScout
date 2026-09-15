/**
 * OwnerValueForm — the landlord states what the property is worth (D-107).
 *
 * Renders inside the hero score card. Rendering only: parsing the typed
 * figure is the one thing it does itself; the request, busy state and error
 * come from useOwnerValue via props. Bounds mirror the API's OWNER_VALUE.
 */

import { useState } from 'react'
import { OWNER_VALUE } from '../../constants/thresholds'

interface OwnerValueFormProps {
  /** A previously entered value, pre-filled when changing it. */
  initialValue?: number | null
  busy: boolean
  error: string | null
  onSubmit: (value: number) => void
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

export function OwnerValueForm({
  initialValue = null,
  busy,
  error,
  onSubmit,
  onCancel,
}: OwnerValueFormProps): JSX.Element {
  const [raw, setRaw] = useState(initialValue != null ? initialValue.toLocaleString('en-CA') : '')
  const [touched, setTouched] = useState(false)
  const value = parseValueInput(raw)
  const outOfRange = value != null && (value < OWNER_VALUE.MIN || value > OWNER_VALUE.MAX)
  const invalid = value == null || outOfRange

  return (
    <form
      className="col owner-value-form"
      style={{ gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (invalid || busy) return
        onSubmit(value)
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
