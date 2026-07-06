/**
 * MiniMap functionality tests — real Mapbox GL when a token + coordinates
 * exist, design-faithful SVG placeholder otherwise.
 *
 * mapboxGlService is mocked: jsdom has no WebGL, so these tests assert the
 * component's contract with the service (when it mounts a real map, what it
 * falls back to), not Mapbox's rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MiniMap } from './MiniMap'
import { getMapboxToken, mountMiniMap } from '../../lib/services/mapboxGlService'

vi.mock('../../lib/services/mapboxGlService', () => ({
  getMapboxToken: vi.fn(),
  mountMiniMap: vi.fn(),
}))

const mockGetToken = vi.mocked(getMapboxToken)
const mockMount = vi.mocked(mountMiniMap)

const CENTER = { lat: 43.6532, lng: -79.3832 }

describe('MiniMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMount.mockResolvedValue({ remove: vi.fn() })
  })

  it('renders the SVG placeholder when no coordinates are available', () => {
    mockGetToken.mockReturnValue('pk.test-token')
    render(<MiniMap address="55 Front St, Toronto" />)

    expect(screen.getByText(/Map placeholder/i)).toBeInTheDocument()
    expect(mockMount).not.toHaveBeenCalled()
  })

  it('renders the SVG placeholder when no Mapbox token is configured', () => {
    mockGetToken.mockReturnValue(null)
    render(<MiniMap address="55 Front St, Toronto" center={CENTER} />)

    expect(screen.getByText(/Map placeholder/i)).toBeInTheDocument()
    expect(mockMount).not.toHaveBeenCalled()
  })

  it('mounts a real Mapbox map when token + coordinates exist (no placeholder badge)', async () => {
    mockGetToken.mockReturnValue('pk.test-token')
    render(<MiniMap address="55 Front St, Toronto" center={CENTER} />)

    await waitFor(() => {
      expect(mockMount).toHaveBeenCalledTimes(1)
    })
    const [container, opts] = mockMount.mock.calls[0]!
    expect(container).toBeInstanceOf(HTMLElement)
    expect(opts.center).toEqual(CENTER)
    expect(opts.token).toBe('pk.test-token')
    expect(screen.queryByText(/Map placeholder/i)).not.toBeInTheDocument()
    // Address overlay stays on the real map
    expect(screen.getByText(/55 Front St, Toronto/i)).toBeInTheDocument()
  })

  it('falls back to the placeholder if the map fails to mount (never a blank hole)', async () => {
    mockGetToken.mockReturnValue('pk.test-token')
    mockMount.mockResolvedValue(null)
    render(<MiniMap address="55 Front St, Toronto" center={CENTER} />)

    expect(await screen.findByText(/Map placeholder/i)).toBeInTheDocument()
  })

  it('removes the map on unmount', async () => {
    const remove = vi.fn()
    mockGetToken.mockReturnValue('pk.test-token')
    mockMount.mockResolvedValue({ remove })
    const { unmount } = render(<MiniMap address="55 Front St, Toronto" center={CENTER} />)

    await waitFor(() => expect(mockMount).toHaveBeenCalled())
    unmount()
    await waitFor(() => expect(remove).toHaveBeenCalled())
  })
})
