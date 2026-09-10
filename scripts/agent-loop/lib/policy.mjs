import path from 'node:path'

export function normalizeRepoPath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '')
}

function matchesPrefix(file, rule) {
  const normalizedFile = normalizeRepoPath(file)
  const normalizedRule = normalizeRepoPath(rule)
  if (normalizedRule.endsWith('/') || normalizedRule.endsWith('.')) {
    return normalizedFile.startsWith(normalizedRule)
  }
  return normalizedFile === normalizedRule
}

export function classifyPaths(paths, config) {
  const normalized = paths.map(normalizeRepoPath)
  const protectedPaths = normalized.filter((file) =>
    config.protectedPaths.some((rule) => matchesPrefix(file, rule)),
  )
  const humanGatePaths = normalized.filter((file) =>
    file !== '.env.example' && config.humanGatePaths.some((rule) => matchesPrefix(file, rule)),
  )
  const forbiddenPaths = normalized.filter((file) =>
    config.forbiddenPathFragments.some((part) => file.includes(normalizeRepoPath(part))),
  )

  return { protectedPaths, humanGatePaths, forbiddenPaths }
}

export function assertSafeBuilderPaths(paths, config) {
  const result = classifyPaths(paths, config)
  if (result.protectedPaths.length) {
    throw new Error(`Builder modified protected paths: ${result.protectedPaths.join(', ')}`)
  }
  if (result.forbiddenPaths.length) {
    throw new Error(`Builder modified generated/forbidden paths: ${result.forbiddenPaths.join(', ')}`)
  }
  return result
}

export function isInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child))
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}
