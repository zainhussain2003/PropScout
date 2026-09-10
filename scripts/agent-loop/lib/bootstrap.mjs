import fs from 'node:fs'
import path from 'node:path'
import { runGates } from './gates.mjs'

/**
 * Path of the Python interpreter inside a worktree's virtual environment.
 *
 * Bootstrap creates the venv at `<worktree>/.venv` (gitignored, so it never
 * dirties the lane). Gates and later bootstrap steps that name `python` are
 * pointed here so they run against the dependencies installed for this
 * worktree, not whatever `python` resolves to on PATH.
 */
export function venvPython(worktree) {
  return process.platform === 'win32'
    ? path.join(worktree, '.venv', 'Scripts', 'python.exe')
    : path.join(worktree, '.venv', 'bin', 'python')
}

/**
 * Install a worktree's dependencies.
 *
 * ## Why this exists
 *
 * `git worktree add` produces a checkout with no `node_modules`, no virtual
 * environment and no installed Python packages. Every configured gate —
 * `npm run typecheck`, `npm test`, `python -m pytest` — therefore failed in a
 * fresh lane before the builder had changed a single line. The loop could not
 * complete a round.
 *
 * ## Design
 *
 * Steps are configuration, shaped exactly like gates (`name`, `command`,
 * `args`, optional `cwd`), and run through the same runner: argument arrays,
 * no shell, per-step logs, deadline-aware. A `python` command is substituted
 * with the worktree's venv interpreter once that interpreter exists, so the
 * conventional sequence is: create the venv with the system `python`, then
 * `pip install` with the venv's.
 *
 * The bootstrap is a per-worktree cost paid once per task. It is deliberately
 * not shared between lanes: the reviewer must see the candidate's dependency
 * tree, not the builder's.
 */
export function bootstrapWorktree(worktree, bootstrap, logDirectory, options = {}) {
  const steps = bootstrap?.steps ?? []
  if (steps.length === 0) return { ok: true, steps: [] }

  const results = []
  for (const step of steps) {
    // Re-resolve per step: the venv does not exist until its creation step
    // has run, after which every later python step should use it.
    const interpreter = venvPython(worktree)
    const pythonExecutable = fs.existsSync(interpreter) ? interpreter : undefined
    const outcome = runGates(worktree, [step], logDirectory, {
      deadlineAt: options.deadlineAt,
      pythonExecutable,
    })
    results.push(...outcome.results)
    if (!outcome.passed) return { ok: false, steps: results }
  }
  return { ok: true, steps: results }
}
