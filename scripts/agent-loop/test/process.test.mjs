import assert from 'node:assert/strict'
import test from 'node:test'
import { run } from '../lib/process.mjs'

test('a failing command attaches its captured stdout and stderr to the error', () => {
  // The gate runner writes `error.stack` to the log when a gate fails. Before
  // this, stdout was discarded on failure, so a test suite that printed its
  // failures to stdout (vitest, pytest) left an empty log behind.
  let caught
  try {
    run(
      process.execPath,
      [
        '-e',
        'process.stdout.write("out-line\\n"); process.stderr.write("err-line\\n"); process.exit(3)',
      ],
      { echo: false }
    )
  } catch (error) {
    caught = error
  }
  assert.ok(caught, 'expected the command to throw')
  assert.equal(caught.stdout, 'out-line\n')
  assert.equal(caught.stderr, 'err-line\n')
  assert.equal(caught.status, 3)
  assert.match(caught.message, /exit 3/)
})

test('a successful command returns its output without throwing', () => {
  const result = run(process.execPath, ['-e', 'process.stdout.write("ok")'], { echo: false })
  assert.equal(result.stdout, 'ok')
  assert.equal(result.status, 0)
})

test('a timed-out command reports the timeout rather than a bare exit', () => {
  let caught
  try {
    run(process.execPath, ['-e', 'setTimeout(() => {}, 10_000)'], { echo: false, timeout: 200 })
  } catch (error) {
    caught = error
  }
  assert.ok(caught)
  assert.equal(caught.timedOut, true)
  assert.match(caught.message, /timed out/)
})

test('resolves an npm .cmd shim to node plus the script it wraps, without a shell', async () => {
  const { resolveShim } = await import('../lib/process.mjs')
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'shim-'))
  const target = path.join(bin, 'node_modules', '@vendor', 'tool', 'bin', 'tool.js')
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, 'process.stdout.write("tool ran " + process.argv.slice(2).join(","))')
  // The exact template npm's cmd-shim writes.
  fs.writeFileSync(
    path.join(bin, 'tool.cmd'),
    '@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\n' +
      'IF EXIST "%dp0%\\node.exe" (\r\n  SET "_prog=%dp0%\\node.exe"\r\n) ELSE (\r\n  SET "_prog=node"\r\n)\r\n' +
      'endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\@vendor\\tool\\bin\\tool.js" %*\r\n'
  )
  const resolved = resolveShim('tool', [bin])
  assert.ok(resolved, 'shim should resolve')
  assert.equal(resolved.executable, process.execPath)
  assert.equal(path.normalize(resolved.args[0]), path.normalize(target))

  const result = run('tool', ['a', 'b'], { echo: false, searchPath: [bin] })
  assert.equal(result.stdout, 'tool ran a,b')
})

test('does not resolve a command that has no shim', async () => {
  const { resolveShim } = await import('../lib/process.mjs')
  assert.equal(resolveShim('definitely-not-a-real-command-xyz', []), null)
})
