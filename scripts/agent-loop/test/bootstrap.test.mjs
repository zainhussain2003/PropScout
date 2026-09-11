import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { bootstrapWorktree, venvPython } from '../lib/bootstrap.mjs'

const node = process.execPath

function tempDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

test('runs each configured step in order and records the outcome', () => {
  const worktree = tempDirectory('bootstrap-ok-')
  const logs = tempDirectory('bootstrap-logs-')
  const marker = path.join(worktree, 'step-ran.txt')
  const result = bootstrapWorktree(
    worktree,
    {
      steps: [
        {
          name: 'write marker',
          command: node,
          args: ['-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, 'yes')`],
        },
        {
          name: 'read marker',
          command: node,
          args: ['-e', `process.exit(require('fs').existsSync(${JSON.stringify(marker)}) ? 0 : 1)`],
        },
      ],
    },
    logs
  )
  assert.equal(result.ok, true)
  assert.deepEqual(
    result.steps.map((s) => s.status),
    ['passed', 'passed']
  )
  assert.equal(fs.readFileSync(marker, 'utf8'), 'yes')
})

test('stops at the first failing step and keeps its output', () => {
  const worktree = tempDirectory('bootstrap-fail-')
  const logs = tempDirectory('bootstrap-fail-logs-')
  const result = bootstrapWorktree(
    worktree,
    {
      steps: [
        {
          name: 'breaks',
          command: node,
          args: ['-e', 'console.log("why it broke"); process.exit(2)'],
        },
        { name: 'never', command: node, args: ['-e', '0'] },
      ],
    },
    logs
  )
  assert.equal(result.ok, false)
  assert.equal(result.steps.length, 1)
  assert.match(fs.readFileSync(path.join(logs, 'breaks.log'), 'utf8'), /why it broke/)
})

test('substitutes the venv interpreter for python steps once the venv exists', () => {
  const worktree = tempDirectory('bootstrap-venv-')
  const logs = tempDirectory('bootstrap-venv-logs-')
  // Fake a venv layout so the substitution can be observed without pip.
  const interpreter = venvPython(worktree)
  fs.mkdirSync(path.dirname(interpreter), { recursive: true })
  fs.copyFileSync(node, interpreter)
  const result = bootstrapWorktree(
    worktree,
    { steps: [{ name: 'py step', command: 'python', args: ['-e', '0'] }] },
    logs
  )
  assert.equal(result.ok, true)
  assert.equal(result.steps[0].command, interpreter)
})

test('respects the deadline', () => {
  const worktree = tempDirectory('bootstrap-deadline-')
  const logs = tempDirectory('bootstrap-deadline-logs-')
  const result = bootstrapWorktree(
    worktree,
    { steps: [{ name: 'late', command: node, args: ['-e', '0'] }] },
    logs,
    { deadlineAt: new Date(Date.now() - 1).toISOString() }
  )
  assert.equal(result.ok, false)
  assert.equal(result.steps[0].status, 'skipped')
})
