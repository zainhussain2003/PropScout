# PR7 Chrome UI Test — Prereqs

Date: 2026-05-30 15:40 EDT

## Dev Server

Status: READY
URL: http://localhost:5173

## TypeScript

Status: PASS — 0 errors (checked twice: before and after test trigger addition)

## Route checks

| Route               | HTTP status |
| ------------------- | ----------- |
| /account            | 200         |
| /auth/confirm       | 200         |
| /auth/reset         | 200         |
| /auth/verified      | 200         |
| /welcome-to-pro     | 200         |
| /checkout/cancelled | 200         |
| /nonsense-route-404 | 200         |

All 7 routes return 200. React Router handles the 404 UI client-side —
Vite serves `index.html` for all routes and the router renders NotFoundPage
for unmatched paths.

## Test triggers added (DEV only, not committed)

- [test] generic modal button — calls openUpgradeModal('generic')
- [test] sunscout modal button — calls openUpgradeModal('sunscout')
- [test] hard gate button — calls openHardGate()
  All three: fixed bottom-left corner, 10px font, 40% opacity,
  guarded by import.meta.env.DEV.
  They MUST NOT be committed — remove from `App.tsx` after Chrome testing.

## SunScout entry point

Grep result: NO MATCH — `sunscout` does not appear in
`apps/web/src/pages/InvestorReport.tsx`.

The `sunscout` UpgradeModal variant has no natural UI entry point in the current
build. To test TC-PR7-040–042 (generic variant), use the `[test] generic modal`
button. If a `sunscout` variant test is needed, temporarily change the
`onClick={() => openUpgradeModal('generic')}` argument to `'sunscout'` in
App.tsx — but do not commit that change either.

## MOCK_TIER

Current value in App.tsx: 'free'
(free tier shows all paywall gates — TruncatedVerdict on all 4 reports,
LockedButton on Save + PDF, HardLimitGate accessible via test trigger)
