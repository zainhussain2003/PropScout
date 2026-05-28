// Vitest setup — runs before each test file.
// Imports @testing-library/jest-dom to extend Vitest's expect with DOM matchers.
import '@testing-library/jest-dom'

// Extend expect with toHaveNoViolations from jest-axe.
// Type declarations for the jest-axe module live in src/jest-axe.d.ts.
import { toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

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
