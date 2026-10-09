import { useState } from 'react'
import type { Listing } from '../../types/property'
import type { ManualListingFields } from '../../lib/services/analysisService'

type NumericField = keyof ManualListingFields

const FIELD_LABELS: Record<NumericField, string> = {
  price: 'Asking price',
  rentMonthly: 'Monthly asking rent',
  beds: 'Bedrooms (0 for a studio)',
  baths: 'Bathrooms',
  sqft: 'Size in square feet',
  annualTaxes: 'Annual property tax',
  yearBuilt: 'Year built',
  condoFeeMonthly: 'Monthly condo fee',
  parkingSpots: 'Parking spaces',
}

const FIELD_LIMITS: Record<NumericField, { min: number; max: number; integer?: boolean }> = {
  price: { min: 1, max: 100000000 },
  rentMonthly: { min: 1, max: 100000 },
  beds: { min: 0, max: 30, integer: true },
  baths: { min: 0, max: 30 },
  sqft: { min: 1, max: 100000 },
  annualTaxes: { min: 1, max: 1000000 },
  yearBuilt: { min: 1800, max: 2100, integer: true },
  condoFeeMonthly: { min: 0, max: 100000 },
  parkingSpots: { min: 0, max: 100, integer: true },
}

interface PartialListingReviewProps {
  listing: Listing
  missingFields: string[]
  onConfirm: (fields: ManualListingFields) => void
  onBack: () => void
}

/** A source page supplied some facts. Review those facts before scoring it. */
export function PartialListingReview({
  listing,
  missingFields,
  onConfirm,
  onBack,
}: PartialListingReviewProps): JSX.Element {
  const amountField = listing.listingType === 'for-rent' ? 'rentMonthly' : 'price'
  const fields: NumericField[] = [
    amountField,
    'beds',
    'baths',
    'sqft',
    'annualTaxes',
    'yearBuilt',
    'condoFeeMonthly',
    'parkingSpots',
  ]
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field, listing[field]?.toString() ?? '']))
  )
  const [error, setError] = useState<string | null>(null)

  const submit = (): void => {
    const corrections: Record<string, number> = {}
    for (const field of fields) {
      const raw = values[field]?.trim() ?? ''
      const original = listing[field]
      if (raw === '') {
        if (field === amountField || field === 'beds' || original != null) {
          setError(`Enter ${FIELD_LABELS[field].toLowerCase()} before continuing.`)
          return
        }
        continue
      }
      const value = Number(raw.replace(/[$,\s]/g, ''))
      const { min, max, integer } = FIELD_LIMITS[field]
      if (
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        (integer && !Number.isInteger(value))
      ) {
        setError(`Check ${FIELD_LABELS[field].toLowerCase()} and enter a valid number.`)
        return
      }
      if (value !== original) corrections[field] = value
    }
    setError(null)
    onConfirm(corrections as ManualListingFields)
  }

  return (
    <div className="card col" style={{ marginTop: 18, padding: 24, gap: 18, textAlign: 'left' }}>
      <div className="col gap-8">
        <h3 className="serif" style={{ fontSize: 24 }}>
          Check the listing facts
        </h3>
        <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>
          We read {listing.address}, but the source left some details out. Auto-filled values came
          from the listing. Add anything you know before running the report; unknown optional
          details will stay unknown or be clearly estimated.
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 16,
        }}
      >
        {fields.map((field) => {
          const missing =
            listing[field] == null ||
            missingFields.includes(field) ||
            missingFields.includes(field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`))
          const raw = values[field]?.trim() ?? ''
          const parsed = raw === '' ? null : Number(raw.replace(/[$,\s]/g, ''))
          const changed = parsed !== null && Number.isFinite(parsed) && parsed !== listing[field]
          return (
            <label key={field} className="col gap-8" style={{ fontSize: 14 }}>
              <span>{FIELD_LABELS[field]}</span>
              <input
                aria-label={FIELD_LABELS[field]}
                value={values[field] ?? ''}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [field]: event.target.value }))
                  setError(null)
                }}
                inputMode="decimal"
                style={{
                  padding: '11px 13px',
                  borderRadius: 10,
                  border: `1px solid ${missing ? 'var(--caution)' : 'var(--line)'}`,
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: 16,
                }}
              />
              <small style={{ color: missing ? 'var(--caution)' : 'var(--muted)' }}>
                {changed
                  ? 'you entered'
                  : missing
                    ? 'Not found — enter manually if known'
                    : 'auto-filled'}
              </small>
            </label>
          )
        })}
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--fail)' }}>
          {error}
        </p>
      )}
      <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={submit}>
          Continue to report
        </button>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Try another listing
        </button>
      </div>
    </div>
  )
}
