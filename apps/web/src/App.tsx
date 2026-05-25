import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Additional routes are added here as each page is built (PR 4–8) */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
