import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PrintReportPage } from './PrintReportPage'
import type { Analysis } from '../types/analysis'
import type { Listing } from '../types/property'

const { renderReport } = vi.hoisted(() => ({ renderReport: vi.fn() }))
vi.mock('./ReportPage', () => ({
  ReportPage: (props: unknown) => {
    renderReport(props)
    return <p>Supplied report rendered</p>
  },
}))

afterEach(() => {
  cleanup()
  delete window.__PROPSCOUT_PRINT__
  vi.clearAllMocks()
})

describe('authenticated PDF print entry point', () => {
  it('does not expose a report when opened without a supplied payload', () => {
    const { container } = render(<PrintReportPage />)
    expect(screen.getByText('No report was supplied for printing.')).toBeInTheDocument()
    expect(renderReport).not.toHaveBeenCalled()
    expect(container.querySelector('[data-print-ready]')).toBeNull()
  })

  it('renders the supplied report with paid access without needing a browser session', () => {
    const report = { analysis: { id: 'qa' } as Analysis, listing: { id: 'qa' } as Listing }
    window.__PROPSCOUT_PRINT__ = report
    const { container } = render(<PrintReportPage />)
    expect(renderReport).toHaveBeenCalledWith({ tier: 'pro', printReport: report })
    expect(container.querySelector('[data-print-ready="true"]')).not.toBeNull()
  })
})
