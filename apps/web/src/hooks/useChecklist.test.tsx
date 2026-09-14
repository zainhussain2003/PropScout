/**
 * useChecklist — ticks survive a reload, per report, in this browser only.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChecklist } from './useChecklist'

describe('useChecklist', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('toggles items on and off', () => {
    const { result } = renderHook(() => useChecklist<string>(null))
    act(() => result.current.toggle('title'))
    expect(result.current.checked.has('title')).toBe(true)
    act(() => result.current.toggle('title'))
    expect(result.current.checked.has('title')).toBe(false)
    expect(result.current.persisted).toBe(false)
  })

  it('keeps ticks under the report key and restores them on a fresh mount', () => {
    const a = renderHook(() => useChecklist<number>('tok-1:before-you-sign'))
    act(() => {
      a.result.current.toggle(0)
      a.result.current.toggle(3)
    })
    expect(a.result.current.persisted).toBe(true)
    a.unmount()

    const b = renderHook(() => useChecklist<number>('tok-1:before-you-sign'))
    expect(Array.from(b.result.current.checked).sort()).toEqual([0, 3])
  })

  it('keeps reports apart', () => {
    const a = renderHook(() => useChecklist<number>('tok-1:x'))
    act(() => a.result.current.toggle(1))
    const b = renderHook(() => useChecklist<number>('tok-2:x'))
    expect(b.result.current.checked.size).toBe(0)
  })

  it('does not write anything without a key', () => {
    const { result } = renderHook(() => useChecklist<number>(null))
    act(() => result.current.toggle(1))
    expect(window.localStorage.length).toBe(0)
  })

  it('treats a corrupt stored value as nothing ticked', () => {
    window.localStorage.setItem('propscout:checklist:tok-9:x', '{not json')
    const { result } = renderHook(() => useChecklist<number>('tok-9:x'))
    expect(result.current.checked.size).toBe(0)
  })

  it('reset clears the ticks and the stored value', () => {
    const { result } = renderHook(() => useChecklist<number>('tok-3:x'))
    act(() => result.current.toggle(2))
    act(() => result.current.reset())
    expect(result.current.checked.size).toBe(0)
    expect(window.localStorage.getItem('propscout:checklist:tok-3:x')).toBeNull()
  })
})
