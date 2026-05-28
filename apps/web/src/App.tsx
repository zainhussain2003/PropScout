import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { InvestorReport } from './pages/InvestorReport'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/investor-report" element={<InvestorReport />} />
        {/* Additional routes are added here as each page is built */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
