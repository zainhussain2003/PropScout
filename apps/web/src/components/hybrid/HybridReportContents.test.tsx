import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DesignProvider } from './DesignProvider'
import { HybridReportContents } from './HybridReportContents'
import { SectionHead } from '../shared/SectionHead'

afterEach(cleanup)

it('navigates to actual rendered evidence, including empty sections, and moves keyboard focus', async () => {
  const { container } = render(
    <DesignProvider design="hybrid">
      <main data-report-document>
        <HybridReportContents />
        <section data-section="01">
          <SectionHead n="01" topic="Rent" question="Is the rent fair?" />
        </section>
        <section data-section="02">
          <SectionHead n="02" topic="Schools" question="What schools are nearby?" />
          <p>No schools available.</p>
        </section>
      </main>
    </DesignProvider>
  )
  const nav = screen.getByRole('navigation', { name: 'Explore report sections' })
  const details = nav.querySelector('details')!
  details.open = true
  expect(within(nav).getAllByRole('button')).toHaveLength(2)
  const section = container.querySelector<HTMLElement>('[data-section="02"]')!
  section.scrollIntoView = vi.fn()
  fireEvent.click(within(nav).getByRole('button', { name: '02 Schools' }))
  expect(section.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' })
  expect(section.querySelector('h2')).toHaveFocus()
  expect(screen.getByText('No schools available.')).toBeVisible()
  section.remove()
  await waitFor(() => expect(within(nav).getAllByRole('button')).toHaveLength(1))
})

it('keeps the legacy document free of hybrid navigation', () => {
  render(
    <DesignProvider design="legacy">
      <HybridReportContents />
    </DesignProvider>
  )
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
})

it('discovers unmarked personal and landlord sections, including repeated section numbers', () => {
  const { container } = render(
    <DesignProvider design="hybrid">
      <main data-report-document>
        <HybridReportContents />
        <section>
          <SectionHead n="01" topic="Rent positioning" question="Is the rent fair?" />
        </section>
        <section>
          <SectionHead n="01" topic="Investment metrics" question="Does it work?" />
        </section>
        <section>
          <SectionHead n="03" topic="Comparable sales" question="What sold?" />
        </section>
      </main>
    </DesignProvider>
  )
  const nav = screen.getByRole('navigation')
  nav.querySelector('details')!.open = true
  expect(within(nav).getAllByRole('button')).toHaveLength(3)
  for (const [index, label] of [
    '01 Rent positioning',
    '01 Investment metrics',
    '03 Comparable sales',
  ].entries()) {
    const section = container.querySelectorAll('section')[index]!
    section.scrollIntoView = vi.fn()
    fireEvent.click(within(nav).getByRole('button', { name: label, exact: true }))
    expect(section.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' })
    expect(section.querySelector('h2')).toHaveFocus()
  }
})

it('does not include unrelated sections outside the current report', () => {
  render(
    <DesignProvider design="hybrid">
      <section data-section="99">
        <SectionHead n="99" topic="Elsewhere" question="Unrelated" />
      </section>
      <main data-report-document>
        <HybridReportContents />
        <section data-section="01">
          <SectionHead n="01" topic="Facts" question="What is known?" />
        </section>
      </main>
    </DesignProvider>
  )
  const nav = screen.getByRole('navigation')
  expect(nav).toHaveTextContent('1 sections')
  expect(nav).not.toHaveTextContent('Elsewhere')
})
