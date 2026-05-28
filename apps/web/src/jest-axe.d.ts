/**
 * Ambient module declaration for jest-axe v10.
 * jest-axe v10 does not ship its own .d.ts files.
 *
 * This file must have NO top-level import/export statements so it is treated
 * as an ambient (global) declaration file. Uses inline `import()` type
 * expressions to reference axe-core types without a top-level import.
 */

declare module 'jest-axe' {
  // Re-use axe-core's AxeResults type without a top-level import
  type AxeResults = import('axe-core').AxeResults

  /** Runs axe-core on an HTML element and returns the full results object. */
  function axe(html: Element | null, options?: Record<string, unknown>): Promise<AxeResults>

  /** Creates a configured axe instance that carries persistent options. */
  function configureAxe(options?: Record<string, unknown>): typeof axe

  /**
   * Jest/Vitest expect extension map.
   * Pass to `expect.extend(toHaveNoViolations)` in test-setup.ts.
   */
  const toHaveNoViolations: {
    toHaveNoViolations(results: AxeResults): { pass: boolean; message: () => string }
  }
}
