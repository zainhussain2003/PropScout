/**
 * Tests for classifyInput — the URL-or-address decision made before anything is sent.
 *
 * The risk this guards is a real address being told "that doesn't look like a
 * valid URL", which reads as the product being broken rather than the input
 * being wrong.
 */

import { describe, it, expect } from 'vitest'

import { classifyInput } from './classifyInput'

describe('classifyInput', () => {
  it('recognises listing links in the forms people actually paste', () => {
    for (const url of [
      'https://www.realtor.ca/real-estate/30021026/229-701-sheppard-avenue-w',
      'http://realtor.ca/x',
      'www.zillow.ca/homedetails/123',
      'realtor.ca/real-estate/1',
    ]) {
      expect(classifyInput(url).kind).toBe('url')
    }
  })

  it('recognises addresses, including with a unit prefix', () => {
    for (const address of [
      '701 Sheppard Ave W, Toronto',
      '229-701 Sheppard Ave W',
      '1 Yonge Street Toronto',
      '20 Bay St, Toronto, ON M5J 2W3',
    ]) {
      expect(classifyInput(address).kind).toBe('address')
    }
  })

  it('treats an empty field as empty, not as an error', () => {
    // Nothing has gone wrong yet; the button is simply not ready.
    expect(classifyInput('').kind).toBe('empty')
    expect(classifyInput('   ').kind).toBe('empty')
  })

  it('asks for a street number rather than geocoding a whole road', () => {
    // Without a number the geocoder returns a road centroid, and a report pinned
    // to the middle of a road is confidently wrong rather than usefully vague.
    const result = classifyInput('Sheppard Avenue West')
    expect(result.kind).toBe('unusable')
    expect(result.message).toMatch(/street number/i)
  })

  it('asks for more when the input is too short to act on', () => {
    const result = classifyInput('12 A')
    expect(result.kind).toBe('unusable')
    expect(result.message).toBeTruthy()
  })

  it('trims surrounding whitespace from pasted input', () => {
    expect(classifyInput('  701 Sheppard Ave W  ').value).toBe('701 Sheppard Ave W')
  })
})
