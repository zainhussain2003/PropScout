import { cleanup, render, screen } from '@testing-library/react'
import { DesignProvider } from './DesignProvider'
import { PropertyHero } from '../analysis/PropertyHero'
import { VAUGHAN_LISTING, VAUGHAN_DEAL_SCORE } from '../../constants/demoData'
import { toDealScoreData } from '../../lib/investorCalc'
import type { AppDesign } from '../../types/design'

afterEach(cleanup)

function hero(design: AppDesign): JSX.Element {
  return (
    <DesignProvider design={design}>
      <PropertyHero
        listing={VAUGHAN_LISTING}
        score={toDealScoreData(VAUGHAN_DEAL_SCORE)}
        cashFlowMonthly={-1800}
        capRate={0.025}
        dscr={0.5}
      />
    </DesignProvider>
  )
}

it('changes presentation without changing property facts or the calculated verdict', () => {
  const { container, rerender } = render(hero('legacy'))
  const address = screen.getByRole('heading', { level: 1 }).textContent
  const verdict = container.querySelector('.scorecard')?.textContent
  expect(container.firstElementChild).toHaveClass('container', { exact: true })
  expect(container.querySelector('.hy-property-grid')).toBeNull()
  expect(screen.queryByRole('navigation', { name: 'Explore report sections' })).toBeNull()

  rerender(hero('hybrid'))
  expect(container.querySelector('.hy-property-grid')).not.toBeNull()
  expect(screen.getByRole('navigation', { name: 'Explore report sections' })).toBeVisible()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(address)
  expect(container.querySelector('.scorecard')?.textContent).toBe(verdict)

  rerender(hero('legacy'))
  expect(container.firstElementChild).toHaveClass('container', { exact: true })
  expect(container.querySelector('.hy-property-grid')).toBeNull()
  expect(container.querySelector('.scorecard')?.textContent).toBe(verdict)
})
