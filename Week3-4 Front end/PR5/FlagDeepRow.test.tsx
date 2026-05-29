/**
 * FlagDeepRow — unit tests
 *
 * PR5 · Tenant Report component tests
 * Test file path: Week3-4 Front end/PR5/FlagDeepRow.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlagDeepRow } from '../../apps/web/src/components/tenant/FlagDeepRow'
import type { TenantFlag } from '../../apps/web/src/types/analysis'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const RED_FLAG: TenantFlag = {
  id: 'den_bedroom',
  tone: 'red',
  label: 'The "second bedroom" is likely a den',
  detail: 'Listing description includes "sliding glass door" language.',
  evidence: '"Bright open-concept living with a sleek sliding glass den/2nd bedroom..."',
  ask: 'Ask the landlord to confirm in writing whether the room has a window and a solid door.',
}

const AMBER_FLAG: TenantFlag = {
  id: 'parking',
  tone: 'amber',
  label: 'Parking status unclear',
  detail: 'Listing says "parking available — contact manager."',
  evidence: '"Premium parking available — contact for details."',
  ask: 'Confirm whether parking is included or extra before signing.',
}

const GOOD_FLAG: TenantFlag = {
  id: 'utilities',
  tone: 'good',
  label: 'Utilities are clear',
  detail: 'Heat, water, and central air are confirmed included.',
  evidence: '"All utilities except hydro included. Tenant pays internet."',
  // no `ask` — good flags never have an action box
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FlagDeepRow', () => {
  it('renders the "!" glyph for a red-tone flag', () => {
    render(<FlagDeepRow flag={RED_FLAG} />)
    // The glyph is aria-hidden, so query by text content in the button
    expect(screen.getByRole('button')).toHaveTextContent('!')
  })

  it('renders the "?" glyph for an amber-tone flag', () => {
    render(<FlagDeepRow flag={AMBER_FLAG} />)
    expect(screen.getByRole('button')).toHaveTextContent('?')
  })

  it('renders the "✓" glyph for a good-tone flag', () => {
    render(<FlagDeepRow flag={GOOD_FLAG} />)
    expect(screen.getByRole('button')).toHaveTextContent('✓')
  })

  it('renders the flag label in the collapsed header', () => {
    render(<FlagDeepRow flag={RED_FLAG} />)
    expect(screen.getByText(RED_FLAG.label)).toBeInTheDocument()
  })

  it('is collapsed by default — evidence and ask text are not visible', () => {
    render(<FlagDeepRow flag={RED_FLAG} />)
    // Evidence and ask should not be in the DOM when collapsed
    expect(screen.queryByText(/Evidence from listing/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ask before signing/i)).not.toBeInTheDocument()
  })

  it('expands on click — evidence quote and "Ask before signing" box become visible', () => {
    render(<FlagDeepRow flag={RED_FLAG} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(btn)

    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Evidence from listing/i)).toBeInTheDocument()
    expect(screen.getByText(/Ask before signing/i)).toBeInTheDocument()
    // The evidence quote itself
    expect(screen.getByText(/sliding glass den\/2nd bedroom/i)).toBeInTheDocument()
  })

  it('collapses again on second click — evidence is hidden', () => {
    render(<FlagDeepRow flag={RED_FLAG} />)
    const btn = screen.getByRole('button')

    fireEvent.click(btn) // open
    fireEvent.click(btn) // close

    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/Evidence from listing/i)).not.toBeInTheDocument()
  })
})
