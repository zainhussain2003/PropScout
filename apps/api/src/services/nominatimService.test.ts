import { geocodeNominatim, selectNominatimMatch } from './nominatimService'

const input = '7 - 123 Imaginary Street, Exampleville, Ontario, M4S1Z1'
const match = {
  lat: '43.7001',
  lon: '-79.4001',
  display_name: '123 Imaginary Street, Exampleville, Canada',
  address: {
    house_number: '123',
    road: 'Imaginary Street',
    city: 'Exampleville',
    postcode: 'M4S 1Z1',
    country_code: 'ca',
  },
}

describe('free-beta address identity checks', () => {
  it('strips a unit and accepts the exact Canadian building', () => {
    expect(selectNominatimMatch(input, [match])).toMatchObject({
      lat: 43.7001,
      lng: -79.4001,
      postalCode: 'M4S1Z1',
      city: 'Exampleville',
    })
    expect(selectNominatimMatch(input.replace('7 -', 'S7 -'), [match])).not.toBeNull()
  })
  it.each([
    { house_number: '124' },
    { road: 'Other Street' },
    { city: 'Wrongville' },
    { postcode: 'M8V 1Z1' },
    { country_code: 'us' },
  ])('rejects a plausible-looking mismatch: %p', (change) => {
    expect(
      selectNominatimMatch(input, [{ ...match, address: { ...match.address, ...change } }])
    ).toBeNull()
  })
  it('rejects ambiguous results and missing geographic context', () => {
    expect(selectNominatimMatch(input, [match, match])).toBeNull()
    expect(selectNominatimMatch('123 Imaginary Street', [match])).toBeNull()
    expect(selectNominatimMatch('not an address', [match])).toBeNull()
  })
  it('rejects invalid coordinates', () => {
    expect(selectNominatimMatch(input, [{ ...match, lat: 'NaN' }])).toBeNull()
    expect(selectNominatimMatch(input, [{ ...match, lon: '181' }])).toBeNull()
  })
})

describe('identified and cached free geocoding', () => {
  const previousFetch = global.fetch
  afterEach(() => {
    global.fetch = previousFetch
    delete process.env.NOMINATIM_CONTACT_EMAIL
  })
  it('makes no request without an identifying contact', async () => {
    delete process.env.NOMINATIM_CONTACT_EMAIL
    const fetch = jest.fn()
    global.fetch = fetch
    expect(await geocodeNominatim(input)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('shares one request between concurrent repeated addresses', async () => {
    process.env.NOMINATIM_CONTACT_EMAIL = 'test@example.invalid'
    const fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [match] })
    global.fetch = fetch
    const results = await Promise.all([geocodeNominatim(input), geocodeNominatim(input)])
    expect(results.every((result) => result?.postalCode === 'M4S1Z1')).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toContain('https://nominatim.openstreetmap.org/search?')
    expect(fetch.mock.calls[0][1].headers['User-Agent']).toContain('test@example.invalid')
  })
})
