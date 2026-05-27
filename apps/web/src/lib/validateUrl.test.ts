/**
 * Unit tests for validateUrl and detectListingKind.
 * No external dependencies — pure function tests.
 */

import { describe, it, expect } from 'vitest'
import { validateUrl, detectListingKind } from './validateUrl'

// ── validateUrl ─────────────────────────────────────────────────────

describe('validateUrl', () => {
  // ── empty / missing input ─────────────────────────────────────────
  it('returns error for empty string', () => {
    expect(validateUrl('')).toBe('Paste a listing URL to begin.')
  })

  it('returns error for whitespace-only input', () => {
    expect(validateUrl('   ')).toBe('Paste a listing URL to begin.')
  })

  // ── protocol check ────────────────────────────────────────────────
  it('returns error when no http/https scheme', () => {
    const result = validateUrl('www.realtor.ca/real-estate/123')
    expect(result).toBe("That doesn't look like a valid URL.")
  })

  it('accepts http:// as a valid scheme', () => {
    expect(validateUrl('http://www.realtor.ca/real-estate/123/address')).toBeNull()
  })

  it('accepts https:// as a valid scheme', () => {
    expect(validateUrl('https://www.realtor.ca/real-estate/123/address')).toBeNull()
  })

  // ── unsupported domain ───────────────────────────────────────────
  it('returns "not supported" for an unrecognised listing site', () => {
    const result = validateUrl('https://www.mls.ca/some-listing')
    expect(result).toContain("isn't supported yet")
  })

  it('returns "not supported" for a random URL', () => {
    const result = validateUrl('https://www.example.com/property/123')
    expect(result).toContain("isn't supported yet")
  })

  // ── US Zillow block ───────────────────────────────────────────────
  it('blocks zillow.com US links', () => {
    const result = validateUrl('https://www.zillow.com/homedetails/1234567')
    expect(result).toContain('Canadian properties only')
  })

  it('does NOT block zillow.ca links', () => {
    expect(validateUrl('https://www.zillow.ca/for-sale/12345')).toBeNull()
  })

  // ── valid Canadian listing URLs ───────────────────────────────────
  it('accepts a realtor.ca for-sale URL', () => {
    expect(
      validateUrl('https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton')
    ).toBeNull()
  })

  it('accepts a realtor.ca rental URL', () => {
    expect(
      validateUrl('https://www.realtor.ca/real-estate/27905412/unit-3705-28-charles-st-e-toronto')
    ).toBeNull()
  })

  it('accepts a zillow.ca URL', () => {
    expect(validateUrl('https://www.zillow.ca/for-rent/12345')).toBeNull()
  })

  // ── case-insensitive ─────────────────────────────────────────────
  it('is case-insensitive for the domain', () => {
    expect(validateUrl('HTTPS://WWW.REALTOR.CA/REAL-ESTATE/12345/SOME-ADDRESS')).toBeNull()
  })

  // ── leading/trailing whitespace ──────────────────────────────────
  it('trims leading and trailing whitespace before validating', () => {
    expect(validateUrl('  https://www.realtor.ca/real-estate/12345/test  ')).toBeNull()
  })
})

// ── detectListingKind ────────────────────────────────────────────────

describe('detectListingKind', () => {
  it('returns "sale" for a plain realtor.ca URL', () => {
    expect(
      detectListingKind('https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton')
    ).toBe('sale')
  })

  it('returns "rent" for a URL with /for-rent/', () => {
    expect(detectListingKind('https://www.zillow.ca/for-rent/12345')).toBe('rent')
  })

  it('returns "rent" for a URL with /rental/', () => {
    expect(detectListingKind('https://www.realtor.ca/rental/5702-buttermill-ave')).toBe('rent')
  })

  it('returns "rent" for a URL with /apartments-for-rent/', () => {
    expect(detectListingKind('https://www.zillow.ca/apartments-for-rent/toronto')).toBe('rent')
  })

  it('defaults to "sale" for an unrecognised URL pattern', () => {
    expect(detectListingKind('https://www.realtor.ca/real-estate/12345')).toBe('sale')
  })

  it('is case-insensitive', () => {
    expect(detectListingKind('https://www.zillow.ca/FOR-RENT/12345')).toBe('rent')
  })
})
