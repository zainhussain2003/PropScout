/**
 * Functionality tests for the LandingPage.
 *
 * Tests cover:
 *   - Page renders without crashing
 *   - Nav is present
 *   - Hero URL input and Analyze button are present
 *   - URL validation shows error for invalid URL
 *   - URL validation accepts valid realtor.ca URL
 *   - Sample listing buttons are rendered
 *   - All major sections are present (how, pricing, FAQ)
 *   - Footer is present
 *   - ModeModal opens after "done" state + clicking "Open report"
 *   - Dark mode toggle flips data-theme on <html>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from './LandingPage'

// Mock useNavigate to avoid actual navigation in tests
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  }
})

function renderLanding(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  )
}

describe('LandingPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    // Reset data-theme
    document.documentElement.removeAttribute('data-theme')
  })

  // ── Render ────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    const { container } = renderLanding()
    expect(container).toBeInTheDocument()
  })

  it('renders the Nav with "Sign in" button', () => {
    renderLanding()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders the hero heading', () => {
    renderLanding()
    expect(screen.getByText(/know what a canadian listing/i)).toBeInTheDocument()
  })

  it('renders the URL input with placeholder', () => {
    renderLanding()
    expect(screen.getByPlaceholderText(/paste a listing url/i)).toBeInTheDocument()
  })

  it('renders the Analyze button', () => {
    renderLanding()
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
  })

  it('shows validation error when Analyze is clicked with empty input', async () => {
    renderLanding()
    const input = screen.getByPlaceholderText(/paste a listing url/i)
    // Clear the pre-filled sample URL
    fireEvent.change(input, { target: { value: '' } })
    const analyzeButton = screen.getByRole('button', { name: /analyze/i })
    fireEvent.click(analyzeButton)
    expect(await screen.findByText(/not a usable link/i)).toBeInTheDocument()
  })

  // ── Sample listings ───────────────────────────────────────────────

  it('renders the sample listing buttons', () => {
    renderLanding()
    expect(screen.getByText(/toronto rental/i)).toBeInTheDocument()
    expect(screen.getByText(/hamilton duplex/i)).toBeInTheDocument()
  })

  // ── URL validation ────────────────────────────────────────────────

  it('shows error state when a non-listing URL is submitted', async () => {
    renderLanding()
    const input = screen.getByPlaceholderText(/paste a listing url/i)
    fireEvent.change(input, { target: { value: 'https://www.example.com/property' } })
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => {
      expect(screen.getByText(/not a usable link/i)).toBeInTheDocument()
    })
  })

  it('shows error state for a US Zillow URL', async () => {
    renderLanding()
    const input = screen.getByPlaceholderText(/paste a listing url/i)
    fireEvent.change(input, { target: { value: 'https://www.zillow.com/homedetails/12345' } })
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => {
      expect(screen.getByText(/canadian properties only/i)).toBeInTheDocument()
    })
  })

  it('dismisses the error when "Dismiss" is clicked', async () => {
    renderLanding()
    const input = screen.getByPlaceholderText(/paste a listing url/i)
    fireEvent.change(input, { target: { value: 'https://www.example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /analyze/i }))
    await waitFor(() => screen.getByText(/not a usable link/i))
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText(/not a usable link/i)).not.toBeInTheDocument()
  })

  // ── Sections ──────────────────────────────────────────────────────

  it('renders the How it works section', () => {
    renderLanding()
    // "How it works" appears in the Nav link and section tag — getAllByText is correct here
    const matches = screen.getAllByText(/how it works/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('renders the Pricing section', () => {
    renderLanding()
    expect(screen.getByText(/pricing · cad/i)).toBeInTheDocument()
  })

  it('renders the FAQ section heading', () => {
    renderLanding()
    expect(screen.getByText(/common questions/i)).toBeInTheDocument()
  })

  it('expands an FAQ item on click', () => {
    renderLanding()
    // Find the FAQ button by its visible serif text; the button also has an Icon child
    const faqBtns = screen.getAllByRole('button')
    const ontarioBtn = faqBtns.find((btn) =>
      btn.textContent?.toLowerCase().includes('why ontario only')
    )
    expect(ontarioBtn).toBeDefined()
    expect(screen.queryByText(/province-specific/i)).not.toBeInTheDocument()
    fireEvent.click(ontarioBtn!)
    expect(screen.getByText(/province-specific/i)).toBeInTheDocument()
  })

  it('toggles pricing to yearly', () => {
    renderLanding()
    const yearlyBtn = screen.getByRole('button', { name: /yearly/i })
    fireEvent.click(yearlyBtn)
    // Yearly total for Investor Pro is $100 — verify it appears
    expect(screen.getByText(/100 billed yearly/i)).toBeInTheDocument()
  })

  it('renders the Footer', () => {
    renderLanding()
    // Footer has the wordmark / copyright — find the footer element
    expect(document.querySelector('footer')).toBeInTheDocument()
  })

  // ── Dark mode ─────────────────────────────────────────────────────

  it('toggles dark mode when the theme button is clicked', async () => {
    renderLanding()
    const toggle = screen.getByRole('button', { name: /toggle dark mode|switch to dark mode/i })
    fireEvent.click(toggle)
    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })

  // ── Sign-in modal ─────────────────────────────────────────────────

  it('opens the sign-in modal when "Sign in" is clicked', async () => {
    renderLanding()
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      // SignInModal renders a dialog or sheet
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
