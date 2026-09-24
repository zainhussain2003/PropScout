import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DesignProvider } from './DesignProvider'
import { LandingPage } from '../../pages/LandingPage'
import type { AppDesign } from '../../types/design'

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ session: null, loading: false }) }))
const scrapeUrl = vi.fn()
vi.mock('../../lib/services/analysisService', async (original) => ({
  ...(await original<typeof import('../../lib/services/analysisService')>()),
  scrapeUrl: (url: string) => scrapeUrl(url),
}))

function mount(design: AppDesign = 'hybrid'): ReturnType<typeof render> {
  return render(
    <DesignProvider design={design}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </DesignProvider>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('hybrid application presentation', () => {
  it('selects hybrid while keeping the property input empty and disabled', () => {
    mount()
    expect(document.documentElement).toHaveAttribute('data-design', 'hybrid')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "Know what you're really signing up for."
    )
    expect(screen.getByRole('textbox', { name: 'Listing link or property address' })).toHaveValue(
      ''
    )
    expect(screen.getByRole('button', { name: /^Analyze/ })).toBeDisabled()
  })

  it('rolls back original headline and navigation with no hybrid sample chooser', () => {
    mount('legacy')
    expect(document.documentElement).toHaveAttribute('data-design', 'legacy')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Know what a Canadian listing is'
    )
    expect(screen.queryByRole('group', { name: 'Rental listings' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start free/ })).toBeInTheDocument()
  })

  it('keeps light/dark independent from design selection', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle dark mode' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-design', 'hybrid')
    fireEvent.click(screen.getByRole('button', { name: 'Toggle light mode' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('groups sample links by compatible listing type without inventing saved-report switches', () => {
    mount()
    const rental = within(screen.getByRole('group', { name: 'Rental listings' }))
    expect(rental.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/tenant-report',
      '/landlord-report',
    ])
    const sale = within(screen.getByRole('group', { name: 'Sale listings' }))
    expect(sale.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      '/personal-report',
      '/investor-report',
    ])
    expect(screen.getByText(/Each sample is a different example property/)).toBeInTheDocument()
  })

  it('retains every homepage section anchor and mobile navigation', () => {
    const { container } = mount()
    const nav = within(screen.getByRole('navigation', { name: 'Main navigation' }))
    for (const id of ['reports', 'sunscout', 'how', 'pricing', 'faq']) {
      expect(nav.getAllByRole('link').some((a) => a.getAttribute('href') === `#${id}`)).toBe(true)
      expect(container.querySelector(`#${id}`)).not.toBeNull()
    }
    const menu = container.querySelector('details.hy-mobile-menu') as HTMLDetailsElement
    menu.open = true
    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(menu.open).toBe(false)
    expect(menu.querySelector('summary')).toHaveFocus()
  })

  it('keeps sign-in focus inside the existing dialog and closes on Escape', async () => {
    mount()
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' })[0])
    const dialog = screen.getByRole('dialog', { name: 'Sign in' })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Sign in' })).not.toBeInTheDocument()
  })

  it.each(['for-rent', 'for-sale'])(
    'uses real detection for %s and preserves the listing in the confirmation',
    async (listingType) => {
      scrapeUrl.mockResolvedValue({
        token: 'same-property',
        listing: {
          listingType,
          address: '123 Test Street',
          price: 700000,
          rentMonthly: 2500,
          beds: 2,
          baths: 1,
          sqft: null,
        },
      })
      mount()
      const url = 'https://www.realtor.ca/real-estate/12345678/123-test-street-toronto'
      fireEvent.change(screen.getByRole('textbox', { name: 'Listing link or property address' }), {
        target: { value: url },
      })
      fireEvent.click(screen.getByRole('button', { name: /^Analyze/ }))
      await waitFor(() => expect(scrapeUrl).toHaveBeenCalledWith(url))
      expect(await screen.findByText('123 Test Street')).toBeInTheDocument()
      if (listingType === 'for-rent') {
        expect(screen.getByText("I'm evaluating this as a tenant")).toBeInTheDocument()
        expect(screen.getByText("I'm pricing my own unit")).toBeInTheDocument()
        expect(screen.queryByText("I'm buying it as an investment")).not.toBeInTheDocument()
      } else {
        expect(screen.getByText("I'm buying it as an investment")).toBeInTheDocument()
        expect(screen.getByText("I'm buying it to live in")).toBeInTheDocument()
        expect(screen.queryByText("I'm evaluating this as a tenant")).not.toBeInTheDocument()
      }
    }
  )
})
