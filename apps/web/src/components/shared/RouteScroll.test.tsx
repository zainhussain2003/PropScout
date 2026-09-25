import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { RouteScroll } from './RouteScroll'
import { HASH_SCROLL_SETTLE_MS } from '../../constants/navigation'

function Navigation(): JSX.Element {
  const navigate = useNavigate()
  return (
    <>
      <RouteScroll />
      <button onClick={() => navigate('/tenant-report')}>Sample</button>
      <button onClick={() => navigate('/?view=saved')}>Query</button>
      <button onClick={() => navigate('/#pricing')}>Pricing</button>
      <button onClick={() => navigate('/r/example#late')}>Delayed section</button>
      <button onClick={() => navigate('/#%ZZ')}>Malformed anchor</button>
      <section id="pricing">Plans</section>
    </>
  )
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('starts a sample route at the top after leaving a scrolled document', () => {
  render(
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>
  )
  vi.mocked(window.scrollTo).mockClear()
  fireEvent.click(screen.getByText('Sample'))
  expect(window.scrollTo).toHaveBeenCalledTimes(1)
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'instant' })
})

it('does not reset scroll for account query-only changes', () => {
  render(
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>
  )
  vi.mocked(window.scrollTo).mockClear()
  fireEvent.click(screen.getByText('Query'))
  expect(window.scrollTo).not.toHaveBeenCalled()
})

it('scrolls to the anchor instead of resetting to the top', () => {
  render(
    <MemoryRouter initialEntries={['/tenant-report']}>
      <Navigation />
    </MemoryRouter>
  )
  vi.mocked(window.scrollTo).mockClear()
  fireEvent.click(screen.getByText('Pricing'))
  expect(document.getElementById('pricing')?.scrollIntoView).toHaveBeenCalledWith({
    block: 'start',
    behavior: 'instant',
  })
  expect(window.scrollTo).not.toHaveBeenCalled()
})

it('waits for an asynchronously rendered report anchor without repeating a stable jump', async () => {
  const { container } = render(
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByText('Delayed section'))
  const section = document.createElement('section')
  section.id = 'late'
  container.append(section)
  await waitFor(() => expect(section.scrollIntoView).toHaveBeenCalledTimes(1))
  container.append(document.createElement('div'))
  await Promise.resolve()
  expect(section.scrollIntoView).toHaveBeenCalledTimes(1)
})

it('corrects a fresh hash destination after late layout shifts, then expires', () => {
  vi.useFakeTimers()
  const { unmount } = render(
    <MemoryRouter initialEntries={['/#pricing']}>
      <Navigation />
    </MemoryRouter>
  )
  const target = document.getElementById('pricing')!
  const rect = vi.spyOn(target, 'getBoundingClientRect')
  vi.mocked(target.scrollIntoView).mockClear()
  rect.mockReturnValue({ top: 1383 } as DOMRect)
  vi.advanceTimersByTime(1200)
  expect(target.scrollIntoView).toHaveBeenCalledTimes(1)
  rect.mockReturnValue({ top: 1500 } as DOMRect)
  vi.advanceTimersByTime(100)
  expect(target.scrollIntoView).toHaveBeenCalledTimes(2)
  vi.advanceTimersByTime(HASH_SCROLL_SETTLE_MS)
  rect.mockReturnValue({ top: 1800 } as DOMRect)
  vi.advanceTimersByTime(100)
  expect(target.scrollIntoView).toHaveBeenCalledTimes(2)
  unmount()
  vi.useRealTimers()
})

it.each(['wheel', 'touchstart', 'pointerdown', 'keydown'])(
  'stops correcting the anchor on %s so the user can leave it',
  (type) => {
    vi.useFakeTimers()
    const { unmount } = render(
      <MemoryRouter initialEntries={['/#pricing']}>
        <Navigation />
      </MemoryRouter>
    )
    const target = document.getElementById('pricing')!
    vi.mocked(target.scrollIntoView).mockClear()
    const input = new Event(type, { cancelable: true })
    window.dispatchEvent(input)
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 1383 } as DOMRect)
    vi.advanceTimersByTime(1200)
    expect(target.scrollIntoView).not.toHaveBeenCalled()
    expect(input.defaultPrevented).toBe(false)
    unmount()
    vi.useRealTimers()
  }
)

it('cancels pending anchor corrections when navigating away or unmounting', () => {
  vi.useFakeTimers()
  const { unmount } = render(
    <MemoryRouter initialEntries={['/#pricing']}>
      <Navigation />
    </MemoryRouter>
  )
  const target = document.getElementById('pricing')!
  vi.mocked(target.scrollIntoView).mockClear()
  fireEvent.click(screen.getByText('Sample'))
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: 1383 } as DOMRect)
  vi.advanceTimersByTime(1200)
  expect(target.scrollIntoView).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Pricing'))
  unmount()
  expect(vi.getTimerCount()).toBe(0)
  vi.useRealTimers()
})

it('does not mistake scrolling the viewport for movement of the destination', () => {
  vi.useFakeTimers()
  const { unmount } = render(
    <MemoryRouter initialEntries={['/#pricing']}>
      <Navigation />
    </MemoryRouter>
  )
  const target = document.getElementById('pricing')!
  vi.mocked(target.scrollIntoView).mockClear()
  vi.stubGlobal('scrollY', 100)
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top: -100 } as DOMRect)
  vi.advanceTimersByTime(100)
  expect(target.scrollIntoView).not.toHaveBeenCalled()
  unmount()
})

it('abandons a missing anchor when the user interacts before the report arrives', async () => {
  const { container } = render(
    <MemoryRouter initialEntries={['/r/example#late']}>
      <Navigation />
    </MemoryRouter>
  )
  fireEvent.wheel(window)
  const section = document.createElement('section')
  section.id = 'late'
  container.append(section)
  await Promise.resolve()
  expect(section.scrollIntoView).not.toHaveBeenCalled()
})

it('ignores malformed percent-encoded anchors without breaking navigation', () => {
  render(
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByText('Malformed anchor'))
  fireEvent.click(screen.getByText('Sample'))
  expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'instant' })
})
