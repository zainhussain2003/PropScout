import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { validateCitations } from '../lib/citations.mjs'
import { git } from '../lib/git.mjs'

function tempRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'citations-'))
  git(repo, ['init', '-q', '-b', 'main'], { echo: false })
  git(repo, ['config', 'user.email', 'test@example.com'], { echo: false })
  git(repo, ['config', 'user.name', 'Test'], { echo: false })
  fs.mkdirSync(path.join(repo, 'src'))
  fs.writeFileSync(path.join(repo, 'src', 'a.ts'), 'line1\nline2\nline3\n')
  git(repo, ['add', '--', 'src/a.ts'], { echo: false })
  git(repo, ['commit', '-q', '-m', 'first'], { echo: false })
  const first = git(repo, ['rev-parse', 'HEAD'], { echo: false })
  fs.writeFileSync(path.join(repo, 'src', 'b.ts'), 'only\n')
  git(repo, ['add', '--', 'src/b.ts'], { echo: false })
  git(repo, ['commit', '-q', '-m', 'second'], { echo: false })
  const second = git(repo, ['rev-parse', 'HEAD'], { echo: false })
  return { repo, first, second }
}

test('accepts citations that exist within the file at the cited commit', () => {
  const { repo, second } = tempRepo()
  const errors = validateCitations(repo, second, [
    { citations: [{ path: 'src/a.ts', start_line: 1, end_line: 3 }] },
    { citations: [{ path: 'src/b.ts', start_line: 1, end_line: 1 }] },
  ])
  assert.deepEqual(errors, [])
})

test('rejects a path that does not exist at the candidate commit', () => {
  // src/b.ts exists at HEAD but not at the first commit. A reviewer citing
  // the wrong commit — or a file it imagined — must not reach the builder.
  const { repo, first } = tempRepo()
  const errors = validateCitations(repo, first, [
    { citations: [{ path: 'src/b.ts', start_line: 1, end_line: 1 }] },
  ])
  assert.equal(errors.length, 1)
  assert.match(errors[0], /src\/b\.ts.*does not exist/)
})

test('rejects a line range beyond the end of the file', () => {
  const { repo, second } = tempRepo()
  const errors = validateCitations(repo, second, [
    { citations: [{ path: 'src/a.ts', start_line: 2, end_line: 9 }] },
  ])
  assert.equal(errors.length, 1)
  assert.match(errors[0], /end_line 9.*3 lines/)
})

test('rejects a nonexistent file with a plain message, not a git stack trace', () => {
  const { repo, second } = tempRepo()
  const errors = validateCitations(repo, second, [
    { citations: [{ path: 'nope.ts', start_line: 1, end_line: 1 }] },
  ])
  assert.equal(errors.length, 1)
  assert.doesNotMatch(errors[0], /fatal:/)
})
