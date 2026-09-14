import { describe, it, expect } from 'vitest'
import { scanState } from './scanState'

describe('scanState — a failed scan is never a clean one', () => {
  it('no text wins over everything', () => {
    expect(scanState({ flagCount: 0, hasDescription: false, extractionStatus: 'ok' })).toBe(
      'no_text'
    )
    expect(scanState({ flagCount: 0, extractionStatus: 'no_text' })).toBe('no_text')
  })
  it('failed is failed even with zero flags', () => {
    expect(scanState({ flagCount: 0, hasDescription: true, extractionStatus: 'failed' })).toBe(
      'failed'
    )
  })
  it('flags from a partial scan are still flags; none from a partial scan is partial, not clean', () => {
    expect(scanState({ flagCount: 2, extractionStatus: 'partial' })).toBe('flagged')
    expect(scanState({ flagCount: 0, extractionStatus: 'partial' })).toBe('partial')
  })
  it('an older report with no status reads as it did', () => {
    expect(scanState({ flagCount: 0, hasDescription: true })).toBe('clean')
    expect(scanState({ flagCount: 0, hasDescription: true, extractionStatus: null })).toBe('clean')
  })
})
