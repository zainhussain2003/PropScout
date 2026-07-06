import { serializeError, isTimeoutError } from './http'

describe('serializeError', () => {
  it('captures name, message, and stack from an Error', () => {
    const err = new TypeError('boom')
    const out = serializeError(err)
    expect(out.name).toBe('TypeError')
    expect(out.message).toBe('boom')
    expect(typeof out.stack).toBe('string')
  })

  it('stringifies a non-Error thrown value', () => {
    expect(serializeError('nope')).toEqual({ message: 'nope' })
    expect(serializeError(42)).toEqual({ message: '42' })
  })
})

describe('isTimeoutError', () => {
  it('is true for a TimeoutError (AbortSignal.timeout)', () => {
    expect(isTimeoutError(Object.assign(new Error('t'), { name: 'TimeoutError' }))).toBe(true)
  })

  it('is true for an AbortError (manual AbortController)', () => {
    expect(isTimeoutError(Object.assign(new Error('a'), { name: 'AbortError' }))).toBe(true)
  })

  it('is false for a plain network error', () => {
    expect(isTimeoutError(new Error('ECONNREFUSED'))).toBe(false)
  })

  it('is false for non-Error values', () => {
    expect(isTimeoutError('TimeoutError')).toBe(false)
    expect(isTimeoutError(null)).toBe(false)
  })
})
