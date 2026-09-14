/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

// ── Helpers ──────────────────────────────────────────────────────────

export function clampStr(min: number, max: number): string {
  return `clamp(${min}px, 1.4vw, ${max}px)`
}

export function detectKindFromUrl(url: string): 'sale' | 'rent' {
  const lower = url.toLowerCase()
  if (
    lower.includes('/rental') ||
    lower.includes('/rentals') ||
    lower.includes('for-rent') ||
    lower.includes('for_rent')
  ) {
    return 'rent'
  }
  return 'sale'
}
