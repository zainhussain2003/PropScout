/**
 * Unit + accessibility tests for all shared components.
 * Every shared primitive is tested before any page-level component is built.
 *
 * Tests cover:
 *   - Correct rendering of key output (text, classNames, aria attributes)
 *   - Prop-driven branching (tone, variant, mode)
 *   - Accessibility: aria-label, aria-hidden, role, keyboard handling
 *   - No hardcoded colors or raw values leaking from components
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ScoutMark } from './ScoutMark'
import { Wordmark } from './Wordmark'
import { Icon } from './Icon'
import { Chip } from './Chip'
import { Button } from './Button'
import { Card } from './Card'
import { VerdictPill } from './VerdictPill'
import { SectionHead } from './SectionHead'
import { Footer } from './Footer'
import { SignInModal } from './SignInModal'

// ── ScoutMark ─────────────────────────────────────────────────────

describe('ScoutMark', () => {
  it('renders an SVG with aria-hidden', () => {
    const { container } = render(<ScoutMark />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies the size prop to width and height', () => {
    const { container } = render(<ScoutMark size={48} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '48')
    expect(svg).toHaveAttribute('height', '48')
  })

  it('defaults to size 28 when no prop is passed', () => {
    const { container } = render(<ScoutMark />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '28')
  })
})

// ── Wordmark ──────────────────────────────────────────────────────

describe('Wordmark', () => {
  it('renders "Prop" and "Scout" text', () => {
    render(<Wordmark />)
    // The full text "PropScout" is split — both parts must exist in DOM
    expect(screen.getByText(/Scout/)).toBeInTheDocument()
    expect(screen.getByText(/Prop/)).toBeInTheDocument()
  })

  it('renders a ScoutMark SVG inside', () => {
    const { container } = render(<Wordmark />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies height prop to the wrapper', () => {
    const { container } = render(<Wordmark height={40} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.height).toBe('40px')
  })
})

// ── Icon ──────────────────────────────────────────────────────────

describe('Icon', () => {
  it('renders an SVG with aria-hidden for every icon name', () => {
    const iconNames = [
      'arrow',
      'link',
      'check',
      'sun',
      'moon',
      'house',
      'chart',
      'shield',
      'doc',
      'map',
      'key',
      'flag',
      'sparkle',
      'paste',
      'plus',
      'minus',
      'dot',
    ] as const

    iconNames.forEach((name) => {
      const { container } = render(<Icon name={name} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  it('applies the size prop', () => {
    const { container } = render(<Icon name="arrow" size={24} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
  })

  it('defaults to size 16', () => {
    const { container } = render(<Icon name="check" />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '16')
  })
})

// ── Chip ──────────────────────────────────────────────────────────

describe('Chip', () => {
  it('renders children text', () => {
    render(<Chip>Condo</Chip>)
    expect(screen.getByText('Condo')).toBeInTheDocument()
  })

  it('applies the .chip class', () => {
    const { container } = render(<Chip>Condo</Chip>)
    expect(container.firstChild).toHaveClass('chip')
  })

  it('does not render the accent dot by default', () => {
    const { container } = render(<Chip>Condo</Chip>)
    expect(container.querySelector('.chip-dot')).not.toBeInTheDocument()
  })

  it('renders the accent dot when accent prop is true', () => {
    const { container } = render(<Chip accent>Condo</Chip>)
    expect(container.querySelector('.chip-dot')).toBeInTheDocument()
  })
})

// ── Button ────────────────────────────────────────────────────────

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Start free</Button>)
    expect(screen.getByText('Start free')).toBeInTheDocument()
  })

  it('applies btn-primary class by default', () => {
    render(<Button>Click</Button>)
    const btn = screen.getByRole('button', { name: 'Click' })
    expect(btn).toHaveClass('btn', 'btn-primary')
  })

  it('applies btn-ghost class for ghost variant', () => {
    render(<Button variant="ghost">Sign in</Button>)
    const btn = screen.getByRole('button', { name: 'Sign in' })
    expect(btn).toHaveClass('btn', 'btn-ghost')
  })

  it('applies btn-accent class for accent variant', () => {
    render(<Button variant="accent">Upgrade</Button>)
    const btn = screen.getByRole('button', { name: 'Upgrade' })
    expect(btn).toHaveClass('btn', 'btn-accent')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

// ── Card ──────────────────────────────────────────────────────────

describe('Card', () => {
  it('renders children inside a .card div', () => {
    render(<Card>Content here</Card>)
    const card = screen.getByText('Content here').closest('.card')
    expect(card).toBeInTheDocument()
  })

  it('passes additional className through', () => {
    const { container } = render(<Card className="extra">X</Card>)
    expect(container.firstChild).toHaveClass('card', 'extra')
  })

  it('passes style through', () => {
    const { container } = render(<Card style={{ padding: 24 }}>X</Card>)
    const el = container.firstChild as HTMLElement
    expect(el.style.padding).toBe('24px')
  })
})

// ── VerdictPill ───────────────────────────────────────────────────

describe('VerdictPill', () => {
  it('renders the label text', () => {
    render(<VerdictPill tone="pass" label="Good deal" />)
    expect(screen.getByText('Good deal')).toBeInTheDocument()
  })

  it('applies .verdict-pill and tone class', () => {
    const { container } = render(<VerdictPill tone="caution" label="Some risk" />)
    expect(container.firstChild).toHaveClass('verdict-pill', 'caution')
  })

  it('applies fail class for fail tone', () => {
    const { container } = render(<VerdictPill tone="fail" label="Hard pass" />)
    expect(container.firstChild).toHaveClass('verdict-pill', 'fail')
  })

  it('does not contain any raw hex color strings', () => {
    const { container } = render(<VerdictPill tone="pass" label="Pass" />)
    // class-based styling — no inline colors expected
    const span = container.firstChild as HTMLElement
    expect(span.style.color).toBe('')
    expect(span.style.background).toBe('')
  })
})

// ── SectionHead ───────────────────────────────────────────────────

describe('SectionHead', () => {
  it('renders the section number', () => {
    render(<SectionHead n="01" topic="Rent positioning" question={<>Is the rent fair?</>} />)
    expect(screen.getByText(/§ 01/)).toBeInTheDocument()
  })

  it('renders the topic label', () => {
    render(<SectionHead n="02" topic="Listing accuracy" question={<>Is the listing honest?</>} />)
    expect(screen.getByText('Listing accuracy')).toBeInTheDocument()
  })

  it('renders the question in an h2', () => {
    render(<SectionHead n="01" topic="Rent" question="Is the rent fair?" />)
    const h2 = screen.getByRole('heading', { level: 2, name: /fair/ })
    expect(h2).toBeInTheDocument()
  })

  it('does not render a VerdictPill when verdict is not provided', () => {
    const { container } = render(<SectionHead n="01" topic="Rent" question="Is the rent fair?" />)
    expect(container.querySelector('.verdict-pill')).not.toBeInTheDocument()
  })

  it('renders a VerdictPill when verdict is provided', () => {
    const { container } = render(
      <SectionHead
        n="01"
        topic="Rent"
        question="Is the rent fair?"
        verdict="$150 above market"
        tone="caution"
      />
    )
    const pill = container.querySelector('.verdict-pill')
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveClass('caution')
    expect(pill).toHaveTextContent('$150 above market')
  })
})

// ── Footer ────────────────────────────────────────────────────────

describe('Footer', () => {
  it('renders the legal disclaimer', () => {
    render(<Footer />)
    expect(screen.getByText(/Not financial or legal advice/i)).toBeInTheDocument()
  })

  it('renders the copyright line', () => {
    render(<Footer />)
    expect(screen.getByText(/PropScout Analytics Inc/)).toBeInTheDocument()
  })

  it('renders key footer link labels', () => {
    render(<Footer />)
    expect(screen.getByText('Privacy')).toBeInTheDocument()
    expect(screen.getByText('Terms')).toBeInTheDocument()
    expect(screen.getByText('Investment report')).toBeInTheDocument()
  })

  it('renders the Wordmark inside footer', () => {
    const { container } = render(<Footer />)
    expect(container.querySelector('svg')).toBeInTheDocument() // ScoutMark inside Wordmark
  })
})

// ── SignInModal ───────────────────────────────────────────────────

describe('SignInModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(<SignInModal open={false} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the modal when open is true', () => {
    render(<SignInModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: /Sign in/i })).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<SignInModal open onClose={onClose} />)
    // Click the backdrop (the dialog element itself, not a child)
    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<SignInModal open onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows sign-in headline by default', () => {
    render(<SignInModal open onClose={vi.fn()} />)
    expect(screen.getByText(/Sign in to read the/i)).toBeInTheDocument()
  })

  it('switches to sign-up mode when "Create a free account" link is clicked', () => {
    render(<SignInModal open onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Create a free account'))
    expect(screen.getByRole('heading', { name: /Create a free account/ })).toBeInTheDocument()
  })

  it('has an email input', () => {
    render(<SignInModal open onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
  })

  it('does not propagate clicks inside the modal card to the backdrop', () => {
    const onClose = vi.fn()
    render(<SignInModal open onClose={onClose} />)
    // Click an element inside the card (e.g. email input)
    const input = screen.getByPlaceholderText('you@example.com')
    fireEvent.click(input)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('moves focus inside the modal on open', async () => {
    render(<SignInModal open onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true)
    })
  })

  it('traps Tab at the last focusable element', () => {
    render(<SignInModal open onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'))
    const last = focusable[focusable.length - 1]
    const first = focusable[0]
    last.focus()
    // Fire on the focused element — event bubbles up to the card's onKeyDown handler
    fireEvent.keyDown(last, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(first)
  })

  it('traps Shift+Tab at the first focusable element', () => {
    render(<SignInModal open onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first.focus()
    // Fire on the focused element — event bubbles up to the card's onKeyDown handler
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
})
