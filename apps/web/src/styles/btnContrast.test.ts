/**
 * WCAG AA contrast regression test for the primary button.
 *
 * Known sitewide issue since PR8: .btn-primary shipped terracotta-at-rest
 * (white on #D97757 ≈ 3.1:1 — fails AA for normal text). Every design
 * prototype ships .btn-primary as ink background / bg text, with terracotta
 * only on hover. This test computes the actual ratio from the shipped CSS so
 * the deviation can't come back.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const TOKENS = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')
const GLOBAL = readFileSync(resolve(__dirname, 'global.css'), 'utf8')

/** Look up a CSS custom property's hex value in the light-theme tokens. */
function tokenHex(name: string): string {
  const m = TOKENS.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`token ${name} not found or not a plain hex`)
  return m[1]!
}

/** WCAG relative luminance of a #rrggbb hex. */
function luminance(hex: string): number {
  const chan = (i: number): number => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * chan(1) + 0.7152 * chan(3) + 0.0722 * chan(5)
}

/** WCAG contrast ratio between two hex colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Extract the background/color var names from the .btn-primary rest rule. */
function btnPrimaryVars(): { background: string; color: string } {
  const rule = GLOBAL.match(/\.btn-primary\s*\{([^}]*)\}/)
  if (!rule) throw new Error('.btn-primary rule not found in global.css')
  const bg = rule[1]!.match(/background:\s*var\((--[\w-]+)\)/)
  const fg = rule[1]!.match(/color:\s*var\((--[\w-]+)\)/)
  if (!bg || !fg) throw new Error('.btn-primary must use token vars for background and color')
  return { background: bg[1]!, color: fg[1]! }
}

describe('.btn-primary WCAG AA contrast', () => {
  it('rest-state text contrast is at least 4.5:1 (AA, normal text)', () => {
    const { background, color } = btnPrimaryVars()
    const ratio = contrast(tokenHex(background), tokenHex(color))
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('matches the design prototypes: ink at rest, not terracotta', () => {
    const { background } = btnPrimaryVars()
    // All 13 HTML prototypes ship `.btn-primary { background: var(--ink) }`;
    // terracotta belongs to hover and .btn-accent.
    expect(background).toBe('--ink')
  })
})
