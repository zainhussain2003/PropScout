/**
 * NoCompsInlineState — unit tests
 *
 * PR7 · State component tests
 * Test file path: Week3-4 Front end/PR7/noCompsInlineState.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoCompsInlineState } from '../../apps/web/src/components/states/NoCompsInlineState'

describe('NoCompsInlineState', () => {
  it('renders "Low confidence" text', () => {
    render(<NoCompsInlineState />)
    expect(screen.getByText(/Low confidence/)).toBeInTheDocument()
  })

  it('renders "limited rental comps" text', () => {
    render(<NoCompsInlineState />)
    expect(screen.getByText(/limited rental comps/)).toBeInTheDocument()
  })

  it('renders the "Report an issue" button', () => {
    render(<NoCompsInlineState />)
    expect(screen.getByText(/Report an issue/)).toBeInTheDocument()
  })
})
