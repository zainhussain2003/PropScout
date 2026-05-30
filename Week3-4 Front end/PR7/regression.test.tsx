/**
 * regression — PR1–PR6 still pass after adding PR7; architectural contracts enforced.
 *
 * PR7 · Regression tests
 * Test file path: Week3-4 Front end/PR7/regression.test.tsx
 *
 * 1. Renders one representative component from each prior PR.
 * 2. Asserts UpgradeModal and HardLimitGate are NOT imported in any report page.
 * 3. Asserts PaywallContext is not directly imported in any report page
 *    (pages must use usePaywall() only).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import fs from 'fs'
import path from 'path'

// ── PR1: Button ────────────────────────────────────────────────────────────────
import { Button } from '../../apps/web/src/components/shared/Button'

// ── PR3: ModeModal ─────────────────────────────────────────────────────────────
import { ModeModal } from '../../apps/web/src/components/shared/ModeModal'

// ── PR4: DealScore ─────────────────────────────────────────────────────────────
import { DealScore } from '../../apps/web/src/components/analysis/DealScore'

// ── PR5: FlagDeepRow ───────────────────────────────────────────────────────────
import { FlagDeepRow } from '../../apps/web/src/components/tenant/FlagDeepRow'
import type { TenantFlag } from '../../apps/web/src/types/analysis'

// ── PR6: SchoolCard ────────────────────────────────────────────────────────────
import { SchoolCard } from '../../apps/web/src/components/personal/SchoolCard'

// ── DevToolbar ─────────────────────────────────────────────────────────────────
import { DevToolbar } from '../../apps/web/src/components/dev/DevToolbar'
import type { PersonalSchool } from '../../apps/web/src/types/personal'

// ── Fixtures ───────────────────────────────────────────────────────────────────

const MINIMAL_FLAG: TenantFlag = {
  tone: 'red',
  label: 'Den listed as bedroom',
  detail: 'Room has no window and a sliding glass door.',
  evidence: 'Listed as "2-bedroom".',
  ask: 'Can you confirm this room has a window?',
}

const SCHOOL: PersonalSchool = {
  name: 'Tom Thomson Public School',
  board: 'HDSB · public',
  distance: '0.6 km',
  driveTime: '2 min',
  eqao: 9.1,
  fraser: 88,
  inCatchment: true,
  grades: 'JK–8',
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

// ── PR1: Button ────────────────────────────────────────────────────────────────

describe('Regression — PR1: Button', () => {
  it('renders without throwing', () => {
    expect(() => render(<Button variant="primary">Test</Button>)).not.toThrow()
  })
})

// ── PR3: ModeModal ─────────────────────────────────────────────────────────────

describe('Regression — PR3: ModeModal', () => {
  it('renders without throwing (open=false)', () => {
    expect(() =>
      renderWithRouter(
        <ModeModal
          open={false}
          listing={null}
          onClose={() => undefined}
          onSelect={() => undefined}
        />
      )
    ).not.toThrow()
  })
})

// ── PR4: DealScore ─────────────────────────────────────────────────────────────

describe('Regression — PR4: DealScore', () => {
  it('renders without throwing', () => {
    expect(() => render(<DealScore score={84} />)).not.toThrow()
  })
})

// ── PR5: FlagDeepRow ───────────────────────────────────────────────────────────

describe('Regression — PR5: FlagDeepRow', () => {
  it('renders without throwing with minimal required props', () => {
    expect(() => render(<FlagDeepRow flag={MINIMAL_FLAG} />)).not.toThrow()
  })
})

// ── PR6: SchoolCard ────────────────────────────────────────────────────────────

describe('Regression — PR6: SchoolCard', () => {
  it('renders without throwing with minimal required props', () => {
    expect(() => render(<SchoolCard school={SCHOOL} />)).not.toThrow()
  })
})

// ── Architectural contract: UpgradeModal and HardLimitGate not in report pages ─

const REPORT_PAGES = [
  'apps/web/src/pages/InvestorReport.tsx',
  'apps/web/src/pages/TenantReport.tsx',
  'apps/web/src/pages/PersonalBuyerPage.tsx',
  'apps/web/src/pages/LandlordPage.tsx',
]

describe('Architectural contract — UpgradeModal + HardLimitGate isolation', () => {
  it('UpgradeModal is NOT imported in any report page', () => {
    for (const relPath of REPORT_PAGES) {
      const absPath = path.resolve(__dirname, '../../', relPath)
      const content = fs.readFileSync(absPath, 'utf-8')
      const match = content.match(/import.*UpgradeModal/)
      expect(
        match,
        `Found "import.*UpgradeModal" in ${relPath} — UpgradeModal must only be mounted in App.tsx`
      ).toBeNull()
    }
  })

  it('HardLimitGate is NOT imported in any report page', () => {
    for (const relPath of REPORT_PAGES) {
      const absPath = path.resolve(__dirname, '../../', relPath)
      const content = fs.readFileSync(absPath, 'utf-8')
      const match = content.match(/import.*HardLimitGate/)
      expect(
        match,
        `Found "import.*HardLimitGate" in ${relPath} — HardLimitGate must only be mounted in App.tsx`
      ).toBeNull()
    }
  })
})

// ── Architectural contract: report pages use usePaywall(), not PaywallContext ──

describe('Architectural contract — usePaywall() not PaywallContext import', () => {
  it('PaywallContext (context object) is NOT directly imported in any report page', () => {
    // Matches `import { PaywallContext ...}` but NOT `import { usePaywall } from '...PaywallContext'`
    // Report pages may import usePaywall from the PaywallContext *module*,
    // but must not import the context object itself.
    for (const relPath of REPORT_PAGES) {
      const absPath = path.resolve(__dirname, '../../', relPath)
      const content = fs.readFileSync(absPath, 'utf-8')
      const match = content.match(/import\s*\{[^}]*\bPaywallContext\b[^}]*\}/)
      expect(
        match,
        `Found "import { PaywallContext }" in ${relPath} — report pages must use usePaywall() only`
      ).toBeNull()
    }
  })
})

// ── DevToolbar ─────────────────────────────────────────────────────────────────

describe('DevToolbar', () => {
  it('renders null outside DEV mode', () => {
    vi.stubEnv('DEV', false)
    const { container } = render(<DevToolbar slots={[{ label: 'Test', onClick: () => {} }]} />)
    expect(container.firstChild).toBeNull()
    vi.unstubAllEnvs()
  })

  it('renders the DEV toggle tab in DEV mode', () => {
    vi.stubEnv('DEV', true)
    render(<DevToolbar slots={[{ label: 'Test action', onClick: () => {} }]} />)
    expect(screen.getByText(/DEV/)).toBeInTheDocument()
    vi.unstubAllEnvs()
  })

  it('shows slot buttons when toolbar is opened', () => {
    vi.stubEnv('DEV', true)
    render(<DevToolbar slots={[{ label: 'Test action', onClick: () => {} }]} />)
    const toggle = screen.getByText(/DEV/)
    fireEvent.click(toggle)
    expect(screen.getByText('Test action')).toBeInTheDocument()
    vi.unstubAllEnvs()
  })
})
