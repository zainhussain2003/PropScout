import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HybridUtilityShell } from './HybridUtilityShell'
import { DesignProvider } from './DesignProvider'
import { EmailVerifiedPage } from '../../pages/EmailVerifiedPage'
import type { AppDesign } from '../../types/design'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function mount(design: AppDesign): void {
  render(
    <DesignProvider design={design}>
      <MemoryRouter initialEntries={['/auth/verified']}>
        <Routes>
          <Route element={<HybridUtilityShell />}>
            <Route path="/auth/verified" element={<EmailVerifiedPage />} />
          </Route>
          <Route path="/" element={<h1>Home</h1>} />
        </Routes>
      </MemoryRouter>
    </DesignProvider>
  )
}

it('adds theme and recovery navigation without replacing the confirmed action', () => {
  mount('hybrid')
  expect(screen.getByText('Your email is verified.')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Toggle dark mode' }))
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  fireEvent.click(screen.getByRole('button', { name: /Analyze a listing/ }))
  expect(screen.getByRole('heading', { name: 'Home' })).toBeVisible()
})

it('retains the original unframed recovery page in rollback', () => {
  mount('legacy')
  expect(screen.getByText('Your email is verified.')).toBeVisible()
  expect(screen.queryByRole('banner')).not.toBeInTheDocument()
})
