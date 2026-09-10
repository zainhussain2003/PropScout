import { run } from './process.mjs'

export function git(cwd, args, options = {}) {
  const output = run('git', args, { cwd, ...options }).stdout
  return options.trim === false ? output : output.trim()
}

export function repoRoot(cwd = process.cwd()) {
  return git(cwd, ['rev-parse', '--show-toplevel'], { echo: false })
}

export function head(cwd) {
  return git(cwd, ['rev-parse', 'HEAD'], { echo: false })
}

export function branch(cwd) {
  return git(cwd, ['branch', '--show-current'], { echo: false })
}

export function statusPaths(cwd) {
  const output = git(cwd, ['status', '--porcelain=v1', '-z'], { echo: false, trim: false })
  if (!output) return []
  const entries = output.split('\0')
  const paths = []
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    if (!entry) continue
    const status = entry.slice(0, 2)
    paths.push(entry.slice(3))
    if (/[RC]/.test(status)) index += 1
  }
  return paths
}

export function ensureClean(cwd) {
  const paths = statusPaths(cwd)
  if (paths.length) throw new Error(`Worktree is not clean: ${paths.join(', ')}`)
}

export function stagePaths(cwd, paths) {
  if (!paths.length) throw new Error('No paths to stage')
  git(cwd, ['add', '--', ...paths])
}

export function commit(cwd, message) {
  git(cwd, ['commit', '--no-verify', '-m', message])
  return head(cwd)
}
