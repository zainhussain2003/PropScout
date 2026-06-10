import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PaywallContext } from './components/paywall/PaywallContext'
import { UpgradeModal } from './components/paywall/UpgradeModal'
import { HardLimitGate } from './components/paywall/HardLimitGate'
import { LandingPage } from './pages/LandingPage'
import { AnalyzingPage } from './pages/AnalyzingPage'
import { InvestorReport } from './pages/InvestorReport'
import { TenantReport } from './pages/TenantReport'
import { PersonalBuyerPage } from './pages/PersonalBuyerPage'
import { LandlordPage } from './pages/LandlordPage'
import { AccountPage } from './pages/AccountPage'
import { MagicLinkConfirmedPage } from './pages/MagicLinkConfirmedPage'
import { PasswordResetRequestPage } from './pages/PasswordResetRequestPage'
import { PasswordResetConfirmPage } from './pages/PasswordResetConfirmPage'
import { EmailVerifiedPage } from './pages/EmailVerifiedPage'
import { StripeWelcomePage } from './pages/StripeWelcomePage'
import { StripeCancelledPage } from './pages/StripeCancelledPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { DevToolbar } from './components/dev/DevToolbar'

/** Simulated tier for local development — swap to "pro" to preview Pro UI. */
const MOCK_TIER = 'free'

function App(): JSX.Element {
  const [upgradeModal, setUpgradeModal] = useState<string | null>(null)
  const [showHardGate, setShowHardGate] = useState(false)

  const openUpgradeModal = (feature: string): void => setUpgradeModal(feature)
  const closeUpgradeModal = (): void => setUpgradeModal(null)
  const openHardGate = (): void => setShowHardGate(true)
  const closeHardGate = (): void => setShowHardGate(false)

  return (
    <PaywallContext.Provider value={{ tier: MOCK_TIER, openUpgradeModal, openHardGate }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analyzing" element={<AnalyzingPage />} />
          <Route path="/investor-report" element={<InvestorReport tier={MOCK_TIER} />} />
          <Route path="/tenant-report" element={<TenantReport tier={MOCK_TIER} />} />
          <Route path="/personal-report" element={<PersonalBuyerPage tier={MOCK_TIER} />} />
          <Route path="/landlord-report" element={<LandlordPage tier={MOCK_TIER} />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/auth/confirm" element={<MagicLinkConfirmedPage />} />
          <Route path="/auth/reset" element={<PasswordResetRequestPage />} />
          <Route path="/auth/reset/confirm" element={<PasswordResetConfirmPage />} />
          <Route path="/auth/verified" element={<EmailVerifiedPage />} />
          <Route path="/welcome-to-pro" element={<StripeWelcomePage />} />
          <Route path="/checkout/cancelled" element={<StripeCancelledPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          {/* Catch-all — must be last */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>

      {/* Global paywall modals — mounted outside the router so they overlay everything */}
      <UpgradeModal
        open={upgradeModal !== null}
        onClose={closeUpgradeModal}
        feature={upgradeModal ?? 'generic'}
      />
      {showHardGate && (
        <HardLimitGate onClose={closeHardGate} monthlyLimit={10} used={10} resetsIn="32 days" />
      )}

      <DevToolbar
        slots={[
          {
            label: 'UpgradeModal: generic',
            onClick: () => openUpgradeModal('generic'),
            color: 'orange',
          },
          {
            label: 'UpgradeModal: sunscout',
            onClick: () => openUpgradeModal('sunscout'),
            color: 'orange',
          },
          { label: 'UpgradeModal: pdf', onClick: () => openUpgradeModal('pdf'), color: 'orange' },
          {
            label: 'UpgradeModal: portfolio',
            onClick: () => openUpgradeModal('portfolio'),
            color: 'orange',
          },
          {
            label: 'UpgradeModal: verdict',
            onClick: () => openUpgradeModal('verdict'),
            color: 'orange',
          },
          { label: 'HardLimitGate', onClick: () => openHardGate(), color: 'red' },
        ]}
      />
    </PaywallContext.Provider>
  )
}

export default App
