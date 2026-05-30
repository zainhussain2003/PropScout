/**
 * AccountPage — integration tests
 *
 * PR7 · Account page integration tests
 * Test file path: Week3-4 Front end/PR7/accountPage.integration.test.tsx
 *
 * All renders are wrapped in MemoryRouter with initialEntries
 * so that useSearchParams resolves to the correct view.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AccountPage } from '../../apps/web/src/pages/AccountPage'

function renderWithView(view: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/', search: `?view=${view}` }]}>
      <AccountPage />
    </MemoryRouter>
  )
}

describe('AccountPage — ?view=saved', () => {
  it('renders "Saved analyses" text', () => {
    renderWithView('saved')
    expect(screen.getAllByText(/Saved analyses/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders at least one saved card (SAVED_ANALYSES[0] address visible)', () => {
    renderWithView('saved')
    expect(screen.getByText('Unit 5702 · 5 Buttermill Ave')).toBeInTheDocument()
  })
})

describe('AccountPage — ?view=profile', () => {
  it('renders "Profile" text', () => {
    renderWithView('profile')
    expect(screen.getAllByText(/Profile/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders an input with "Marcus Reilly" as its value', () => {
    renderWithView('profile')
    const input = screen.getByDisplayValue('Marcus Reilly')
    expect(input).toBeInTheDocument()
  })
})

describe('AccountPage — ?view=plan', () => {
  it('renders "Plan" text in the page', () => {
    renderWithView('plan')
    expect(screen.getAllByText(/Plan/i).length).toBeGreaterThanOrEqual(1)
  })
})

describe('AccountPage — ?view=notifications', () => {
  it('renders "Notifications" text', () => {
    renderWithView('notifications')
    expect(screen.getAllByText(/Notifications/i).length).toBeGreaterThanOrEqual(1)
  })
})

describe('AccountPage — filter chips (saved view)', () => {
  it('after clicking "Investment" chip, shows an investor card and hides tenant cards', () => {
    renderWithView('saved')

    // Click the "Investment" filter chip button
    const investmentBtns = screen.getAllByRole('button', { name: /^Investment$/ })
    // The filter chip is the button labelled exactly "Investment" (not "Investment" kind chip on cards)
    // Use fireEvent to click the first match (the filter chip)
    fireEvent.click(investmentBtns[0])

    // An investor card address should be visible
    expect(screen.getByText('Unit 5702 · 5 Buttermill Ave')).toBeInTheDocument()

    // Tenant-kind card address should NOT be visible after investment filter
    expect(screen.queryByText('Unit 3705 · 28 Charles St E')).not.toBeInTheDocument()
  })
})
