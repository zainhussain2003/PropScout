import fs from 'node:fs'
import path from 'node:path'
import { run } from './process.mjs'

const DEFAULT_GATE_TIMEOUT_MS = 30 * 60 * 1000

/**
 * Run the configured deterministic gates in order, stopping at the first
 * failure.
 *
 * `deadlineAt` makes the task's time cap real. Before this, a gate kept its
 * own (default 30-minute) timeout regardless of how much of the overall
 * three-hour budget remained, so the cap was advisory. Now each gate's timeout
 * is the smaller of its own limit and the time left, and a gate that would
 * start after the deadline is skipped with the reason recorded.
 *
 * `pythonExecutable` substitutes the worktree's virtual-environment
 * interpreter for a bare `python` command, so gates configured as
 * `python -m pytest` run against the dependencies bootstrapped for that
 * worktree rather than whatever `python` resolves to on PATH.
 *
 * On failure the log holds the command's stdout, stderr and the error message.
 * Test runners print failures to stdout, and a log without it is useless.
 */
export function runGates(worktree, gates, logDirectory, options = {}) {
  fs.mkdirSync(logDirectory, { recursive: true })
  const results = []
  const deadline = options.deadlineAt ? new Date(options.deadlineAt).getTime() : null

  for (const gate of gates) {
    const startedAt = new Date().toISOString()
    const startedMs = Date.now()
    const safeName = gate.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const logFile = path.join(logDirectory, `${safeName}.log`)
    const command =
      gate.command === 'python' && options.pythonExecutable
        ? options.pythonExecutable
        : gate.command

    const remainingMs = deadline === null ? Infinity : deadline - startedMs
    if (remainingMs <= 0) {
      const error = `skipped: task deadline reached before "${gate.name}" started`
      fs.writeFileSync(logFile, `${error}\n`)
      results.push({ name: gate.name, command, status: 'skipped', startedAt, durationMs: 0, error })
      return { passed: false, results }
    }

    const timeout = Math.min(gate.timeoutMs ?? DEFAULT_GATE_TIMEOUT_MS, remainingMs)

    try {
      // Gates run candidate-authored code in the coordinator's own process
      // tree, outside the builder's sandbox. Withhold the coordinator's
      // environment (API keys, tokens) from it; the tree-kill wrapper in
      // `run` bounds its lifetime. This is damage limitation, not a sandbox.
      const result = run(command, gate.args, {
        cwd: path.join(worktree, gate.cwd ?? '.'),
        echo: false,
        timeout,
        isolateEnv: true,
      })
      fs.writeFileSync(logFile, `${result.stdout}${result.stderr}`)
      results.push({
        name: gate.name,
        command,
        status: 'passed',
        startedAt,
        durationMs: Date.now() - startedMs,
      })
    } catch (error) {
      const log = [
        `# ${gate.name}`,
        `# ${command} ${gate.args.join(' ')}`,
        `# ${error.message}`,
        '',
        '--- stdout ---',
        error.stdout ?? '',
        '--- stderr ---',
        error.stderr ?? '',
      ].join('\n')
      fs.writeFileSync(logFile, `${log}\n`)
      results.push({
        name: gate.name,
        command,
        status: 'failed',
        startedAt,
        durationMs: Date.now() - startedMs,
        error: error.message,
        timedOut: error.timedOut === true,
      })
      return { passed: false, results }
    }
  }

  return { passed: true, results }
}
