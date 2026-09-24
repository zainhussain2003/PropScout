import { describe, expect, it } from 'vitest'
import { resolveAppDesign } from './appDesign'

describe('developer design selection', () => {
  it('defaults to hybrid without depending on theme, URL or storage', () => {
    expect(resolveAppDesign(undefined)).toBe('hybrid')
    expect(resolveAppDesign('hybrid')).toBe('hybrid')
    expect(resolveAppDesign('dark')).toBe('hybrid')
  })

  it('selects the original interface only with the explicit legacy flag', () => {
    expect(resolveAppDesign('legacy')).toBe('legacy')
  })
})
