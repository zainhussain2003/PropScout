/**
 * a11y — accessibility tests for all new PR7 components
 *
 * PR7 · Accessibility tests
 * Test file path: Week3-4 Front end/PR7/a11y.test.tsx
 *
 * Uses jest-axe (same tool as PR4/PR5/PR6) to assert zero axe violations.
 * expect.extend(toHaveNoViolations) is called globally in test-setup.ts —
 * this file calls it again for explicit documentation (idempotent).
 */

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

import { ProBadge } from '../../apps/web/src/components/paywall/ProBadge'
import { UpgradeCard } from '../../apps/web/src/components/paywall/UpgradeCard'
import { UpgradeModal } from '../../apps/web/src/components/paywall/UpgradeModal'
import { HardLimitGate } from '../../apps/web/src/components/paywall/HardLimitGate'
import { BlockState } from '../../apps/web/src/components/states/BlockState'
import { ProvinceGate } from '../../apps/web/src/components/states/ProvinceGate'
import { LockedButton } from '../../apps/web/src/components/paywall/LockedButton'

describe('a11y — ProBadge', () => {
  it('zero axe violations', async () => {
    const { container } = render(<ProBadge />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — UpgradeCard', () => {
  it('zero axe violations', async () => {
    const { container } = render(<UpgradeCard headline="Unlock Pro" sub="Get access" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — UpgradeModal', () => {
  it('zero axe violations when open', async () => {
    const { container } = render(
      <UpgradeModal open={true} onClose={() => undefined} feature="generic" />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — HardLimitGate', () => {
  it('zero axe violations', async () => {
    const { container } = render(
      <HardLimitGate onClose={() => undefined} monthlyLimit={3} used={2} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — BlockState', () => {
  it('zero axe violations', async () => {
    const { container } = render(<BlockState icon="flag" headline="Error" body="Try again" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — ProvinceGate', () => {
  it('zero axe violations', async () => {
    const { container } = render(<ProvinceGate />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('a11y — LockedButton', () => {
  it('zero axe violations', async () => {
    const { container } = render(<LockedButton label="Export PDF" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
