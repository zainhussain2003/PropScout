/**
 * Run a command and contain its process tree.
 *
 * `spawnSync`'s `timeout` terminates only the process it started. A test
 * runner, model CLI or candidate-authored test can spawn descendants that
 * outlive that kill — and, if they are spawned detached, that outlive their
 * parent's *normal* exit too. Node's own Windows job object covers the first
 * case only for non-detached children. This wrapper is the direct child
 * instead, and on every exit path:
 *
 *  1. on timeout, kills the tree rooted at the child (`taskkill /T /F` by
 *     absolute path on Windows; the child's process group elsewhere) and
 *     treats a failed kill as fatal rather than waiting the child out;
 *  2. after the child has exited for any reason, sweeps for descendants that
 *     are still alive — found by walking parent PIDs in a process snapshot
 *     and filtered to processes created after this wrapper started — and
 *     terminates them.
 *
 * The sweep is best effort: a descendant that has re-parented itself away
 * from the tree cannot be found by parent PID. Full containment needs a
 * Windows Job Object with breakaway prohibited, which Node cannot create
 * without a native module, or an OS/container boundary. POLICY.md says so.
 *
 * Exit codes: the child's own; 124 with `TIMEOUT_MARKER` on stderr after a
 * timeout; 125 with `KILL_FAILED_MARKER` when the tree could not be killed.
 *
 * Usage: node tree-runner.mjs <timeoutMs> <command> [args...]
 */
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

// Mirrored in process.mjs; this file must not be imported (it runs on load).
const TIMEOUT_EXIT_CODE = 124
const KILL_FAILED_EXIT_CODE = 125
const TIMEOUT_MARKER = '[agent-loop] process tree timed out'
const KILL_FAILED_MARKER = '[agent-loop] process tree kill FAILED'
const SWEEP_MARKER = '[agent-loop] terminated orphaned descendant'

const system32 = path.join(
  process.env.SystemRoot ?? process.env.SYSTEMROOT ?? 'C:\\Windows',
  'System32'
)
const TASKKILL = path.join(system32, 'taskkill.exe')
const POWERSHELL = path.join(system32, 'WindowsPowerShell', 'v1.0', 'powershell.exe')

const [, , timeoutArgument, command, ...args] = process.argv
const timeoutMs = Number(timeoutArgument)
if (!command || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  process.stderr.write('usage: tree-runner.mjs <timeoutMs> <command> [args...]\n')
  process.exit(2)
}

const startedAt = Date.now()
const child = spawn(command, args, {
  stdio: 'inherit',
  windowsHide: true,
  // A new process group on POSIX so the whole tree can be signalled at once.
  detached: process.platform !== 'win32',
})

/** Terminate the tree while the child is still alive. Returns true on success. */
function killTree() {
  if (process.platform === 'win32') {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = spawnSync(TASKKILL, ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      })
      if (result.status === 0) return true
    }
    return false
  }
  try {
    process.kill(-child.pid, 'SIGKILL')
    return true
  } catch {
    try {
      child.kill('SIGKILL')
      return true
    } catch {
      return false
    }
  }
}

/**
 * Snapshot every process as { pid, ppid, createdAt } (ms since epoch, or
 * null when unknown). Windows only; POSIX relies on the process group.
 */
function processSnapshot() {
  if (process.platform !== 'win32') return []
  const script =
    "Get-CimInstance Win32_Process | ForEach-Object { '{0},{1},{2}' -f $_.ProcessId, $_.ParentProcessId, " +
    "$(if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { '' }) }"
  const result = spawnSync(POWERSHELL, ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30_000,
  })
  if (result.status !== 0 || !result.stdout) return null
  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [pid, ppid, created] = line.split(',')
      return {
        pid: Number(pid),
        ppid: Number(ppid),
        createdAt: created ? Date.parse(created) : null,
      }
    })
    .filter((row) => Number.isFinite(row.pid) && Number.isFinite(row.ppid))
}

/**
 * Terminate descendants of the child that are still running after it has
 * exited. Walks parent PIDs transitively from the child's PID; Windows keeps
 * a dead parent's PID on its children, so this finds them. Only processes
 * created after this wrapper started are candidates, which guards against
 * a reused PID pointing at something unrelated.
 */
function sweepOrphans() {
  const snapshot = processSnapshot()
  if (!snapshot) return { swept: 0, failed: true }
  const byParent = new Map()
  for (const row of snapshot) {
    if (!byParent.has(row.ppid)) byParent.set(row.ppid, [])
    byParent.get(row.ppid).push(row)
  }
  const queue = [child.pid]
  const victims = []
  const seen = new Set()
  while (queue.length) {
    const parent = queue.shift()
    for (const row of byParent.get(parent) ?? []) {
      if (seen.has(row.pid) || row.pid === process.pid) continue
      seen.add(row.pid)
      // Unknown creation time: err on the side of killing, it is under our tree.
      if (row.createdAt === null || row.createdAt >= startedAt - 1000) victims.push(row.pid)
      queue.push(row.pid)
    }
  }
  let swept = 0
  for (const pid of victims) {
    try {
      process.kill(pid, 'SIGKILL')
      swept += 1
      process.stderr.write(`${SWEEP_MARKER} pid ${pid}\n`)
    } catch {
      // Already gone.
    }
  }
  return { swept, failed: false }
}

let timedOut = false
let killFailed = false
const timer = setTimeout(() => {
  timedOut = true
  if (!killTree()) {
    killFailed = true
    // Do not wait the child out: report the failure so the coordinator can
    // treat the run as failed instead of silently exceeding its budget.
    process.stderr.write(`${KILL_FAILED_MARKER} for pid ${child.pid}\n`)
    sweepOrphans()
    process.exit(KILL_FAILED_EXIT_CODE)
  }
}, timeoutMs)

child.on('error', (error) => {
  clearTimeout(timer)
  process.stderr.write(`${error.message}\n`)
  process.exit(127)
})

child.on('exit', (code, signal) => {
  clearTimeout(timer)
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, 'SIGKILL')
    } catch {
      // Group already empty.
    }
  }
  sweepOrphans()
  if (killFailed) process.exit(KILL_FAILED_EXIT_CODE)
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
