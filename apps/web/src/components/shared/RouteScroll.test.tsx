import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { RouteScroll } from './RouteScroll'

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
  vi.restoreAllMocks()
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

it('waits for an asynchronously rendered report anchor and disconnects after finding it', async () => {
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
