/**
 * useChecklist — a report checklist's ticked items, kept in this browser.
 *
 * Every report has a checklist (due diligence, before-you-sign, landlord
 * prep, buyer conditions) and every one of them forgot its ticks on reload
 * (roadmap: "Checklists: saved progress"). There is no account-side store
 * for this yet, so the ticks live in localStorage under the report's share
 * token: private to this browser, survives reloads, and says so on the page.
 *
 * `storageKey` null → in-memory only (the demo routes, tests). Storage is
 * best-effort: a private window, cleared site data or a full quota never
 * throws out of here, and a corrupt value reads as "nothing ticked".
 */

import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'propscout:checklist:'

function read<K extends string | number>(key: string): Set<K> {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((v): v is K => typeof v === 'string' || typeof v === 'number'))
  } catch {
    return new Set()
  }
}

function write<K extends string | number>(key: string, value: Set<K>): void {
  try {
    if (value.size === 0) window.localStorage.removeItem(PREFIX + key)
    else window.localStorage.setItem(PREFIX + key, JSON.stringify(Array.from(value)))
  } catch {
    // Storage unavailable or full — the ticks still work for this page view.
  }
}

export interface ChecklistState<K extends string | number> {
  checked: Set<K>
  toggle: (item: K) => void
  reset: () => void
  /** True when ticks are being kept in this browser (a storage key was given). */
  persisted: boolean
}

export function useChecklist<K extends string | number>(
  storageKey: string | null | undefined
): ChecklistState<K> {
  const key = storageKey ? storageKey : null
  const [checked, setChecked] = useState<Set<K>>(() => (key ? read<K>(key) : new Set()))

  // A different report on the same mounted page (token change) reads its own ticks.
  useEffect(() => {
    setChecked(key ? read<K>(key) : new Set())
  }, [key])

  const toggle = useCallback(
    (item: K) => {
      setChecked((prev) => {
        const next = new Set(prev)
        if (next.has(item)) next.delete(item)
        else next.add(item)
        if (key) write(key, next)
        return next
      })
    },
    [key]
  )

  const reset = useCallback(() => {
    setChecked(new Set())
    if (key) write<K>(key, new Set())
  }, [key])

  return { checked, toggle, reset, persisted: key !== null }
}
