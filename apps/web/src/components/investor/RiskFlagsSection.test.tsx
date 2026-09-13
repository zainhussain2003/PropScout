/**
 * RiskFlagsSection — "no flags" means one of two different things.
 *
 * Audit counter-review: missing description, extraction failure and a clean
 * result must not share one sentence. Every address-path run on 2026-09-12
 * read "No risk language was found in the listing description" for a
 * property that had no description.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RiskFlagsSection } from './RiskFlagsSection'
import { VAUGHAN_LISTING } from '../../constants/demoData'

describe('RiskFlagsSection', () => {
  it('says there was no listing text when the property was entered by address', () => {
    render(
      <RiskFlagsSection listing={{ ...VAUGHAN_LISTING, riskFlags: [], hasDescription: false }} />
    )
    expect(screen.getByText(/no listing description to scan/i)).toBeInTheDocument()
    expect(screen.getByText('No listing text')).toBeInTheDocument()
    expect(screen.queryByText(/No risk language was found/)).not.toBeInTheDocument()
  })

  it('reports a clean scan only when there was text to scan', () => {
    render(
      <RiskFlagsSection listing={{ ...VAUGHAN_LISTING, riskFlags: [], hasDescription: true }} />
    )
    expect(screen.getByText(/No risk language was found/)).toBeInTheDocument()
    expect(screen.getByText('No wording flags')).toBeInTheDocument()
  })

  it('treats an unknown description state as scanned, for older callers', () => {
    render(<RiskFlagsSection listing={{ ...VAUGHAN_LISTING, riskFlags: [] }} />)
    expect(screen.getByText(/No risk language was found/)).toBeInTheDocument()
  })
})
