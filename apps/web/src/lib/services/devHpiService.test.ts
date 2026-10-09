import { afterEach, expect, test, vi } from 'vitest'
import { devHpiEnabled, hpiOptions, readDevHpi } from './devHpiService'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test('selection filters market and housing type with newest months first', () => {
  const choices = [
    { market: 'Synthetic Harbour', housing_type: 'Apartment', month: '2030-01' },
    { market: 'Synthetic Harbour', housing_type: 'Apartment', month: '2030-02' },
    { market: 'Synthetic Harbour', housing_type: 'Townhouse', month: '2029-01' },
    { market: 'Synthetic Other', housing_type: 'Composite', month: '2030-03' },
  ]
  expect(hpiOptions(choices, 'Synthetic Harbour', 'Apartment')).toEqual({
    markets: ['Synthetic Harbour', 'Synthetic Other'],
    housingTypes: ['Apartment', 'Townhouse'],
    months: ['2030-02', '2030-01'],
  })
  expect(hpiOptions(choices, 'Missing', '').months).toEqual([])
})

test('production cannot enable the local benchmark feature', async () => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_DEV_HPI_BENCHMARKS', 'true')
  expect(devHpiEnabled()).toBe(false)
  await expect(readDevHpi()).rejects.toThrow('disabled')
})

test('development requires explicit opt-in and a local API', async () => {
  vi.stubEnv('DEV', true)
  vi.stubEnv('VITE_DEV_HPI_BENCHMARKS', '')
  expect(devHpiEnabled()).toBe(false)
  vi.stubEnv('VITE_DEV_HPI_BENCHMARKS', 'true')
  vi.stubEnv('VITE_API_URL', 'https://shared-preview.example')
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  await expect(readDevHpi()).rejects.toThrow('localhost')
  expect(fetch).not.toHaveBeenCalled()
})

test('local request sends exact selection, disables cache and handles unavailable database', async () => {
  vi.stubEnv('DEV', true)
  vi.stubEnv('VITE_DEV_HPI_BENCHMARKS', 'true')
  vi.stubEnv('VITE_API_URL', 'http://localhost:4311')
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ choices: [], benchmark: null }) })
  vi.stubGlobal('fetch', fetch)
  await readDevHpi({ market: 'Synthetic Harbour', housing_type: 'Townhouse', month: '2030-01' })
  const [url, options] = fetch.mock.calls[0] as [URL, RequestInit]
  expect(url.searchParams.get('market')).toBe('Synthetic Harbour')
  expect(url.searchParams.get('housingType')).toBe('Townhouse')
  expect(options.cache).toBe('no-store')
  fetch.mockResolvedValue({ ok: false })
  await expect(readDevHpi()).rejects.toThrow('database unavailable')
})
