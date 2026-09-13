/**
 * useTheme — one theme, remembered (audit UI-04).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useTheme, resetThemeForTests, setTheme } from './useTheme'
import { LandingPage } from '../pages/LandingPage'
import { AccountPage } from '../pages/AccountPage'

function Probe(): JSX.Element {
  const { dark, toggle } = useTheme()
  return (
    <button onClick={toggle} data-testid="probe">
      {dark ? 'dark' : 'light'}
    </button>
  )
}

describe('useTheme', () => {
  beforeEach(() => {
    resetThemeForTests()
  })
  afterEach(() => {
    resetThemeForTests()
  })

  it('starts light with no saved choice and no OS preference, and writes the attribute', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggles, writes the attribute, and remembers the choice', () => {
    render(<Probe />)
    fireEvent.click(screen.getByTestId('probe'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('propscout-theme')).toBe('dark')
  })

  it('comes back in the saved theme', () => {
    localStorage.setItem('propscout-theme', 'dark')
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('follows the OS preference when nothing is saved', () => {
    const mm = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation(
        (q: string) => ({ matches: q.includes('dark'), media: q }) as MediaQueryList
      )
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('dark')
    mm.mockRestore()
  })

  it('is shared: two subscribers see one toggle', () => {
    render(
      <>
        <Probe />
        <Probe />
      </>
    )
    const [a, b] = screen.getAllByTestId('probe')
    fireEvent.click(a)
    expect(b).toHaveTextContent('dark')
  })

  it('survives navigating to the landing page — which used to reset it to light', () => {
    // LandingPage applied its own `false` on mount, so going home from a dark
    // report flipped the whole app back to light.
    setTheme('dark')
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    cleanup()
    render(
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
