/**
 * ListedVsRealitySection — unit tests
 *
 * PR5 · Tenant Report component tests
 * Test file path: Week3-4 Front end/PR5/ListedVsRealitySection.test.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListedVsRealitySection } from '../../apps/web/src/components/tenant/ListedVsRealitySection'
import type { TenantRealityItem } from '../../apps/web/src/types/analysis'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ALL_OK_REALITY: TenantRealityItem[] = [
  { txt: '1 proper bedroom + 1 glass-door den', tone: 'ok' },
  { txt: '2 full bathrooms', tone: 'ok' },
  { txt: 'Ensuite laundry confirmed', tone: 'ok' },
]

const ALL_OK_LISTED = ['2 bedrooms + study', '2 full bathrooms', 'Ensuite laundry']

const MIXED_REALITY: TenantRealityItem[] = [
  { txt: '1 proper bedroom + 1 glass-door den', tone: 'bad' },
  { txt: '2 full bathrooms', tone: 'ok' },
  { txt: 'Floor-to-ceiling windows in living — den likely has none', tone: 'bad' },
  { txt: 'No parking confirmed — clarify urgently', tone: 'bad' },
]

const MIXED_LISTED = [
  '2 bedrooms + study',
  '2 full baths',
  'Expansive windows, filled with natural light',
  'Parking — contact manager',
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ListedVsRealitySection', () => {
  it('returns null (renders nothing) when mismatchCount === 0', () => {
    const { container } = render(
      <ListedVsRealitySection listed={ALL_OK_LISTED} reality={ALL_OK_REALITY} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders both the "How it\'s listed" and "What you\'ll actually get" cards when mismatches exist', () => {
    render(<ListedVsRealitySection listed={MIXED_LISTED} reality={MIXED_REALITY} />)
    expect(screen.getByText(/How it's listed/i)).toBeInTheDocument()
    expect(screen.getByText(/What you'll actually get/i)).toBeInTheDocument()
  })

  it('renders the original listing text in the left card', () => {
    render(<ListedVsRealitySection listed={MIXED_LISTED} reality={MIXED_REALITY} />)
    expect(screen.getByText('2 bedrooms + study')).toBeInTheDocument()
    expect(screen.getByText('Parking — contact manager')).toBeInTheDocument()
  })

  it('renders the corrected reality descriptions in the right card', () => {
    render(<ListedVsRealitySection listed={MIXED_LISTED} reality={MIXED_REALITY} />)
    expect(screen.getByText('1 proper bedroom + 1 glass-door den')).toBeInTheDocument()
    expect(screen.getByText('No parking confirmed — clarify urgently')).toBeInTheDocument()
  })

  it('renders ✓ glyphs for ok-tone reality items', () => {
    render(<ListedVsRealitySection listed={MIXED_LISTED} reality={MIXED_REALITY} />)
    // The ok row ('2 full bathrooms') should render a ✓ glyph nearby
    const realityCard = screen.getByText('2 full bathrooms')
    // Traverse up to find the containing row — the ✓ should be a sibling span
    const row = realityCard.closest('[style*="padding"]')
    expect(row?.textContent).toContain('✓')
  })

  it('renders ✗ glyphs for bad-tone reality items', () => {
    render(<ListedVsRealitySection listed={MIXED_LISTED} reality={MIXED_REALITY} />)
    // The bad row should contain a ✗ glyph
    const badRow = screen.getByText('1 proper bedroom + 1 glass-door den')
    const row = badRow.closest('[style*="padding"]')
    expect(row?.textContent).toContain('✗')
  })

  it('shows the correct mismatch count label in the section verdict', () => {
    render(<ListedVsRealitySection listed={MIXED_LISTED} reality={MIXED_REALITY} />)
    // 3 bad items → "3 mismatches"
    expect(screen.getByText(/3 mismatches/i)).toBeInTheDocument()
  })

  it('uses singular "mismatch" when mismatchCount === 1', () => {
    const oneReality: TenantRealityItem[] = [{ txt: 'Bad item', tone: 'bad' }]
    render(<ListedVsRealitySection listed={['Listed item']} reality={oneReality} />)
    expect(screen.getByText(/1 mismatch$/i)).toBeInTheDocument()
  })
})
