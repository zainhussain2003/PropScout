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
})
