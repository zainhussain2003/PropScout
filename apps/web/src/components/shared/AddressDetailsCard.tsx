/**
 * AddressDetailsCard — confirm a matched address and collect the few facts a
 * lookup cannot supply.
 *
 * ## Why this exists
 *
 * An address gives us location. Everything location-derived — sun, walkability,
 * schools, census, rental comps — follows from the coordinates. The asking price
 * does not exist in any address lookup, and guessing it would fabricate the
 * number the entire report turns on. So we ask.
 *
 * ## Design constraints
 *
 * Written for someone who has never used the product and may not think of
 * themselves as good with computers:
 *
 * - **Confirm before asking.** The matched address is shown first, with a way
 *   back. Being told "that's not my building" after filling a form is the fastest
 *   way to lose someone.
 * - **Two required fields, not twelve.** Price and bedrooms. Everything optional
 *   is visibly optional and says what it improves, so skipping feels allowed
 *   rather than careless.
 * - **Plain labels, no jargon.** "What's it listed for?" not "List price (CAD)".
 * - **Numeric keyboards on mobile** via inputMode, so a phone shows digits.
 * - **No red until submit.** Validation on submit, not per keystroke — being
 *   corrected while still typing reads as being told off.
 */

import { useState } from 'react'

import { Icon } from './Icon'

export interface AddressDetailsValue {
  listingType: 'for-sale' | 'for-rent'
  price: number | null
  rentMonthly: number | null
  beds: number
  baths: number
  sqft: number | null
  condoFeeMonthly: number | null
  annualTaxes: number | null
}

interface AddressDetailsCardProps {
  /** The address as matched, shown back for confirmation. */
  address: string
  city: string
  postalCode: string
  /** Return to the search field — the escape hatch when the match is wrong. */
  onBack: () => void
  onSubmit: (value: AddressDetailsValue) => void
  submitting?: boolean
  /** Server-side failure, shown above the button. */
  error?: string | null
}

