/**
 * listingFacts — the contract for counts a source may not provide (D-072).
 * These pin the rule itself; the shims are tested for using it.
 */

import { describe, it, expect } from 'vitest'
import { knownCount, bareCount, countLabel, bedBathLabel, NOT_PROVIDED } from './listingFacts'

describe('knownCount', () => {
  it('passes a positive count through', () => {
    expect(knownCount(2)).toBe(2)
    expect(knownCount(1.5)).toBe(1.5)
  })

  it('treats null and undefined as not provided', () => {
    expect(knownCount(null)).toBeNull()
    expect(knownCount(undefined)).toBeNull()
  })

  it('treats zero as not provided — the scraper writes 0 for a missing count', () => {
    expect(knownCount(0)).toBeNull()
  })

  it('treats a negative or non-finite value as not provided', () => {
    expect(knownCount(-1)).toBeNull()
    expect(knownCount(NaN)).toBeNull()
    expect(knownCount(Infinity)).toBeNull()
  })
})

describe('bareCount', () => {
  it('renders the number, or the dash', () => {
    expect(bareCount(3)).toBe('3')
    expect(bareCount(0)).toBe(NOT_PROVIDED)
    expect(bareCount(null)).toBe(NOT_PROVIDED)
  })
})

describe('countLabel', () => {
  it('pluralises by count', () => {
    expect(countLabel(1, 'spot')).toBe('1 spot')
    expect(countLabel(2, 'spot')).toBe('2 spots')
  })

  it('accepts an irregular plural', () => {
    expect(countLabel(2, 'space', { plural: 'spaces' })).toBe('2 spaces')
  })

  it('uses the caller fallback when not provided', () => {
    expect(countLabel(0, 'spot', { fallback: 'not listed — confirm' })).toBe('not listed — confirm')
    expect(countLabel(null, 'spot')).toBe(NOT_PROVIDED)
  })
})

describe('bedBathLabel', () => {
  it('renders both when both are known', () => {
    expect(bedBathLabel({ beds: 2, baths: 1 })).toBe('2 bed · 1 bath')
  })

  it('never renders "0 bath" for a bathroom count the source did not give', () => {
    // The address form leaves baths optional. It used to be stored as 0 and
    // rendered here as a fact.
    expect(bedBathLabel({ beds: 2, baths: null })).toBe('2 bed · — bath')
    expect(bedBathLabel({ beds: 2, baths: 0 })).toBe('2 bed · — bath')
    expect(bedBathLabel({ beds: 2, baths: 0 })).not.toContain('0 bath')
  })
})
