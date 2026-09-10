import { corsOrigins } from './corsOrigins'

describe('corsOrigins', () => {
  const [canonical, previewPattern] = corsOrigins('https://propscout.ca')

  it('keeps the configured frontend as the canonical exact origin', () => {
    expect(canonical).toBe('https://propscout.ca')
  })

  it.each([
    'https://prop-scout-git-feat-address-in-9ef8e8-zainhussain2003s-projects.vercel.app',
    'https://prop-scout-ie14e4y2e-zainhussain2003s-projects.vercel.app',
  ])('allows a PropScout Preview origin: %s', (origin) => {
    expect(previewPattern).toBeInstanceOf(RegExp)
    expect((previewPattern as RegExp).test(origin)).toBe(true)
  })

  it.each([
    'https://attacker.vercel.app',
    'https://prop-scout-git-fix-attacker-projects.vercel.app',
    'https://prop-scout-git-feat-zainhussain2003s-projects.vercel.app.evil.example',
    'http://prop-scout-git-feat-zainhussain2003s-projects.vercel.app',
  ])('rejects origins outside the project and team: %s', (origin) => {
    expect((previewPattern as RegExp).test(origin)).toBe(false)
  })
})
