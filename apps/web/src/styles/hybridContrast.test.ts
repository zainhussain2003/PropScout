import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'hybrid-tokens.css'), 'utf8')

function tokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/g)].map((match) => [match[1], match[2]])
  )
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

const [lightBlock, darkBlock] = css.split("html[data-design='hybrid'][data-theme='dark']")
const light = tokens(lightBlock)
const dark = { ...light, ...tokens(darkBlock) }

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('hybrid %s contrast', (_theme, palette) => {
  it('keeps body, secondary text and status colors readable on every surface', () => {
    for (const foreground of [
      '--ink',
      '--ink-2',
      '--muted',
      '--accent',
      '--pass',
      '--caution',
      '--fail',
    ]) {
      for (const background of ['--bg', '--bg-elev', '--surface']) {
        expect(
          contrast(palette[foreground], palette[background]),
          `${foreground} on ${background}`
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keeps button labels and the dark sample verdict readable', () => {
    expect(contrast(palette['--accent-ink'], palette['--accent'])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(palette['--accent-ink'], palette['--accent-hover'])).toBeGreaterThanOrEqual(4.5)
    for (const foreground of ['--hy-dark-text', '--hy-dark-muted', '--hy-dark-risk']) {
      expect(contrast(palette[foreground], palette['--hy-dark'])).toBeGreaterThanOrEqual(4.5)
    }
  })
})
