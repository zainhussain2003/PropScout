import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OwnerValueForm, parseValueInput } from './OwnerValueForm'

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

describe('OwnerValueForm (D-107)', () => {
  it('submits the parsed value', () => {
    const onSubmit = vi.fn()
    render(<OwnerValueForm busy={false} error={null} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('What is it worth?'), { target: { value: '850,000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Score it' }))
    expect(onSubmit).toHaveBeenCalledWith(850_000)
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
