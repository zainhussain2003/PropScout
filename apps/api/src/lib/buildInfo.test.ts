import { buildInfo } from './buildInfo'

describe('buildInfo', () => {
  it('reads the Railway commit and shortens it', () => {
    const b = buildInfo({ RAILWAY_GIT_COMMIT_SHA: 'e2cb1b3f0a1b2c3d4e5f60718293a4b5c6d7e8f9' })
    expect(b.commit).toBe('e2cb1b3f0a1b2c3d4e5f60718293a4b5c6d7e8f9')
    expect(b.shortCommit).toBe('e2cb1b3')
  })
  it('is null when nothing is set or the value is not a sha', () => {
    expect(buildInfo({})).toEqual({ commit: null, shortCommit: null })
    expect(buildInfo({ RAILWAY_GIT_COMMIT_SHA: 'not a sha' }).commit).toBeNull()
  })
})
