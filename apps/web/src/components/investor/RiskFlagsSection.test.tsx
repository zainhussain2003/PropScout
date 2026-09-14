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

describe('RiskFlagsSection — a scan that did not run is not a clean scan (D-090)', () => {
  it('says the scan did not run when the engine reports failed', () => {
    render(
      <RiskFlagsSection
        listing={{
          ...VAUGHAN_LISTING,
          riskFlags: [],
          hasDescription: true,
          extractionStatus: 'failed',
        }}
      />
    )
    expect(screen.getByText(/Scan did not run/i)).toBeInTheDocument()
    expect(screen.getByText(/could not be scanned/i)).toBeInTheDocument()
    expect(screen.queryByText(/No risk language was found/i)).not.toBeInTheDocument()
  })

  it('calls an empty partial scan partial, not clean', () => {
    render(
      <RiskFlagsSection
        listing={{
          ...VAUGHAN_LISTING,
          riskFlags: [],
          hasDescription: true,
          extractionStatus: 'partial',
        }}
      />
    )
    expect(screen.getByText(/Partial scan/i)).toBeInTheDocument()
    expect(screen.getByText(/Only the pattern scan ran/i)).toBeInTheDocument()
  })

  it('keeps pattern flags from a partial scan and says where they came from', () => {
    render(
      <RiskFlagsSection
        listing={{
          ...VAUGHAN_LISTING,
          hasDescription: true,
          extractionStatus: 'partial',
          riskFlags: [
            { id: 'grow_op_history', tone: 'red', label: 'Former grow op', detail: 'x', deduct: 5 },
          ],
        }}
      />
    )
    expect(screen.getByText('Former grow op')).toBeInTheDocument()
    expect(screen.getByText(/Flags below are from patterns alone/i)).toBeInTheDocument()
  })
})

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
