/**
 * Run a command and, on timeout, kill its whole process tree.
 *
 * `spawnSync`'s `timeout` terminates only the process it started. A test
 * runner, model CLI or candidate-authored test can spawn descendants that
 * outlive that kill, so a "hard" task deadline enforced on direct children
 * only was not hard. This wrapper is the direct child instead: it starts the
 * real command, and when its timer fires it terminates the tree — Windows
 * `taskkill /T /F` on the child's PID, or a signal to the child's own process
 * group elsewhere — then exits 124 with a marker line on stderr that
 * `process.mjs` turns into `timedOut: true`.
 *
 * Usage: node tree-runner.mjs <timeoutMs> <command> [args...]
 */
import { spawn, spawnSync } from 'node:child_process'

// Mirrored in process.mjs; this file must not be imported (it runs on load).
const TIMEOUT_EXIT_CODE = 124
const TIMEOUT_MARKER = '[agent-loop] process tree timed out'

const [, , timeoutArgument, command, ...args] = process.argv
const timeoutMs = Number(timeoutArgument)
if (!command || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  process.stderr.write('usage: tree-runner.mjs <timeoutMs> <command> [args...]\n')
  process.exit(2)
}

const child = spawn(command, args, {
  stdio: 'inherit',
  windowsHide: true,
  // A new process group on POSIX so the whole tree can be signalled at once.
  detached: process.platform !== 'win32',
})

function killTree() {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL')
    } catch {
      try {
        child.kill('SIGKILL')
      } catch {
        // Already gone.
      }
    }
  }
}

let timedOut = false
const timer = setTimeout(() => {
  timedOut = true
  killTree()
}, timeoutMs)

child.on('error', (error) => {
  clearTimeout(timer)
  process.stderr.write(`${error.message}\n`)
  process.exit(127)
})

child.on('exit', (code, signal) => {
  clearTimeout(timer)
  if (timedOut) {
    process.stderr.write(`${TIMEOUT_MARKER} after ${timeoutMs}ms\n`)
    process.exit(TIMEOUT_EXIT_CODE)
  }
  if (signal) {
    process.stderr.write(`terminated by ${signal}\n`)
    process.exit(128)
  }
  process.exit(code ?? 1)
})
