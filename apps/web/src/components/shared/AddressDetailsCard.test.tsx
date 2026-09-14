/**
 * AddressDetailsCard — what the form did not collect is not a fact.
 * D-072 (bathrooms) and D-082 (property type).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddressDetailsCard, type AddressDetailsValue } from './AddressDetailsCard'

function fillAndSubmit(extra: () => void = () => undefined): AddressDetailsValue {
  const onSubmit = vi.fn()
  render(
    <AddressDetailsCard
      address="12 Prado Court, Toronto"
      city="Toronto"
      postalCode="M6B4L2"
      onBack={() => undefined}
      onSubmit={onSubmit}
    />
  )
  fireEvent.change(screen.getByLabelText(/listed for|monthly rent/i), {
    target: { value: '650000' },
  })
  fireEvent.change(screen.getByLabelText(/How many bedrooms/i), { target: { value: '3' } })
  extra()
  fireEvent.click(screen.getByRole('button', { name: /Run the report/i }))
  expect(onSubmit).toHaveBeenCalledTimes(1)
  return onSubmit.mock.calls[0][0] as AddressDetailsValue
}

describe('AddressDetailsCard', () => {
  it('sends null, not 0, for a bathroom count left blank', () => {
    const v = fillAndSubmit()
    expect(v.baths).toBeNull()
  })

  it('sends null for "not sure" property type — never a guessed condo', () => {
    const v = fillAndSubmit()
    expect(v.propertyType).toBeNull()
  })

  it('sends the chosen property type', () => {
    const v = fillAndSubmit(() => {
      fireEvent.change(screen.getByLabelText(/What kind of home/i), {
        target: { value: 'detached' },
      })
    })
    expect(v.propertyType).toBe('detached')
  })

  it('sends the bathroom count when given', () => {
    const v = fillAndSubmit(() => {
      fireEvent.change(screen.getByLabelText(/^Bathrooms$/i), { target: { value: '1.5' } })
    })
    expect(v.baths).toBe(1.5)
  })

  // ── For rent: running costs belong to the owner, not the tenant ─────────────

  function pickForRent(): void {
    fireEvent.click(screen.getByRole('button', { name: /^For rent$/i }))
  }

  it('does not ask a renter for the condo fee or property tax', () => {
    render(
      <AddressDetailsCard
        address="12 Prado Court, Toronto"
        city="Toronto"
        postalCode="M6B4L2"
        onBack={() => undefined}
        onSubmit={() => undefined}
      />
    )
    expect(screen.getByLabelText(/Monthly condo fee/i)).toBeInTheDocument()
    pickForRent()
    expect(screen.queryByLabelText(/Monthly condo fee/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Yearly property tax/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/I own this unit/i)).toBeInTheDocument()
  })

  it('reveals the running costs for an owner', () => {
    const v = fillAndSubmit(() => {
      pickForRent()
      fireEvent.click(screen.getByLabelText(/I own this unit/i))
      fireEvent.change(screen.getByLabelText(/Monthly condo fee/i), { target: { value: '620' } })
      fireEvent.change(screen.getByLabelText(/Yearly property tax/i), { target: { value: '3200' } })
    })
    expect(v.listingType).toBe('for-rent')
    expect(v.condoFeeMonthly).toBe(620)
    expect(v.annualTaxes).toBe(3200)
  })

  it('drops running costs typed before the listing was switched to rent', () => {
    const v = fillAndSubmit(() => {
      fireEvent.change(screen.getByLabelText(/Monthly condo fee/i), { target: { value: '620' } })
      pickForRent()
    })
    expect(v.listingType).toBe('for-rent')
    expect(v.condoFeeMonthly).toBeNull()
    expect(v.annualTaxes).toBeNull()
  })
})
