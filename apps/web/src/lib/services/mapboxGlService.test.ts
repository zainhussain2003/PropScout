import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMapboxToken, mountMiniMap } from './mapboxGlService'
import { HeroStaticMap } from '../../components/landing/HeroStaticMap'

afterEach(() => vi.unstubAllEnvs())

describe('free beta Mapbox boundary', () => {
  it('ignores an existing public token when free-only mode is enabled', () => {
    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.synthetic-test-token')
    vi.stubEnv('VITE_FREE_ONLY_BETA', 'true')
    expect(getMapboxToken()).toBeNull()
    expect(HeroStaticMap()).toBeNull()
  })

  it('does not load or mount a map even with a caller-supplied token', async () => {
    vi.stubEnv('VITE_FREE_ONLY_BETA', 'true')
    expect(
      await mountMiniMap(document.createElement('div'), {
        token: 'pk.synthetic-test-token',
        center: { lat: 43, lng: -79 },
      })
    ).toBeNull()
  })

  it('preserves configured tokens outside free-only mode', () => {
    vi.stubEnv('VITE_FREE_ONLY_BETA', 'false')
    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.synthetic-test-token')
    expect(getMapboxToken()).toBe('pk.synthetic-test-token')
  })
})
