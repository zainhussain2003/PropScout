/**
 * LockedButton — unit tests
 *
 * PR7 · Paywall component tests
 * Test file path: Week3-4 Front end/PR7/lockedButton.test.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LockedButton } from '../../apps/web/src/components/paywall/LockedButton'

describe('LockedButton — label only', () => {
  it('renders the label text', () => {
    render(<LockedButton label="Export PDF" />)
    expect(screen.getByText('Export PDF')).toBeInTheDocument()
  })

  it('renders the inline "Pro" badge span', () => {
    render(<LockedButton label="Export PDF" />)
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })

  it('contains a lock SVG with aria-hidden="true"', () => {
    const { container } = render(<LockedButton label="Export PDF" />)
    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).not.toBeNull()
  })
})

describe('LockedButton — onClick', () => {
  it('calls onClick exactly once when the button is clicked', () => {
    const onClick = vi.fn()
    render(<LockedButton label="Save" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('LockedButton — with icon prop', () => {
  it('renders without error when icon="doc" is passed', () => {
    expect(() => render(<LockedButton label="Export PDF" icon="doc" />)).not.toThrow()
  })
})
