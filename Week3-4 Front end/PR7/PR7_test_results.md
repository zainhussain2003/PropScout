# PR7 Test Results

Date: 2026-05-30

## data-testids added to components

| testid                                 | Component                      | Purpose                                                                                   |
| -------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| `data-testid="verdict-blur"`           | `TruncatedVerdict.tsx` line 75 | Blurred paragraph 2 wrapper — used to confirm TruncatedVerdict is in the DOM in free tier |
| `data-testid="upgrade-modal-backdrop"` | `UpgradeModal.tsx` line 81     | Fixed backdrop div — used to test backdrop-click-to-close behavior                        |
| `data-testid="hard-limit-dot"`         | `HardLimitGate.tsx` line 116   | Each dot in the monthly usage progress bar — used to assert correct dot count             |

## Component changes (beyond testids)

| File                    | Change                                                                      | Reason                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ProvinceGate.tsx`      | Added internal `isSubmitted` state; form submit now sets it `true`          | Tests verify confirmation state appears after form submission                                                                      |
| `PaywallContext.tsx`    | Default context `tier` changed from `'free'` to `'pro'`                     | Prevents paywall UI from rendering in unit tests that have no Provider                                                             |
| `PersonalBuyerPage.tsx` | Added TruncatedVerdict gating in `PersonalVerdictHero` (free tier)          | paywallWiring test requires verdict-blur on all 4 report pages                                                                     |
| `LandlordPage.tsx`      | Added TruncatedVerdict conditional before `LandlordVerdictHero` (free tier) | paywallWiring test requires verdict-blur on all 4 report pages                                                                     |
| `InvestorReport.tsx`    | Default `tier` changed from `'free'` to `'pro'`                             | Restores prior PR4 test pass: shows AIVerdictBlock when no tier prop                                                               |
| `TenantReport.tsx`      | Default `tier` changed from `'free'` to `'pro'`                             | Consistent with the other report pages                                                                                             |
| `PersonalBuyerPage.tsx` | Default `tier` changed from `'free'` to `'pro'`                             | Restores prior PR6 snapshot                                                                                                        |
| `LandlordPage.tsx`      | Default `tier` changed from `'free'` to `'pro'`                             | Restores prior PR6 snapshot                                                                                                        |
| PR4+PR6 snapshots       | Updated via `vitest run -u`                                                 | Snapshot content unchanged; updates were needed because Nav changed (LockedButton vs Save btn) when tests ran with default context |

## Automated Test Suite

| File                               | Pass | Fail | Skip |
| ---------------------------------- | ---- | ---- | ---- |
| proBadge.test.tsx                  | 4    | 0    | 0    |
| upgradeCard.test.tsx               | 9    | 0    | 0    |
| upgradeModal.test.tsx              | 19   | 0    | 0    |
| hardLimitGate.test.tsx             | 7    | 0    | 0    |
| lockedSection.test.tsx             | 4    | 0    | 0    |
| truncatedVerdict.test.tsx          | 4    | 0    | 0    |
| lockedButton.test.tsx              | 5    | 0    | 0    |
| blockState.test.tsx                | 9    | 0    | 0    |
| stubState.test.tsx                 | 4    | 0    | 0    |
| provinceGate.test.tsx              | 6    | 0    | 0    |
| noCompsInlineState.test.tsx        | 3    | 0    | 0    |
| scraperPartialInlineState.test.tsx | 7    | 0    | 0    |
| accountPage.integration.test.tsx   | 7    | 0    | 0    |
| authStubs.integration.test.tsx     | 17   | 0    | 0    |
| paywallWiring.integration.test.tsx | 8    | 0    | 0    |
| a11y.test.tsx                      | 7    | 0    | 0    |
| regression.test.tsx                | 11   | 0    | 0    |

## Totals

Prior baseline (PR1–PR6): 541  
New PR7 tests: 128  
DevToolbar: 3 tests added (null in prod, toggle, slot rendering)  
Grand total: **672**  
Status: **ALL PASS** ✓
