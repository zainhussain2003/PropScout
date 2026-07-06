/**
 * WCAG AA contrast regression tests for the accent system.
 *
 * History:
 * - PR8 shipped .btn-primary terracotta-at-rest (white on #D97757 ≈ 3.12:1 —
 *   fails AA). Fixed to ink-at-rest (a1ca335); pinned below.
 * - PR10 replaced the terracotta accent with harbour blue #1F4E68 (8.94:1 on
 *   white — AA and AAA) and added a dark-mode accent #6FA3C4 (6.39:1 on the
 *   dark surface) with a flipped --accent-ink (#0A0D14 on the light blue,
 *   7.14:1 — white would be 2.72:1). These gates pin every accent pairing so
 *   a future value change can't silently regress below AA.
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

/** Look up a CSS custom property's hex value inside the [data-theme='dark'] block. */
function darkTokenHex(name: string): string {
  const block = TOKENS.match(/\[data-theme='dark'\]\s*\{([\s\S]*?)\}/)
  if (!block) throw new Error('dark theme block not found')
  const m = block[1]!.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`dark token ${name} not found or not a plain hex`)
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

  it('matches the design prototypes: ink at rest, accent only on hover', () => {
    const { background } = btnPrimaryVars()
    // All 13 HTML prototypes ship `.btn-primary { background: var(--ink) }`;
    // the accent belongs to hover and .btn-accent.
    expect(background).toBe('--ink')
  })
})

describe('PR10 accent system WCAG AA gates (measured ratios in comments)', () => {
  it('light accent on --accent-ink (btn-accent, Pro badge, hover fills) ≥ 4.5:1', () => {
    // #FFFFFF on #1F4E68 — measured 8.94:1 (AAA)
    expect(contrast(tokenHex('--accent'), tokenHex('--accent-ink'))).toBeGreaterThanOrEqual(4.5)
  })

  it('light accent as text on the page background ≥ 4.5:1', () => {
    // #1F4E68 on #F4F2ED — measured 7.99:1 (AAA)
    expect(contrast(tokenHex('--accent'), tokenHex('--bg'))).toBeGreaterThanOrEqual(4.5)
  })

  it('dark-mode accent as text on the dark card surface ≥ 4.5:1', () => {
    // #6FA3C4 on #161A24 — measured 6.39:1 (AA); on --bg 7.14:1 (AAA).
    // Dark mode previously inherited the light accent with no override.
    expect(contrast(darkTokenHex('--accent'), darkTokenHex('--surface'))).toBeGreaterThanOrEqual(
      4.5
    )
  })

  it('dark-mode accent-ink on the dark accent (btn-accent, Pro badge in dark) ≥ 4.5:1', () => {
    // #0A0D14 on #6FA3C4 — measured 7.14:1 (AAA). White would be 2.72:1,
    // which is why --accent-ink flips to the dark bg in dark mode.
    expect(contrast(darkTokenHex('--accent'), darkTokenHex('--accent-ink'))).toBeGreaterThanOrEqual(
      4.5
    )
  })
})
