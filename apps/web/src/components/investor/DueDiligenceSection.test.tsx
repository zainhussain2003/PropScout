/**
 * DueDiligenceSection — ticks on a live report survive a reload; the page says
 * where they live.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { DueDiligenceSection } from './DueDiligenceSection'

describe('DueDiligenceSection — saved progress', () => {
  beforeEach(() => window.localStorage.clear())

  it('keeps ticks under the report token and says so', () => {
    render(<DueDiligenceSection storageKey="tok-1" />)
    expect(screen.getByText(/kept in this browser/i)).toBeInTheDocument()
    const first = screen.getAllByRole('checkbox')[0]!
    fireEvent.click(first)
    expect(screen.getByText(/1 \/ \d+ complete/)).toBeInTheDocument()
    cleanup()

    render(<DueDiligenceSection storageKey="tok-1" />)
    expect(screen.getByText(/1 \/ \d+ complete/)).toBeInTheDocument()
    expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(true)
  })

  it('the demo keeps nothing and makes no claim', () => {
    render(<DueDiligenceSection />)
    expect(screen.queryByText(/kept in this browser/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('checkbox')[0]!)
    expect(window.localStorage.length).toBe(0)
  })
})
