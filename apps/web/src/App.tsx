import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { useTier } from './hooks/useTier'
import { PaywallContext } from './components/paywall/PaywallContext'
import { UpgradeModal } from './components/paywall/UpgradeModal'
import { HardLimitGate } from './components/paywall/HardLimitGate'
import { LandingPage } from './pages/LandingPage'
import { AnalyzingPage } from './pages/analyzing'
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
import { ReportPage } from './pages/ReportPage'
import { PrintReportPage } from './pages/PrintReportPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { DemoNotice } from './components/shared/DemoNotice'
import { NotFoundPage } from './pages/NotFoundPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { DevToolbar } from './components/dev/DevToolbar'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { TierUnavailableNotice } from './components/paywall/TierUnavailableNotice'
import { useAuth } from './hooks/useAuth'
import { startCheckout } from './lib/services/billingService'
import { DesignProvider } from './components/hybrid/DesignProvider'
import { resolveAppDesign } from './lib/appDesign'
import './styles/hybrid.css'
import './styles/hybrid-surfaces.css'
import { RouteScroll } from './components/shared/RouteScroll'
import { HybridUtilityShell } from './components/hybrid/HybridUtilityShell'

function AppInner(): JSX.Element {
  const { tier, status: tierStatus, refresh: refreshTier } = useTier()
  const [upgradeModal, setUpgradeModal] = useState<string | null>(null)
  const [showHardGate, setShowHardGate] = useState(false)

  const openUpgradeModal = (feature: string): void => setUpgradeModal(feature)
  const closeUpgradeModal = (): void => setUpgradeModal(null)
  const openHardGate = (): void => setShowHardGate(true)
  const closeHardGate = (): void => setShowHardGate(false)

  // "Upgrade now" in the global modal: Stripe Checkout for Pro when signed
  // in (the API's 503 "paid plans are not open yet" shows as-is until price
  // IDs exist, D-076); the account's sign-in card when signed out. The
  // modals sit outside the router, so this is a location change, not a
  // navigate().
  const { session } = useAuth()
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [upgradeBusy, setUpgradeBusy] = useState(false)
  const handleUpgrade = (): void => {
    setUpgradeError(null)
    if (!session) {
      closeUpgradeModal()
      window.location.assign('/account')
      return
    }
    setUpgradeBusy(true)
    void startCheckout('pro', session.access_token)
      .catch((err: Error) => setUpgradeError(err.message))
      .finally(() => setUpgradeBusy(false))
  }

  return (
    <PaywallContext.Provider
      value={{ tier, tierStatus, refreshTier, openUpgradeModal, openHardGate }}
    >
      <BrowserRouter>
        <RouteScroll />
        <TierUnavailableNotice />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analyzing" element={<AnalyzingPage />} />
          <Route
            path="/investor-report"
            element={
              <DemoNotice>
                <InvestorReport tier={tier} />
              </DemoNotice>
            }
          />
          <Route
            path="/tenant-report"
            element={
              <DemoNotice>
                <TenantReport tier={tier} />
              </DemoNotice>
            }
          />
          <Route
            path="/personal-report"
            element={
              <DemoNotice>
                <PersonalBuyerPage tier={tier} />
              </DemoNotice>
            }
          />
          <Route
            path="/landlord-report"
            element={
              <DemoNotice>
                <LandlordPage tier={tier} />
              </DemoNotice>
            }
          />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/r/:token" element={<ReportPage tier={tier} />} />
          <Route path="/print-report" element={<PrintReportPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route element={<HybridUtilityShell />}>
            <Route path="/auth/confirm" element={<MagicLinkConfirmedPage />} />
            <Route path="/auth/reset" element={<PasswordResetRequestPage />} />
            <Route path="/auth/reset/confirm" element={<PasswordResetConfirmPage />} />
            <Route path="/auth/verified" element={<EmailVerifiedPage />} />
            <Route path="/welcome-to-pro" element={<StripeWelcomePage />} />
            <Route path="/checkout/cancelled" element={<StripeCancelledPage />} />
          </Route>
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          {/* Catch-all — must be last */}
          <Route element={<HybridUtilityShell />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* Global paywall modals — mounted outside the router so they overlay everything */}
      <UpgradeModal
        open={upgradeModal !== null}
        onClose={() => {
          setUpgradeError(null)
          closeUpgradeModal()
        }}
        feature={upgradeModal ?? 'generic'}
        onUpgrade={handleUpgrade}
        error={upgradeError}
        busy={upgradeBusy}
      />
      {/* Design-review mount only (DevToolbar opens it with placeholder
          figures). The live gate is rendered by the analyzing page with the
          API's real numbers (D-071) and must never come from here. */}
      {import.meta.env.DEV && showHardGate && (
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

function App(): JSX.Element {
  return (
    <DesignProvider design={resolveAppDesign(import.meta.env.VITE_APP_DESIGN)}>
      <ErrorBoundary>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ErrorBoundary>
    </DesignProvider>
  )
}

export default App
