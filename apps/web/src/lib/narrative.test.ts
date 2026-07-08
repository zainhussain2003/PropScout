/**
 * Unit tests for the narrative Markdown-stripping helpers.
 */

import { describe, it, expect } from 'vitest'
import { stripMarkdown, withCleanNarrative } from './narrative'

describe('stripMarkdown', () => {
  it('strips **bold** markers, keeping the inner text', () => {
    expect(stripMarkdown('priced **$552 above the market median**')).toBe(
      'priced $552 above the market median'
    )
  })

  it('strips *italic* markers', () => {
    expect(stripMarkdown('the deal *does not* pencil')).toBe('the deal does not pencil')
  })

  it('strips __bold__ and ***bold italic*** markers', () => {
    expect(stripMarkdown('__strong__ and ***very strong***')).toBe('strong and very strong')
  })

  it('strips inline `code` backticks', () => {
    expect(stripMarkdown('DSCR is `0.45x`')).toBe('DSCR is 0.45x')
  })

  it('reduces [text](url) links to their text', () => {
    expect(stripMarkdown('see [the comps](https://x.co)')).toBe('see the comps')
  })

  it('handles multiple bold spans in one string', () => {
    expect(stripMarkdown('**$4,733** out vs **$2,900** in')).toBe('$4,733 out vs $2,900 in')
  })

  it('leaves ordinary prose untouched', () => {
    const plain = 'This condo runs a deep monthly shortfall at current rents.'
    expect(stripMarkdown(plain)).toBe(plain)
  })

  it('does not mangle snake_case tokens as italic', () => {
    expect(stripMarkdown('the cash_flow_monthly field')).toBe('the cash_flow_monthly field')
  })
})

describe('withCleanNarrative', () => {
  it('returns a copy with the narrative stripped of Markdown', () => {
    const input = { narrative: 'priced **$552 above** median', other: 1 }
    const out = withCleanNarrative(input)
    expect(out.narrative).toBe('priced $552 above median')
    expect(out.other).toBe(1)
  })

  it('is a no-op when narrative is null', () => {
    const input = { narrative: null }
    expect(withCleanNarrative(input)).toBe(input)
  })
})
