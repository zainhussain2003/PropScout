import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OwnerValueForm, parseValueInput, parseRateInput } from './OwnerValueForm'

describe('parseValueInput', () => {
  it('reads a formatted dollar figure', () => {
    expect(parseValueInput('$1,250,000')).toBe(1_250_000)
    expect(parseValueInput('850000')).toBe(850_000)
    expect(parseValueInput(' 799,999.60 ')).toBe(800_000)
  })

  it('returns null for nothing usable', () => {
    expect(parseValueInput('')).toBeNull()
    expect(parseValueInput('lots')).toBeNull()
    expect(parseValueInput('0')).toBeNull()
  })
})

describe('parseRateInput', () => {
  it('reads a percentage into a decimal', () => {
    expect(parseRateInput('3.89')).toBeCloseTo(0.0389, 6)
    expect(parseRateInput('4.5%')).toBeCloseTo(0.045, 6)
    expect(parseRateInput('')).toBeNull()
    expect(parseRateInput('abc')).toBeNaN()
  })
})

describe('OwnerValueForm — owned position (D-108)', () => {
  it('"I already own it" reveals balance and rate; a balance and rate are submitted as entered', () => {
    const onSubmit = vi.fn()
    render(<OwnerValueForm busy={false} error={null} onSubmit={onSubmit} />)
    expect(screen.queryByLabelText('Mortgage balance')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('What is it worth?'), { target: { value: '800,000' } })
    fireEvent.click(screen.getByLabelText('I already own it'))
    fireEvent.change(screen.getByLabelText('Mortgage balance'), { target: { value: '320,000' } })
    fireEvent.change(screen.getByLabelText('Rate %'), { target: { value: '3.89' } })
    fireEvent.click(screen.getByRole('button', { name: 'Score it' }))
    expect(onSubmit).toHaveBeenCalledWith({
      value: 800_000,
      mortgageBalance: 320_000,
      mortgageRate: 0.0389,
    })
  })

  it('a blank balance means owned outright: balance 0, no rate', () => {
    const onSubmit = vi.fn()
    render(<OwnerValueForm busy={false} error={null} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('What is it worth?'), { target: { value: '800000' } })
    fireEvent.click(screen.getByLabelText('I already own it'))
    expect(screen.getByLabelText('Rate %')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Score it' }))
    expect(onSubmit).toHaveBeenCalledWith({
      value: 800_000,
      mortgageBalance: 0,
      mortgageRate: null,
    })
  })

  it('refuses a balance above the value and a rate outside 1–25%', () => {
    const onSubmit = vi.fn()
    render(<OwnerValueForm busy={false} error={null} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('What is it worth?'), { target: { value: '800000' } })
    fireEvent.click(screen.getByLabelText('I already own it'))
    fireEvent.change(screen.getByLabelText('Mortgage balance'), { target: { value: '900000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Score it' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/no larger than the value/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Mortgage balance'), { target: { value: '300000' } })
    fireEvent.change(screen.getByLabelText('Rate %'), { target: { value: '40' } })
    fireEvent.click(screen.getByRole('button', { name: 'Score it' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/between 1 and 25/)).toBeInTheDocument()
  })

  it('pre-fills a saved owned position', () => {
    render(
      <OwnerValueForm
        initialValue={800_000}
        initialMortgageBalance={320_000}
        initialMortgageRate={0.0389}
        busy={false}
        error={null}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByLabelText('I already own it')).toBeChecked()
    expect(screen.getByLabelText('Mortgage balance')).toHaveValue('320,000')
    expect(screen.getByLabelText('Rate %')).toHaveValue('3.89')
  })
})

describe('OwnerValueForm (D-107)', () => {
  it('submits the parsed value', () => {
    const onSubmit = vi.fn()
    render(<OwnerValueForm busy={false} error={null} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('What is it worth?'), { target: { value: '850,000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Score it' }))
    expect(onSubmit).toHaveBeenCalledWith({
      value: 850_000,
      mortgageBalance: null,
      mortgageRate: null,
    })
  })

  it('does not submit an empty or out-of-range value, and says why', () => {
    const onSubmit = vi.fn()
    render(<OwnerValueForm busy={false} error={null} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Score it' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('We need a value to score anything.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('What is it worth?'), { target: { value: '2,000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Score it' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/Enter a value between \$50,000 and \$50,000,000/)).toBeInTheDocument()
  })

  it('shows the busy state and the API error', () => {
    const { rerender } = render(<OwnerValueForm busy error={null} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Scoring…' })).toBeDisabled()
    rerender(<OwnerValueForm busy={false} error="Service unavailable." onSubmit={vi.fn()} />)
    expect(screen.getByText('Service unavailable.')).toBeInTheDocument()
  })

  it('pre-fills a previous value and offers to keep it', () => {
    const onCancel = vi.fn()
    render(
      <OwnerValueForm
        initialValue={800_000}
        busy={false}
        error={null}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    )
    expect(screen.getByLabelText('What is it worth?')).toHaveValue('800,000')
    fireEvent.click(screen.getByRole('button', { name: 'Keep the current value' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
