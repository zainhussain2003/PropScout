#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { fakeAgentsDirectory, runBuilder, runReviewer } from './lib/agents.mjs'
import { bootstrapWorktree, venvPython } from './lib/bootstrap.mjs'
import { validateCitations } from './lib/citations.mjs'
import { generateClaimsMarkdown, loadClaims, writeClaims } from './lib/claims.mjs'
import { runGates } from './lib/gates.mjs'
import {
  branch,
  commit,
  ensureClean,
  git,
  head,
  repoRoot,
  stagePaths,
  statusPaths,
} from './lib/git.mjs'
import { assertSafeBuilderPaths, isInside } from './lib/policy.mjs'
import { budgetedTimeout, commandExists } from './lib/process.mjs'
import { assertMatchesSchema } from './lib/schema.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))

/**
 * The repository the coordinator operates on. Normally the one this script
 * lives in. `AGENT_LOOP_REPO` overrides it so the end-to-end test can drive
 * the real coordinator against a disposable repository; `doctor` reports it
 * when set, and it must never be set for an unattended run.
 */
const defaultRepo = process.env.AGENT_LOOP_REPO
  ? path.resolve(process.env.AGENT_LOOP_REPO)
  : path.resolve(scriptDirectory, '..', '..')

/**
 * The flag a human must pass to run Claude as an unattended builder.
 *
 * Codex's builder lane runs inside an OS-level, network-constrained sandbox.
 * Claude's does not: its tool allowlist permits `npm run *` and `python -m
 * pytest *`, and both execute code the builder can author (package.json,
 * conftest.py, any test). The allowlist is therefore not a security boundary,
 * and the policy document no longer claims it is. Until the Claude lane runs
 * inside an external sandbox with networking disabled, choosing it must be a
 * deliberate, recorded act rather than a default.
 */
const CLAUDE_BUILDER_ACKNOWLEDGEMENT = 'acknowledge-unsandboxed-claude-builder'

/**
 * The flag that permits the two test-only environment seams
 * (`AGENT_LOOP_REPO`, `AGENT_LOOP_FAKE_AGENTS`). Without it, every command
 * refuses to start while either variable is set: a seam left exported in a
 * shell must not silently redirect a real run to another repository or
 * replace both models with local scripts. `doctor` is exempt so it can
 * report the condition.
 */
const TEST_SEAMS_FLAG = 'allow-test-seams'

function activeTestSeams() {
  return ['AGENT_LOOP_REPO', 'AGENT_LOOP_FAKE_AGENTS'].filter((name) => process.env[name])
}