/** Digits only — people type "$729,900" and "729 900". */
function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function AddressDetailsCard({
  address,
  city,
  postalCode,
  onBack,
  onSubmit,
  submitting = false,
  error = null,
}: AddressDetailsCardProps): JSX.Element {
  const [listingType, setListingType] = useState<'for-sale' | 'for-rent'>('for-sale')
  const [amount, setAmount] = useState('')
  const [beds, setBeds] = useState('')
  const [baths, setBaths] = useState('')
  const [sqft, setSqft] = useState('')
  const [condoFee, setCondoFee] = useState('')
  const [taxes, setTaxes] = useState('')
  const [touched, setTouched] = useState(false)

  const amountValue = parseNumber(amount)
  const bedsValue = parseNumber(beds)
  const amountMissing = amountValue === null
  const bedsMissing = bedsValue === null

  function handleSubmit(): void {
    setTouched(true)
    if (amountMissing || bedsMissing) return
    onSubmit({
      listingType,
      price: listingType === 'for-sale' ? amountValue : null,
      rentMonthly: listingType === 'for-rent' ? amountValue : null,
      beds: bedsValue ?? 0,
      baths: parseNumber(baths) ?? 0,
      sqft: parseNumber(sqft),
      condoFeeMonthly: parseNumber(condoFee),
      annualTaxes: parseNumber(taxes),
    })
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid var(--line)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    fontSize: 16, // 16px: anything smaller makes iOS Safari zoom on focus.
    fontFamily: 'inherit',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    color: 'var(--ink)',
    marginBottom: 6,
    display: 'block',
  }

  const hintStyle: React.CSSProperties = {
    fontSize: 12.5,
    color: 'var(--muted)',
    marginTop: 5,
    lineHeight: 1.45,
  }

  return (
    <div
      className="card col"
      style={{ padding: 'clamp(20px, 4vw, 32px)', gap: 22, textAlign: 'left' }}
    >
      {/* Confirm the match first — being told "wrong building" after filling in a
          form is the fastest way to lose someone. */}
      <div className="col" style={{ gap: 8 }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Is this the right place?
        </div>
        <div style={{ fontSize: 17, lineHeight: 1.35, color: 'var(--ink)' }}>{address}</div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
          {city}
          {city && postalCode ? ' · ' : ''}
          {postalCode}
        </div>
        <button
          onClick={onBack}
          className="btn btn-ghost"
          style={{ alignSelf: 'flex-start', marginTop: 4, padding: '7px 12px', fontSize: 13 }}
        >
          <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
            <Icon name="arrow" size={13} />
          </span>{' '}
          No, search again
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--line)' }} />

      <div className="col" style={{ gap: 6 }}>
        <h3 style={{ fontSize: 19, margin: 0, color: 'var(--ink)' }}>
          Two quick things and we&apos;ll run it
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)', margin: 0 }}>
          We can work out the sunlight, schools, transit and local rents from the address alone. The
          price is the one thing we can&apos;t look up.
        </p>
      </div>

      {/* Sale vs rent decides which questions make sense, so it comes first. */}
      <div className="col" style={{ gap: 8 }}>
        <span style={labelStyle}>Is it for sale or for rent?</span>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          {(
            [
              ['for-sale', 'For sale'],
              ['for-rent', 'For rent'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setListingType(value)}
              aria-pressed={listingType === value}
              className="btn"
              style={{
                padding: '11px 20px',
                fontSize: 15,
                borderRadius: 999,
                border: `1px solid ${listingType === value ? 'var(--accent)' : 'var(--line)'}`,
                background: listingType === value ? 'var(--accent)' : 'var(--surface)',
                color: listingType === value ? 'var(--bg)' : 'var(--ink)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          // Single column on a phone; the two required fields sit side by side
          // once there is room for them.
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 16,
        }}
      >
        <div>
          <label style={labelStyle} htmlFor="ps-amount">
            {listingType === 'for-sale' ? "What's it listed for?" : "What's the monthly rent?"}
          </label>
          <input
            id="ps-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder={listingType === 'for-sale' ? '729,900' : '2,400'}
            aria-invalid={touched && amountMissing}
            style={{
              ...fieldStyle,
              borderColor: touched && amountMissing ? 'var(--fail)' : 'var(--line)',
            }}
          />
          {touched && amountMissing && (
            <div style={{ ...hintStyle, color: 'var(--fail)' }}>
              We need this one to run the numbers.
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle} htmlFor="ps-beds">
            How many bedrooms?
          </label>
          <input
            id="ps-beds"
            value={beds}
            onChange={(e) => setBeds(e.target.value)}
            inputMode="numeric"
            placeholder="2"
            aria-invalid={touched && bedsMissing}
            style={{
              ...fieldStyle,
              borderColor: touched && bedsMissing ? 'var(--fail)' : 'var(--line)',
            }}
          />
          {touched && bedsMissing && (
            <div style={{ ...hintStyle, color: 'var(--fail)' }}>
              We compare against rentals with the same number of bedrooms.
            </div>
          )}
        </div>
      </div>

      {/* Everything below is optional and says what it buys, so skipping reads as
          allowed rather than careless. */}
      <div className="col" style={{ gap: 14 }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Optional — each one sharpens the result
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 16,
          }}
        >
          <div>
            <label style={labelStyle} htmlFor="ps-baths">
              Bathrooms
            </label>
            <input
              id="ps-baths"
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
              inputMode="decimal"
              placeholder="1"
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="ps-sqft">
              Size in square feet
            </label>
            <input
              id="ps-sqft"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              inputMode="numeric"
              placeholder="700"
              style={fieldStyle}
            />
            <div style={hintStyle}>Lets us compare price per square foot.</div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="ps-condo">
              Monthly condo fee
            </label>
            <input
              id="ps-condo"
              value={condoFee}
              onChange={(e) => setCondoFee(e.target.value)}
              inputMode="numeric"
              placeholder="620"
              style={fieldStyle}
            />
            <div style={hintStyle}>Often the difference between a good and bad deal.</div>
          </div>
          <div>
            <label style={labelStyle} htmlFor="ps-taxes">
              Yearly property tax
            </label>
            <input
              id="ps-taxes"
              value={taxes}
              onChange={(e) => setTaxes(e.target.value)}
              inputMode="numeric"
              placeholder="3,200"
              style={fieldStyle}
            />
            <div style={hintStyle}>We estimate it from your city if you skip this.</div>
          </div>
        </div>
      </div>

      {error !== null && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'color-mix(in oklab, var(--fail) 8%, transparent)',
            border: '1px solid color-mix(in oklab, var(--fail) 35%, transparent)',
            color: 'var(--fail)',
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="btn btn-primary"
        style={{ padding: '15px 24px', fontSize: 16, width: '100%' }}
      >
        {submitting ? 'Working…' : 'Run the report'}
      </button>
    </div>
  )
}
