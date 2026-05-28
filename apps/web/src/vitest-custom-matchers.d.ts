/**
 * Augments the @vitest/expect `Assertion` interface with custom matchers
 * added by jest-axe.
 *
 * Note: Vitest's `Assertion<T>` lives in `'@vitest/expect'`, not `'vitest'`.
 * Source: node_modules/vitest/dist/index.d.ts → `declare module '@vitest/expect'`
 *
 * The bare `export {}` makes this a module file, enabling declaration merge.
 */
export {}

declare module '@vitest/expect' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T> {
    /**
     * Passes when axe-core reports zero accessibility violations.
     * Extended in test-setup.ts via `expect.extend(toHaveNoViolations)`.
     */
    toHaveNoViolations(): void
  }

  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void
  }
}
