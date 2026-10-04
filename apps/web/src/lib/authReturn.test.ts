import { beforeEach, describe, expect, it } from 'vitest'
import { consumeAuthReturnPath, rememberAuthReturnPath } from './authReturn'

describe('auth return path', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '/')
  })

  it('returns to the report once after sign-in', () => {
    const report = '/r/6b14814b-698f-4383-83ef-f837b5ef265b'
    window.history.replaceState(null, '', report)
    rememberAuthReturnPath()
    expect(consumeAuthReturnPath()).toBe(report)
    expect(consumeAuthReturnPath()).toBe('/account')
  })

  it('rejects a stored external redirect', () => {
    window.localStorage.setItem(
      'propscout.auth.returnPath',
      JSON.stringify({ path: 'https://example.com', at: Date.now() })
    )
    expect(consumeAuthReturnPath()).toBe('/account')
  })

  it('does not record non-report pages', () => {
    window.history.replaceState(null, '', '/pricing')
    rememberAuthReturnPath()
    expect(consumeAuthReturnPath()).toBe('/account')
  })
})
