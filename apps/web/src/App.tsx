import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Pages — import as you build them
// import { LandingPage } from './pages'

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes are added here as each page is built */}
        <Route path="/" element={<div>PropScout — coming soon</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