function parseArgs(argv) {
  const [command = 'help', ...rest] = argv
  const flags = {}
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index]
    if (!value.startsWith('--')) throw new Error(`Unexpected argument: ${value}`)
    const key = value.slice(2)
    const next = rest[index + 1]
    if (next && !next.startsWith('--')) {
      flags[key] = next
      index += 1
    } else {
      flags[key] = true
    }
  }
  return { command, flags }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`)
  fs.renameSync(temporary, file)
}

function slug(value) {
  if (!value || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(value)) {
    throw new Error('Task must be a 2-63 character lowercase slug')
  }
  return value
}

function pathsFor(repo, config, task) {
  const parent = path.dirname(repo)
  return {
    runtime: path.join(parent, config.runtimeRoot, task),
    worktrees: path.join(parent, config.worktreeRoot, task),
  }
}

function stateFile(repo, config, task) {
  return path.join(pathsFor(repo, config, task).runtime, 'state.json')
}

function loadConfig(repo) {
  return readJson(path.join(repo, '.agent-loop', 'config.json'))
}

function loadContext(taskValue) {
  const repo = repoRoot(defaultRepo)
  const config = loadConfig(repo)
  const task = slug(taskValue)
  const file = stateFile(repo, config, task)
  if (!fs.existsSync(file)) throw new Error(`Unknown task ${task}; run agent:init first`)
  return { repo, config, task, file, state: readJson(file) }
}

/**
 * Exclusive per-task lock.
 *
 * Held by `run`, `approve` and `reject`. Approve and reject previously did not
 * take it, so a human decision could race an active run — finalising a
 * candidate while the builder was still producing the next one.
 */
function acquireLock(runtime) {
  const file = path.join(runtime, 'lock')
  fs.mkdirSync(runtime, { recursive: true })
  let handle
  try {
    handle = fs.openSync(file, 'wx')
    fs.writeFileSync(handle, `${process.pid} ${new Date().toISOString()}${os.EOL}`)
  } catch {
    throw new Error(`Task is already locked: ${file} (another run, approve or reject is active)`)
  }
  return () => {
    fs.closeSync(handle)
    fs.rmSync(file)
  }
}

function remainingMs(state) {
  return new Date(state.deadlineAt).getTime() - Date.now()
}

/**
 * Time a single model turn may take: the per-turn cap or what is left, whichever
 * is smaller, with the tree wrapper's grace reserved inside the remainder.
 */
function turnTimeout(state, config) {
  const cap = (config.turnMinutes ?? 45) * 60_000
  return budgetedTimeout(remainingMs(state), cap)
}

/**
 * Stop before a model turn that cannot fit in the remaining budget. A turn
 * given a clamped 1ms timeout would still be granted the wrapper's grace and
 * could overrun the task deadline by up to that grace; gates already skip in
 * this situation, and turns must too.
 */
function turnFits(file, state, config, role) {
  if (turnTimeout(state, config) > 0) return true
  updateState(file, state, {
    phase: 'human_required',
    humanGateReasons: [...state.humanGateReasons, `time cap reached before ${role} turn`],
  })
  return false
}

/**
 * Validate a review against the JSON schema, then apply the cross-field rules
 * the schema cannot express.
 */
function validateReview(review, schema) {
  assertMatchesSchema(review, schema, 'Reviewer output')
  for (const finding of review.findings) {
    const critical = ['P0', 'P1'].includes(finding.severity)
    if (critical && finding.disposition === 'open' && review.verdict === 'accepted') {
      throw new Error('Accepted review cannot contain an open P0/P1')
    }
    if (critical && finding.evidence === 'inferred' && !finding.runtime_check) {
      throw new Error('Inferred P0/P1 requires runtime_check')
    }
  }
  return review
}

function createWorktree(repo, worktree, branchName, baseline) {
  if (fs.existsSync(worktree)) throw new Error(`Worktree path already exists: ${worktree}`)
  fs.mkdirSync(path.dirname(worktree), { recursive: true })
  git(repo, ['worktree', 'add', '-b', branchName, worktree, baseline])
}

/** Best-effort removal of a lane created during a failed init. Errors are reported, not thrown. */
function removeWorktree(repo, worktree, branchName) {
  const problems = []
  try {
    git(repo, ['worktree', 'remove', '--force', worktree], { echo: false })
  } catch (error) {
    problems.push(`worktree ${worktree}: ${error.message}`)
  }
  try {
    git(repo, ['branch', '-D', branchName], { echo: false })
  } catch (error) {
    problems.push(`branch ${branchName}: ${error.message}`)
  }
  return problems
}

function doctor() {
  const repo = repoRoot(defaultRepo)
  const configFile = path.join(repo, '.agent-loop', 'config.json')
  const schemaFile = path.join(repo, 'docs', 'agent-loop', 'schemas', 'review.schema.json')
  const checks = [
    ['git', commandExists('git')],
    ['node', commandExists('node')],
    ['npm', commandExists('npm')],
    ['python', commandExists('python')],
    ['black', commandExists('python', ['-m', 'black', '--version'])],
    ['flake8', commandExists('python', ['-m', 'flake8', '--version'])],
    ['claude', commandExists('claude', ['--version'])],
    ['codex', commandExists('codex', ['--version'])],
    ['config', fs.existsSync(configFile)],
    ['review schema', fs.existsSync(schemaFile)],
  ]
  for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  const dirty = statusPaths(repo)
  if (dirty.length) console.log(`WARN  owner checkout has uncommitted paths: ${dirty.join(', ')}`)
  if (fakeAgentsDirectory()) {
    console.log(
      `WARN  AGENT_LOOP_FAKE_AGENTS is set (${fakeAgentsDirectory()}); real CLIs will NOT be used`
    )
  }
  if (process.env.AGENT_LOOP_REPO) {
    console.log(
      `WARN  AGENT_LOOP_REPO is set (${process.env.AGENT_LOOP_REPO}); operating on that repository, not this one`
    )
  }
  console.log(
    'NOTE  the loop has no token or monetary cap; only round, turn and task time caps are enforced'
  )
  console.log(
    'NOTE  doctor checks presence and version only; a CLI release that changes sandbox or permission semantics needs a manual review of agents.mjs'
  )
  console.log(
    'NOTE  gates and bootstrap run candidate code outside the builder sandbox with an allowlisted environment; use a container for unattended runs'
  )
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1
}

function init(flags) {
  const repo = repoRoot(defaultRepo)
  const config = loadConfig(repo)
  const task = slug(flags.task)

  const builder = flags.builder ?? config.defaultBuilder ?? 'codex'
  if (!['claude', 'codex'].includes(builder)) throw new Error('Builder must be claude or codex')
  const builderSandboxed = builder === 'codex'
  if (!builderSandboxed && flags[CLAUDE_BUILDER_ACKNOWLEDGEMENT] !== true) {
    throw new Error(
      `--builder claude runs without an OS/network sandbox; its tool allowlist is not a security boundary. ` +
        `Pass --${CLAUDE_BUILDER_ACKNOWLEDGEMENT} to proceed deliberately, or use --builder codex (the default).`
    )
  }

  if (typeof flags.request !== 'string' || flags.request.trim().length < 10) {
    throw new Error('--request must describe the desired change')
  }
  const target = pathsFor(repo, config, task)
  const file = stateFile(repo, config, task)
  if (fs.existsSync(file)) throw new Error(`Task already exists: ${task}`)
  const baseline = head(repo)
  const branches = {
    coordinator: `${config.branchPrefix}/${task}/coordinator`,
    claude: `${config.branchPrefix}/${task}/claude`,
    codex: `${config.branchPrefix}/${task}/codex`,
  }
  const worktrees = {
    coordinator: path.join(target.worktrees, 'coordinator'),
    claude: path.join(target.worktrees, 'claude'),
    codex: path.join(target.worktrees, 'codex'),
  }
  for (const worktree of Object.values(worktrees)) {
    if (!isInside(path.join(path.dirname(repo), config.worktreeRoot), worktree)) {
      throw new Error(`Unsafe worktree target: ${worktree}`)
    }
  }

  // Create lanes, and if any step fails, remove every lane created so far.
  // A half-initialised task previously left branches and worktrees behind
  // with no state record to explain them.
  const created = []
  try {
    for (const lane of ['coordinator', 'claude', 'codex']) {
      createWorktree(repo, worktrees[lane], branches[lane], baseline)
      created.push(lane)
    }
    writeJson(
      file,
      initialState({
        task,
        flags,
        builder,
        builderSandboxed,
        baseline,
        branches,
        worktrees,
        config,
      })
    )
  } catch (error) {
    const problems = created.flatMap((lane) =>
      removeWorktree(repo, worktrees[lane], branches[lane])
    )
    const cleanup = problems.length
      ? ` Cleanup problems: ${problems.join('; ')}`
      : ' Partial lanes were removed.'
    throw new Error(`init failed: ${error.message}.${cleanup}`)
  }

  console.log(`Created ${task} from ${baseline}`)
  console.log(`Coordinator: ${worktrees.coordinator}`)
  console.log(
    `Builder: ${builder}${builderSandboxed ? '' : ' (UNSANDBOXED — acknowledged)'} in ${worktrees[builder]}`
  )
}

/**
 * The state record is written inside the same rollback as lane creation: a
 * failed write (permissions, disk, a locked runtime directory) would
 * otherwise leave three worktrees with no record — exactly the orphan the
 * rollback exists to prevent.
 */
function initialState({
  task,
  flags,
  builder,
  builderSandboxed,
  baseline,
  branches,
  worktrees,
  config,
}) {
  const now = new Date().toISOString()
  return {
    version: 2,
    task,
    request: flags.request.trim(),
    builder,
    builderSandboxed,
    reviewer: builder === 'claude' ? 'codex' : 'claude',
    baseline,
    candidate: null,
    phase: 'ready',
    bootstrapped: false,
    round: 0,
    disputes: 0,
    createdAt: now,
    deadlineAt: new Date(Date.now() + config.maxMinutes * 60_000).toISOString(),
    branches,
    worktrees,
    review: null,
    gates: null,
    humanGateReasons: [],
  }
}

function updateState(file, state, values) {
  Object.assign(state, values, { updatedAt: new Date().toISOString() })
  writeJson(file, state)
}

function finalizeAccepted({ repo, task, file, state, humanApproval = null }) {
  const builderWorktree = state.worktrees[state.builder]
  ensureClean(builderWorktree)
  if (!state.candidate || !state.gates?.passed || !state.review) {
    throw new Error('Task has no fully tested and reviewed candidate to accept')
  }
  const unresolvedCritical = state.review.findings.filter(
    (finding) => ['P0', 'P1'].includes(finding.severity) && finding.disposition === 'open'
  )
  if (unresolvedCritical.length) {
    throw new Error('Human approval cannot bypass an open P0/P1 finding; revise the candidate')
  }

  const claimFiles = writeClaims(
    builderWorktree,
    task,
    state.builder,
    state.reviewer,
    state.candidate,
    state.review.findings
  )
  const report = generateClaimsMarkdown(builderWorktree)
  const decisionDirectory = path.join(builderWorktree, 'docs', 'agent-loop', 'decisions')
  fs.mkdirSync(decisionDirectory, { recursive: true })
  const decisionFile = path.join(decisionDirectory, `${task}.json`)
  writeJson(decisionFile, {
    schema_version: 1,
    task,
    request: state.request,
    builder: state.builder,
    builder_sandboxed: state.builderSandboxed,
    reviewer: state.reviewer,
    baseline_sha: state.baseline,
    accepted_sha: state.candidate,
    rounds: state.round,
    gates: state.gates.results,
    verdict: state.review.verdict,
    summary: state.review.summary,
    ...(humanApproval ? { human_approval: humanApproval } : {}),
    accepted_at: new Date().toISOString(),
  })
  loadClaims(builderWorktree)
  stagePaths(
    builderWorktree,
    [...claimFiles, report, decisionFile].map((value) => path.relative(builderWorktree, value))
  )
  const acceptedHead = commit(builderWorktree, `docs(agent-${task}): record accepted review`)
  ensureClean(state.worktrees.coordinator)
  git(state.worktrees.coordinator, ['merge', '--ff-only', acceptedHead])
  updateState(file, state, { phase: 'complete', acceptedHead })
  console.log(`Accepted ${task} at ${acceptedHead}`)
  console.log(`Review in ${state.worktrees.coordinator}`)
}

function ensureBootstrapped({ repo, config, task, file, state }) {
  if (state.bootstrapped) return
  const builderWorktree = state.worktrees[state.builder]
  updateState(file, state, { phase: 'bootstrapping' })
  const outcome = bootstrapWorktree(
    builderWorktree,
    config.bootstrap,
    path.join(pathsFor(repo, config, task).runtime, 'bootstrap'),
    { deadlineAt: state.deadlineAt }
  )
  updateState(file, state, { bootstrap: outcome })
  if (!outcome.ok) {
    updateState(file, state, { phase: 'bootstrap_failed' })
    throw new Error(
      'Dependency bootstrap failed; inspect the bootstrap logs in the runtime directory'
    )
  }
  // Bootstrap must leave the lane clean: node_modules and .venv are ignored,
  // and anything else it produced would be staged into the first candidate.
  ensureClean(builderWorktree)
  updateState(file, state, { bootstrapped: true, phase: 'ready' })
}

function executeTask(flags) {
  const context = loadContext(flags.task)
  const { repo, config, task, file, state } = context
  if (state.phase === 'complete') throw new Error(`${task} is already complete`)
  if (state.phase === 'rejected') throw new Error(`${task} was rejected; start a new task`)
  if (remainingMs(state) <= 0) {
    updateState(file, state, { phase: 'human_required', humanGateReasons: ['time cap reached'] })
    throw new Error('Task reached its time cap')
  }
  const reviewSchema = readJson(
    path.join(repo, 'docs', 'agent-loop', 'schemas', 'review.schema.json')
  )
  const release = acquireLock(pathsFor(repo, config, task).runtime)

  try {
    ensureBootstrapped(context)

    while (state.round < config.maxRounds) {
      // The cap is checked per round, not only at start: a slow round must
      // not be followed by another that begins after the deadline.
      if (remainingMs(state) <= 0) {
        updateState(file, state, {
          phase: 'human_required',
          humanGateReasons: [...state.humanGateReasons, 'time cap reached between rounds'],
        })
        return
      }

      state.round += 1
      const round = state.round
      const builderWorktree = state.worktrees[state.builder]
      ensureClean(builderWorktree)
      if (branch(builderWorktree) !== state.branches[state.builder]) {
        throw new Error('Builder worktree is on the wrong branch')
      }

      if (!turnFits(file, state, config, 'builder')) return
      updateState(file, state, { phase: 'building' })
      const previousFeedback = state.review?.next_instruction ?? 'None — this is the first round.'
      const builderReport = runBuilder({
        model: state.builder,
        repo,
        worktree: builderWorktree,
        runtime: pathsFor(repo, config, task).runtime,
        timeout: turnTimeout(state, config),
        values: {
          TASK: task,
          BASELINE_SHA: state.candidate ?? state.baseline,
          REQUEST: state.request,
          REVIEW_FEEDBACK: previousFeedback,
          ROUND: round,
        },
      })

      const changedPaths = statusPaths(builderWorktree)
      if (changedPaths.length === 0) throw new Error('Builder made no changes')
      const policy = assertSafeBuilderPaths(changedPaths, config)
      stagePaths(builderWorktree, changedPaths)
      const candidate = commit(builderWorktree, `feat(agent-${task}): candidate round ${round}`)
      updateState(file, state, {
        candidate,
        phase: 'testing',
        humanGateReasons: policy.humanGatePaths.map((value) => `human-gated path: ${value}`),
      })

      const interpreter = venvPython(builderWorktree)
      const gateResult = runGates(
        builderWorktree,
        config.gates,
        path.join(pathsFor(repo, config, task).runtime, `round-${round}-gates`),
        {
          deadlineAt: state.deadlineAt,
          pythonExecutable: fs.existsSync(interpreter) ? interpreter : undefined,
        }
      )
      updateState(file, state, { gates: gateResult })
      if (!gateResult.passed) {
        updateState(file, state, { phase: 'gates_failed' })
        throw new Error(`A deterministic gate failed; inspect round-${round}-gates`)
      }

      if (!turnFits(file, state, config, 'reviewer')) return
      updateState(file, state, { phase: 'reviewing' })
      const review = validateReview(
        runReviewer({
          model: state.reviewer,
          repo,
          worktree: builderWorktree,
          runtime: pathsFor(repo, config, task).runtime,
          timeout: turnTimeout(state, config),
          values: {
            TASK: task,
            CANDIDATE_SHA: candidate,
            REQUEST: state.request,
            BUILDER_REPORT: builderReport,
            ROUND: round,
          },
        }),
        reviewSchema
      )

      // Every citation must resolve at the candidate before the review is
      // recorded or fed back — a hallucinated path would otherwise cost the
      // builder a round and leave an unanchored finding on file.
      const citationErrors = validateCitations(builderWorktree, candidate, review.findings)
      if (citationErrors.length) {
        updateState(file, state, { phase: 'review_invalid', reviewErrors: citationErrors })
        throw new Error(
          `Reviewer citations do not resolve at ${candidate.slice(0, 12)}:\n  ${citationErrors.join('\n  ')}`
        )
      }
      updateState(file, state, { review, reviewErrors: [] })

      // The reviewer's turn was bounded, but claim generation, the metadata
      // commit and promotion were not; do not begin them past the deadline.
      if (remainingMs(state) <= 0) {
        updateState(file, state, {
          phase: 'human_required',
          humanGateReasons: [...state.humanGateReasons, 'time cap reached after review'],
        })
        return
      }

      if (review.verdict === 'changes_requested') {
        state.disputes += 1
        if (state.disputes >= 2) {
          updateState(file, state, {
            phase: 'human_required',
            humanGateReasons: [...state.humanGateReasons, 'same task disputed twice'],
          })
          return
        }
        updateState(file, state, { phase: 'revision_requested' })
        continue
      }

      if (review.verdict === 'human_required' || state.humanGateReasons.length) {
        updateState(file, state, {
          phase: 'human_required',
          humanGateReasons: [
            ...state.humanGateReasons,
            ...(review.verdict === 'human_required' ? [review.summary] : []),
          ],
        })
        return
      }

      finalizeAccepted({ repo, task, file, state })
      return
    }

    updateState(file, state, {
      phase: 'human_required',
      humanGateReasons: [...state.humanGateReasons, 'round cap reached'],
    })
  } finally {
    release()
  }
}

function status(flags) {
  const { state } = loadContext(flags.task)
  console.log(JSON.stringify(state, null, 2))
}

function requireNote(flags) {
  if (typeof flags.note !== 'string' || flags.note.trim().length < 10) {
    throw new Error('--note must record the owner decision and rationale')
  }
  return flags.note.trim()
}

function approve(flags) {
  const context = loadContext(flags.task)
  const { repo, config, task, file, state } = context
  if (state.phase !== 'human_required') throw new Error('Task is not waiting for human approval')
  const note = requireNote(flags)
  const release = acquireLock(pathsFor(repo, config, task).runtime)
  try {
    finalizeAccepted({
      repo,
      task,
      file,
      state,
      humanApproval: { decision: 'approved', note, at: new Date().toISOString() },
    })
  } finally {
    release()
  }
}

function reject(flags) {
  const context = loadContext(flags.task)
  const { repo, config, task, file, state } = context
  if (state.phase !== 'human_required') throw new Error('Task is not waiting for a human decision')
  const note = requireNote(flags)
  const release = acquireLock(pathsFor(repo, config, task).runtime)
  try {
    updateState(file, state, {
      phase: 'rejected',
      humanDecision: { decision: 'rejected', note, at: new Date().toISOString() },
    })
    console.log(`Rejected ${state.task}; branches and evidence were preserved`)
  } finally {
    release()
  }
}

function lintClaims() {
  const repo = repoRoot(defaultRepo)
  const claims = loadClaims(repo)
  console.log(`Validated ${claims.length} claim record(s)`)
}

function report() {
  const repo = repoRoot(defaultRepo)
  const output = generateClaimsMarkdown(repo)
  console.log(`Generated ${path.relative(repo, output)}`)
}

function gates() {
  const repo = repoRoot(defaultRepo)
  const config = loadConfig(repo)
  const result = runGates(
    repo,
    config.gates,
    path.join(repo, '.agent-loop', 'runtime', 'manual-gates')
  )
  console.log(JSON.stringify(result, null, 2))
  if (!result.passed) process.exitCode = 1
}

function help() {
  console.log(`PropScout Claude/Codex coordinator

