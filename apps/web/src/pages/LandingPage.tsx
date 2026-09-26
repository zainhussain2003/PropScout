/**
 * LandingPage — the root route `/`.
 *
 * Sections (in order):
 *   Nav → Hero (with ReportShowcase) → ReportsSection → CoverageSection
 *   → FounderNoteSection → LandingSunScoutSection → HowSection
 *   → PricingSection → FAQSection → CTASection → Footer
 *   + SignInModal (global overlay)
 *   + ModeModal (shown after URL submit)
 *
 * Each section lives in components/landing/ (J-04, D-093). This file only
 * composes them and owns the two overlays' state.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../components/shared/Nav'
import { Footer } from '../components/shared/Footer'
import { SignInModal } from '../components/shared/SignInModal'
import { ModeModal } from '../components/shared/ModeModal'
import type { ListingPreviewData } from '../components/shared/ModeModal'
import type { ReportMode } from '../types/analysis'
import { useTheme } from '../hooks/useTheme'
import { Hero } from '../components/landing/Hero'
import { ReportsSection } from '../components/landing/ReportsSection'
import { CoverageSection } from '../components/landing/CoverageSection'
import { FounderNoteSection } from '../components/landing/FounderNoteSection'
import { LandingSunScoutSection } from '../components/landing/LandingSunScoutSection'
import { HowSection } from '../components/landing/HowSection'
import { PricingSection } from '../components/landing/PricingSection'
import { FAQSection } from '../components/landing/FAQSection'
import { CTASection } from '../components/landing/CTASection'
import { useAppDesign } from '../hooks/useAppDesign'
import { HybridReportsSection } from '../components/hybrid/HybridReportsSection'

// ── LandingPage ───────────────────────────────────────────────────────

export function LandingPage(): JSX.Element {
  const design = useAppDesign()
  const navigate = useNavigate()
  const { dark, toggle: toggleDark } = useTheme()
  const [showSignIn, setShowSignIn] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingListing, setPendingListing] = useState<ListingPreviewData | null>(null)

  const handleOpenModal = (listing: ListingPreviewData): void => {
    setPendingListing(listing)
    setModalOpen(true)
  }

  const handleModeSelect = (mode: ReportMode): void => {
    setModalOpen(false)
    navigate(`/analyzing?token=demo&mode=${mode}`)
  }

  return (
    <>
      <Nav
        variant="landing"
        dark={dark}
        onToggleDark={toggleDark}
        onSignIn={() => setShowSignIn(true)}
      />

      <main>
        <Hero onOpenModal={handleOpenModal} onSignIn={() => setShowSignIn(true)} />
        {design === 'hybrid' ? <HybridReportsSection /> : <ReportsSection />}
        <CoverageSection />
        <FounderNoteSection />
        <LandingSunScoutSection />
        <HowSection />
        <PricingSection onSignIn={() => setShowSignIn(true)} />
        <FAQSection />
        <CTASection />
      </main>

      <Footer />

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />

      <ModeModal
        open={modalOpen}
        listing={pendingListing}
        onClose={() => setModalOpen(false)}
        onSelect={handleModeSelect}
      />
    </>
  )
}
