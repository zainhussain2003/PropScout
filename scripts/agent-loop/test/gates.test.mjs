import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { runGates } from '../lib/gates.mjs'

const node = process.execPath

function tempDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

test('a failing gate log contains the command stdout, not just the exit code', () => {
  const logs = tempDirectory('gates-log-')
  const result = runGates(
    process.cwd(),
    [
      {
        name: 'noisy fail',
        command: node,
        args: ['-e', 'console.log("FAIL detail from stdout"); process.exit(1)'],
      },
    ],
    logs
  )
  assert.equal(result.passed, false)
  const log = fs.readFileSync(path.join(logs, 'noisy-fail.log'), 'utf8')
  assert.match(log, /FAIL detail from stdout/)
  assert.match(log, /exit 1/)
})

test('stops running gates once the deadline has passed and records why', () => {
  const logs = tempDirectory('gates-deadline-')
  const result = runGates(
    process.cwd(),
    [
      { name: 'first', command: node, args: ['-e', 'process.exit(0)'] },
      { name: 'never runs', command: node, args: ['-e', 'process.exit(0)'] },
    ],
    logs,
    { deadlineAt: new Date(Date.now() - 1000).toISOString() }
  )
  assert.equal(result.passed, false)
  assert.equal(result.results[0].status, 'skipped')
  assert.match(result.results[0].error, /deadline/)
})

test('a gate cannot run past the deadline even when its own timeout is larger', () => {
  // The three-hour cap was advisory before this: an individual gate could
  // keep its 30-minute default timeout after the overall deadline had passed.
  const logs = tempDirectory('gates-cap-')
  const started = Date.now()
  const result = runGates(
    process.cwd(),
    [
      {
        name: 'slow',
        command: node,
        args: ['-e', 'setTimeout(() => {}, 30_000)'],
        timeoutMs: 60_000,
      },
    ],
    logs,
    { deadlineAt: new Date(Date.now() + 500).toISOString() }
  )
  assert.equal(result.passed, false)
  assert.ok(Date.now() - started < 10_000, 'gate should have been cut off near the deadline')
  assert.match(result.results[0].error, /timed out/)
})

test('substitutes the worktree python for a bare "python" command', () => {
  const logs = tempDirectory('gates-python-')
  // Use node as the stand-in interpreter so the test does not need a venv.
  const result = runGates(
    process.cwd(),
    [{ name: 'py', command: 'python', args: ['-e', 'process.exit(0)'] }],
    logs,
    { pythonExecutable: node }
  )
  assert.equal(result.passed, true)
  assert.equal(result.results[0].command, node)
})

test('records duration for every gate', () => {
  const logs = tempDirectory('gates-duration-')
  const result = runGates(process.cwd(), [{ name: 'ok', command: node, args: ['-e', '0'] }], logs)
  assert.equal(typeof result.results[0].durationMs, 'number')
})
