// Vitest setup — runs before each test file.
// Imports @testing-library/jest-dom to extend Vitest's expect with DOM matchers.
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Extend expect with toHaveNoViolations from jest-axe.
// Type declarations for the jest-axe module live in src/jest-axe.d.ts.
import { toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

// ── RTL / Vitest fake-timer compatibility ─────────────────────────────────────
// @testing-library/react's asyncWrapper (inside waitFor) calls
// jestFakeTimersAreEnabled(), which first checks `typeof jest !== 'undefined'`.
// Vitest 2.x does NOT expose a global `jest` alias, so the check short-circuits
// and returns false — causing asyncWrapper to schedule a 0ms fake setTimeout
// that it never advances (no jest.advanceTimersByTime(0) call), making every
// waitFor hang indefinitely when vi.useFakeTimers() is active.
//
// Fix: expose vi as the `jest` global so RTL's detection works:
//   • jestFakeTimersAreEnabled() → true  (sinon sets setTimeout.clock)
//   • jest.advanceTimersByTime(0) → vi.advanceTimersByTime(0) → resolves the
//     pending 0ms drain timer inside asyncWrapper
// When real timers are active, setTimeout.clock is absent so the check still
// returns false and everything falls through to the normal real-timer path.
// @ts-expect-error – intentional jest→vi shim for RTL fake-timer support
globalThis.jest = vi

// ── Augment Vitest's Assertion interface ─────────────────────────────────────
// This file already has imports so it qualifies as a module file, which allows
// `declare module 'vitest'` to perform a proper declaration merge.

// The Assertion<T> interface lives in '@vitest/expect', not 'vitest'.
// See node_modules/vitest/dist/index.d.ts → `declare module '@vitest/expect' { interface Assertion<T> { ... } }`
declare module '@vitest/expect' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T> {
    /**
     * Passes when axe-core reports zero accessibility violations.
     * Registered via `expect.extend(toHaveNoViolations)` above.
     */
    toHaveNoViolations(): void
  }

  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}
