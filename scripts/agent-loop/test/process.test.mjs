import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { run } from '../lib/process.mjs'

const require = createRequire(import.meta.url)

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

test('rejects a shim whose target escapes node_modules or traverses upward', async () => {
  const { resolveShim } = await import('../lib/process.mjs')
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'shim-'))
  fs.mkdirSync(path.join(bin, 'node_modules'), { recursive: true })
  const evil = path.join(os.tmpdir(), 'evil.js')
  fs.writeFileSync(evil, 'process.stdout.write("pwned")')
  const cases = {
    traversal: '"%_prog%"  "%dp0%\\node_modules\\..\\..\\evil.js" %*\r\n',
    outside: '"%_prog%"  "%dp0%\\evil.js" %*\r\n',
    absolute: `"%_prog%"  "${evil}" %*\r\n`,
  }
  for (const [name, line] of Object.entries(cases)) {
    fs.writeFileSync(path.join(bin, `${name}.cmd`), line)
    assert.equal(resolveShim(name, [bin]), null, `${name} shim must not resolve`)
  }
})

test('a timeout kills the whole process tree, not only the direct child', () => {
  // The direct child spawns a *detached* grandchild — the one case Node's own
  // Windows job object does not cover (a plain grandchild already dies with
  // its parent there). Without the tree-runner wrapper this grandchild
  // survives the timeout; verified by running the same fixture with
  // `killTree: false`.
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const marker = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tree-')), 'grandchild.pid')
  const grandchild = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, String(process.pid)); setInterval(() => {}, 1000)`
  const child = `const { spawn } = require('node:child_process'); spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], { stdio: 'ignore', detached: true }).unref(); setInterval(() => {}, 1000)`
  let caught
  try {
    run(process.execPath, ['-e', child], { echo: false, timeout: 1500 })
  } catch (error) {
    caught = error
  }
  assert.ok(caught?.timedOut, 'expected a timeout')
  const pid = Number(fs.readFileSync(marker, 'utf8'))
  assert.ok(pid > 0)
  let alive = true
  try {
    process.kill(pid, 0)
  } catch {
    alive = false
  }
  if (alive) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // ignore
    }
  }
  assert.equal(alive, false, `grandchild ${pid} survived the timeout`)
})

test('isolateEnv withholds everything but the allowlist and sets CI', async () => {
  const { isolatedEnvironment } = await import('../lib/process.mjs')
  const env = isolatedEnvironment({
    PATH: 'x',
    Path: 'y',
    ANTHROPIC_API_KEY: 'secret',
    GH_TOKEN: 'secret',
    SUPABASE_SERVICE_ROLE_KEY: 'secret',
    NODE_OPTIONS: '--require evil',
    HOME: '/h',
  })
  assert.equal(env.ANTHROPIC_API_KEY, undefined)
  assert.equal(env.GH_TOKEN, undefined)
  assert.equal(env.SUPABASE_SERVICE_ROLE_KEY, undefined)
  assert.equal(env.NODE_OPTIONS, undefined)
  assert.equal(env.HOME, '/h')
  assert.equal(env.PATH, 'x')
  assert.equal(env.Path, 'y')
  assert.equal(env.CI, '1')

  const result = run(
    process.execPath,
    ['-e', 'process.stdout.write(String(process.env.AGENT_LOOP_PROBE ?? "absent"))'],
    { echo: false, isolateEnv: true, env: {} }
  )
  assert.equal(result.stdout, 'absent')
})

test('a detached descendant that outlives a successful parent exit is swept', () => {
  // Codex's escape: spawn detached, exit 0 — the timeout never fires, so a
  // timeout-only kill leaves the grandchild running. The wrapper sweeps
  // descendants on every exit path.
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const marker = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-')), 'grandchild.pid')
  const grandchild = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, String(process.pid)); setInterval(() => {}, 1000)`
  const child = `const { spawn } = require('node:child_process'); spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], { stdio: 'ignore', detached: true }).unref(); setTimeout(() => process.exit(0), 300)`
  const result = run(process.execPath, ['-e', child], { echo: false, timeout: 30_000 })
  assert.equal(result.status, 0)
  assert.match(result.stderr, /terminated orphaned descendant/)
  const pid = Number(fs.readFileSync(marker, 'utf8'))
  let alive = true
  try {
    process.kill(pid, 0)
  } catch {
    alive = false
  }
  if (alive) process.kill(pid, 'SIGKILL')
  assert.equal(alive, false, `grandchild ${pid} survived its parent's successful exit`)
})

test("shims are resolved only from npm's global prefix, never from PATH", async () => {
  const { resolveShim, trustedShimDirectories } = await import('../lib/process.mjs')
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'untrusted-'))
  const target = path.join(bin, 'node_modules', 'evil', 'payload.js')
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, 'process.stdout.write("ARBITRARY_SCRIPT_RAN")')
  fs.writeFileSync(
    path.join(bin, 'notcodex.cmd'),
    '"%_prog%"  "%dp0%\\node_modules\\evil\\payload.js" %*\r\n'
  )
  const originalPath = process.env.PATH
  process.env.PATH = `${bin}${path.delimiter}${originalPath ?? ''}`
  try {
    assert.equal(resolveShim('notcodex'), null, 'a PATH directory must not supply a shim')
    assert.ok(!trustedShimDirectories().includes(bin))
  } finally {
    process.env.PATH = originalPath
  }
})
