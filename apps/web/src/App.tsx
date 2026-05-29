import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { InvestorReport } from './pages/InvestorReport'
import { TenantReport } from './pages/TenantReport'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/investor-report" element={<InvestorReport />} />
        <Route path="/tenant-report" element={<TenantReport />} />
        {/* Additional routes are added here as each page is built */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
