/**
 * PaywallContext — provides tier, openUpgradeModal, and openHardGate
 * to any component inside the Provider without prop drilling.
 *
 * Mount <PaywallContext.Provider> once in App.tsx.
 * Consume with usePaywall() anywhere in the tree.
 */

import { createContext, useContext } from 'react'

export interface PaywallContextValue {
  /** Current user tier — "free" | "pro" | "professional" | "team". */
  tier: string
  /**
   * Whether `tier` is an answer or a placeholder. 'unavailable' means the API
   * could not confirm the plan; gates still act as free (the server enforces
   * the real entitlements) but the UI must not present that as fact (A-10).
   */
  tierStatus?: 'signed-out' | 'loading' | 'resolved' | 'unavailable'
  /** Ask the API for the plan again. */
  refreshTier?: () => void
  /** Open the UpgradeModal with a specific feature copy variant. */
  openUpgradeModal: (feature: string) => void
  /** Open the HardLimitGate full-screen overlay. */
  openHardGate: () => void
}

/** Default no-op values — reached only outside the Provider (never in production).
 *  Default tier is 'pro' so components render without paywall UI when no Provider
 *  is present (e.g., in unit tests that don't wrap with PaywallContext.Provider). */
export const PaywallContext = createContext<PaywallContextValue>({
  tier: 'pro',
  openUpgradeModal: () => undefined,
  openHardGate: () => undefined,
})

/** Hook to consume the paywall context from any component inside the Provider. */
export function usePaywall(): PaywallContextValue {
  return useContext(PaywallContext)
}
