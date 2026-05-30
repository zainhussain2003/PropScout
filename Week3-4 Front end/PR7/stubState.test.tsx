/**
 * StubState — unit tests
 *
 * PR7 · State component tests
 * Test file path: Week3-4 Front end/PR7/stubState.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StubState } from '../../apps/web/src/components/states/StubState'

describe('StubState', () => {
  it('renders the headline', () => {
    render(
      <StubState icon="check" headline="You're in" body="Welcome" primary={{ label: 'Continue' }} />
    )
    expect(screen.getByText("You're in")).toBeInTheDocument()
  })

  it('renders the body copy', () => {
    render(
      <StubState icon="check" headline="You're in" body="Welcome" primary={{ label: 'Continue' }} />
    )
    expect(screen.getByText('Welcome')).toBeInTheDocument()
  })

  it('renders the primary button label', () => {
    render(
      <StubState icon="check" headline="You're in" body="Welcome" primary={{ label: 'Continue' }} />
    )
    expect(screen.getByText('Continue')).toBeInTheDocument()
  })

  it('renders without error when primary is omitted', () => {
    expect(() =>
      render(<StubState icon="check" headline="You're in" body="Welcome" />)
    ).not.toThrow()
  })
})
