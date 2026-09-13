/**
 * useTheme — one theme for the whole app, remembered between visits.
 *
 * Every page used to hold its own `dark` boolean and write `data-theme` on
 * `<html>` itself; the landing page even re-applied its `false` on mount, so
 * navigating home reset a dark report to light, and a reload always came up
 * light (audit UI-04). The theme is a property of the person, not the page.
 *
 * A module-level store rather than a Provider: pages and tests can call
 * `useTheme()` anywhere without wrapping, and there is exactly one source of
 * truth for the attribute the tokens read. Order of precedence on first use:
 * the saved choice, then the OS preference, then light.
 */

import { useEffect, useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'propscout-theme'

const listeners = new Set<() => void>()
let current: Theme | null = null

function readInitial(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // Storage blocked — fall through to the OS preference.
  }
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    // matchMedia absent (older jsdom) — light.
  }
  return 'light'
}

function apply(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

function getTheme(): Theme {
  if (current == null) {
    current = readInitial()
    apply(current)
  }
  return current
}

export function setTheme(theme: Theme): void {
  current = theme
  apply(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage blocked — the choice lasts for this visit.
  }
  listeners.forEach((l) => l())
}

export function toggleTheme(): void {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Test hook: forget the cached choice so the next read starts fresh. */
export function resetThemeForTests(): void {
  current = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  document.documentElement.removeAttribute('data-theme')
}

export function useTheme(): { theme: Theme; dark: boolean; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light' as Theme)
  // Make sure the attribute is on <html> even if nothing has toggled yet.
  useEffect(() => {
    apply(getTheme())
  }, [])
  return { theme, dark: theme === 'dark', toggle: toggleTheme }
}
