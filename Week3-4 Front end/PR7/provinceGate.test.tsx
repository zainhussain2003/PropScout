/**
 * ProvinceGate — unit tests
 *
 * PR7 · State component tests
 * Test file path: Week3-4 Front end/PR7/provinceGate.test.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProvinceGate } from '../../apps/web/src/components/states/ProvinceGate'

describe('ProvinceGate — initial state', () => {
  it('renders the "We\'re not in your market yet." headline', () => {
    render(<ProvinceGate />)
    expect(screen.getByText("We're not in your market yet.")).toBeInTheDocument()
  })

  it('renders an email input', () => {
    render(<ProvinceGate />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders the "Join the waitlist" submit button', () => {
    render(<ProvinceGate />)
    expect(screen.getByText('Join the waitlist')).toBeInTheDocument()
  })
})

describe('ProvinceGate — type and submit', () => {
  it('calls onSubmit with the typed email, shows confirmation, and removes email input', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<ProvinceGate onSubmit={onSubmit} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test@example.com')
    await user.click(screen.getByText('Join the waitlist'))

    expect(onSubmit).toHaveBeenCalledWith('test@example.com')
    expect(await screen.findByText("You're on the list.")).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})

describe('ProvinceGate — submitted=true prop', () => {
  it('shows "You\'re on the list." immediately when submitted=true', () => {
    render(<ProvinceGate submitted={true} />)
    expect(screen.getByText("You're on the list.")).toBeInTheDocument()
  })

  it('does not render an email input when submitted=true', () => {
    render(<ProvinceGate submitted={true} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
