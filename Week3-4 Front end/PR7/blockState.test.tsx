/**
 * BlockState — unit tests
 *
 * PR7 · State component tests
 * Test file path: Week3-4 Front end/PR7/blockState.test.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BlockState } from '../../apps/web/src/components/states/BlockState'

describe('BlockState — required props', () => {
  it('renders the headline', () => {
    render(<BlockState icon="flag" headline="Something went wrong" body="Try again later" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders the body copy', () => {
    render(<BlockState icon="flag" headline="Something went wrong" body="Try again later" />)
    expect(screen.getByText('Try again later')).toBeInTheDocument()
  })
})

describe('BlockState — tone variants smoke tests', () => {
  it('renders without error with tone="fail"', () => {
    expect(() =>
      render(<BlockState icon="flag" tone="fail" headline="Error" body="Try again" />)
    ).not.toThrow()
  })

  it('renders without error with tone="pass"', () => {
    expect(() =>
      render(<BlockState icon="check" tone="pass" headline="Success" body="Done" />)
    ).not.toThrow()
  })

  it('renders without error with tone="caution"', () => {
    expect(() =>
      render(<BlockState icon="shield" tone="caution" headline="Warning" body="Check this" />)
    ).not.toThrow()
  })
})

describe('BlockState — primary CTA', () => {
  it('renders the primary button label', () => {
    render(
      <BlockState
        icon="flag"
        headline="Something went wrong"
        body="Try again later"
        primary={{ label: 'Retry', onClick: vi.fn() }}
      />
    )
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('calls primary.onClick exactly once when clicked', () => {
    const onClick = vi.fn()
    render(
      <BlockState
        icon="flag"
        headline="Something went wrong"
        body="Try again later"
        primary={{ label: 'Retry', onClick }}
      />
    )
    fireEvent.click(screen.getByText('Retry'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('BlockState — secondary CTA', () => {
  it('renders the secondary button label', () => {
    render(
      <BlockState
        icon="flag"
        headline="Something went wrong"
        body="Try again later"
        secondary={{ label: 'Go home' }}
      />
    )
    expect(screen.getByText('Go home')).toBeInTheDocument()
  })
})

describe('BlockState — eyebrow', () => {
  it('renders the eyebrow text when provided', () => {
    render(<BlockState icon="flag" eyebrow="404" headline="Not found" body="That page is gone" />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })
})
