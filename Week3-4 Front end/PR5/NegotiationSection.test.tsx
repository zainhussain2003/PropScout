/**
 * NegotiationSection — unit tests
 *
 * PR5 · Tenant Report component tests
 * Test file path: Week3-4 Front end/PR5/NegotiationSection.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NegotiationSection } from '../../apps/web/src/components/tenant/NegotiationSection'
import {
  CHARLES_LEVERAGE_FACTORS,
  CHARLES_SUGGESTED_MESSAGE,
  CHARLES_MESSAGE_REASONS,
} from '../../apps/web/src/constants/tenantDemoData'

// ── Clipboard mock ────────────────────────────────────────────────────────────

const mockWriteText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    writable: true,
    configurable: true,
  })
})

// ── Helper — render with Charles data ─────────────────────────────────────────

function renderSection() {
  return render(
    <NegotiationSection
      targetLow={1950}
      targetHigh={2000}
      leverageFactors={CHARLES_LEVERAGE_FACTORS}
      suggestedMessage={CHARLES_SUGGESTED_MESSAGE}
      messageReasons={CHARLES_MESSAGE_REASONS}
    />
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NegotiationSection', () => {
  it('renders all leverage factor keys in the table', () => {
    renderSection()
    CHARLES_LEVERAGE_FACTORS.forEach((factor) => {
      expect(screen.getByText(factor.k)).toBeInTheDocument()
    })
  })

  it('renders all leverage factor values in the table', () => {
    renderSection()
    CHARLES_LEVERAGE_FACTORS.forEach((factor) => {
      expect(screen.getByText(factor.v)).toBeInTheDocument()
    })
  })

  it('renders the copy button with the correct aria-label in default state', () => {
    renderSection()
    const copyBtn = screen.getByRole('button', { name: /Copy message to clipboard/i })
    expect(copyBtn).toBeInTheDocument()
  })

  it('clicking copy calls navigator.clipboard.writeText with the suggested message', async () => {
    renderSection()
    const copyBtn = screen.getByRole('button', { name: /Copy message to clipboard/i })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(CHARLES_SUGGESTED_MESSAGE)
    })
  })

  it('shows "Message copied to clipboard" aria-label after copy and reverts after 2 seconds', async () => {
    vi.useFakeTimers()
    renderSection()
    const copyBtn = screen.getByRole('button', { name: /Copy message to clipboard/i })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Message copied to clipboard/i })
      ).toBeInTheDocument()
    })

    // Advance past the 2-second timeout
    vi.advanceTimersByTime(2100)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copy message to clipboard/i })).toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it('renders all "Why this works" reason bullets', () => {
    renderSection()
    CHARLES_MESSAGE_REASONS.forEach((reason) => {
      expect(screen.getByText(reason)).toBeInTheDocument()
    })
  })

  it('renders the target rent range in the leverage card', () => {
    renderSection()
    // aria-label contains both target values
    const targetEl = screen.getByLabelText(/Target rent: \$1,950 to \$2,000 per month/i)
    expect(targetEl).toBeInTheDocument()
  })

  it('renders the annual savings estimate', () => {
    renderSection()
    // annualSavingsLow = (2000 - 1950) * 12 = 600; annualSavingsHigh = 1200
    expect(screen.getByText(/\$600–1,200/)).toBeInTheDocument()
  })
})