Commands:
  doctor
  init --task <slug> [--builder <codex|claude>] --request <text>
       (codex is the default; claude requires --${CLAUDE_BUILDER_ACKNOWLEDGEMENT})
  run --task <slug>
  status --task <slug>
  approve --task <slug> --note <decision rationale>
  reject --task <slug> --note <decision rationale>
  lint-claims
  report
  gates`)
}

function main() {
  const { command, flags } = parseArgs(process.argv.slice(2))
  // Checked before any repository or Git access: with AGENT_LOOP_REPO set,
  // even `doctor`'s `git status` would run against the redirected repository
  // and honour its configuration (`core.fsmonitor` and the like).
  const seams = activeTestSeams()
  if (seams.length && command !== 'help' && flags[TEST_SEAMS_FLAG] !== true) {
    const message =
      `${seams.join(' and ')} ${seams.length > 1 ? 'are' : 'is'} set; these are test-only seams. ` +
      `Unset them for a real run, or pass --${TEST_SEAMS_FLAG} from a test harness.`
    if (command === 'doctor') {
      console.log(`FAIL  ${message}`)
      process.exitCode = 1
      return
    }
    throw new Error(message)
  }
  if (command === 'doctor') doctor()
  else if (command === 'init') init(flags)
  else if (command === 'run') executeTask(flags)
  else if (command === 'status') status(flags)
  else if (command === 'approve') approve(flags)
  else if (command === 'reject') reject(flags)
  else if (command === 'lint-claims') lintClaims()
  else if (command === 'report') report()
  else if (command === 'gates') gates()
  else help()
}

try {
  main()
} catch (error) {
  console.error(`agent-loop: ${error.message}`)
  process.exitCode = 1
}
