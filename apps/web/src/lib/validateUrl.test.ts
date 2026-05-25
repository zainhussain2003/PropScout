// validateUrl.test.ts — Unit tests for URL validation and listing-type detection.
//
// Covers:
//   - Empty / non-URL inputs → error
//   - Non-supported domains → error
//   - Zillow.com (US) → specific error
//   - Realtor.ca for-sale → valid, source=realtor-ca, kind=sale
//   - Realtor.ca for-rent → valid, source=realtor-ca, kind=rent
//   - Zillow.ca → valid, source=zillow-ca, kind=sale (conservative default)
//   - detectListingKind helper

import { describe, it, expect } from 'vitest'
import { validateUrl, detectListingKind } from './validateUrl'

describe('validateUrl', () => {
  // ── Invalid inputs ──────────────────────────────────────────────

  it('returns an error for empty string', () => {
    const result = validateUrl('')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.message).toMatch(/paste a listing url/i)
    }
  })

  it('returns an error for whitespace-only string', () => {
    const result = validateUrl('   ')
    expect(result.valid).toBe(false)
  })

  it('returns an error when input is not a URL', () => {
    const result = validateUrl('not a url at all')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.message).toMatch(/valid url/i)
    }
  })

  it('returns an error for an unsupported domain', () => {
    const result = validateUrl('https://www.mls.ca/listing/12345')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.message).toMatch(/supported yet/i)
    }
  })

  it('returns a US-listing error for zillow.com', () => {
    const result = validateUrl('https://www.zillow.com/homes/for_sale/12345')
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.message).toMatch(/us listing/i)
    }
  })

  // ── Realtor.ca for-sale ─────────────────────────────────────────

  it('accepts a Realtor.ca for-sale URL', () => {
    const url = 'https://www.realtor.ca/real-estate/29795861/5312-950-portage-parkway-vaughan'
    const result = validateUrl(url)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.source).toBe('realtor-ca')
      expect(result.kind).toBe('sale')
      expect(result.normalised).toBe(url)
    }
  })

  it('accepts a Realtor.ca URL without www prefix', () => {
    const url = 'https://realtor.ca/real-estate/12345/some-property'
    const result = validateUrl(url)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.source).toBe('realtor-ca')
    }
  })

  // ── Realtor.ca for-rent ─────────────────────────────────────────

  it('detects a Realtor.ca for-rent URL', () => {
    const url =
      'https://www.realtor.ca/real-estate/27905412/unit-3705-28-charles-st-e-toronto-for-rent'
    const result = validateUrl(url)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.kind).toBe('rent')
    }
  })

  it('defaults Realtor.ca kind to sale when "for-rent" is absent', () => {
    const url = 'https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton'
    const result = validateUrl(url)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.kind).toBe('sale')
    }
  })

  // ── Zillow.ca ───────────────────────────────────────────────────

  it('accepts a Zillow.ca URL', () => {
    const url = 'https://www.zillow.ca/homedetails/123-main-st-toronto/456_zpid/'
    const result = validateUrl(url)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.source).toBe('zillow-ca')
      expect(result.kind).toBe('sale') // conservative default
    }
  })

  // ── Normalisation ───────────────────────────────────────────────

  it('trims leading/trailing whitespace before validating', () => {
    const url = '  https://www.realtor.ca/real-estate/12345/some-property  '
    const result = validateUrl(url)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.normalised).toBe(url.trim())
    }
  })
})

// ── detectListingKind ─────────────────────────────────────────────

describe('detectListingKind', () => {
  it('returns sale for a Realtor.ca for-sale URL', () => {
    expect(detectListingKind('https://www.realtor.ca/real-estate/12345/some-property')).toBe('sale')
  })

  it('returns rent for a Realtor.ca for-rent URL', () => {
    expect(
      detectListingKind('https://www.realtor.ca/real-estate/12345/some-property-for-rent')
    ).toBe('rent')
  })

  it('returns sale for a Zillow.ca URL', () => {
    expect(detectListingKind('https://www.zillow.ca/homedetails/123/')).toBe('sale')
  })

  it('returns null for an unrecognised URL', () => {
    expect(detectListingKind('https://www.kijiji.ca/listing/12345')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(detectListingKind('')).toBeNull()
  })
})
