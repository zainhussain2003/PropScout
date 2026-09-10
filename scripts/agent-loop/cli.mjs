#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { runBuilder, runReviewer } from './lib/agents.mjs'
import { generateClaimsMarkdown, loadClaims, writeClaims } from './lib/claims.mjs'
import { runGates } from './lib/gates.mjs'
import { branch, commit, ensureClean, git, head, repoRoot, stagePaths, statusPaths } from './lib/git.mjs'
import { assertSafeBuilderPaths, classifyPaths, isInside } from './lib/policy.mjs'
import { commandExists } from './lib/process.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultRepo = path.resolve(scriptDirectory, '..', '..')

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

function loadContext(taskValue) {
  const repo = repoRoot(defaultRepo)
  const config = readJson(path.join(repo, '.agent-loop', 'config.json'))
  const task = slug(taskValue)
  const file = stateFile(repo, config, task)
  if (!fs.existsSync(file)) throw new Error(`Unknown task ${task}; run agent:init first`)
  return { repo, config, task, file, state: readJson(file) }
}

function acquireLock(runtime) {
  const file = path.join(runtime, 'lock')
  fs.mkdirSync(runtime, { recursive: true })
  let handle
  try {
    handle = fs.openSync(file, 'wx')
    fs.writeFileSync(handle, `${process.pid} ${new Date().toISOString()}${os.EOL}`)
  } catch {
    throw new Error(`Task is already locked: ${file}`)
  }
  return () => {
    fs.closeSync(handle)
    fs.rmSync(file)
  }
}

function validateReview(review) {
  const verdicts = ['accepted', 'changes_requested', 'human_required']
  if (!review || !verdicts.includes(review.verdict)) throw new Error('Reviewer returned invalid verdict')
  if (typeof review.summary !== 'string' || typeof review.next_instruction !== 'string') {
    throw new Error('Reviewer returned invalid summary or next_instruction')
  }
  if (!Array.isArray(review.findings)) throw new Error('Reviewer findings must be an array')
  for (const finding of review.findings) {
    if (!['P0', 'P1', 'P2', 'P3'].includes(finding.severity)) throw new Error('Invalid severity')
    if (!['confirmed', 'inferred', 'unknown'].includes(finding.evidence)) throw new Error('Invalid evidence')
    if (!['open', 'verified', 'rejected', 'withdrawn'].includes(finding.disposition)) {
      throw new Error('Invalid finding disposition')
    }
    if (!Array.isArray(finding.citations) || finding.citations.length === 0) {
      throw new Error('Every review finding requires a citation')
    }
    if (['P0', 'P1'].includes(finding.severity) && finding.disposition === 'open' && review.verdict === 'accepted') {
      throw new Error('Accepted review cannot contain an open P0/P1')
    }
    if (['P0', 'P1'].includes(finding.severity) && finding.evidence === 'inferred' && !finding.runtime_check) {
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

function doctor() {
  const repo = repoRoot(defaultRepo)
  const configFile = path.join(repo, '.agent-loop', 'config.json')
  const schemaFile = path.join(repo, 'docs', 'agent-loop', 'schemas', 'review.schema.json')
  const checks = [
    ['git', commandExists('git')],
    ['node', commandExists('node')],
    ['npm', commandExists('npm')],
    ['python', commandExists('python')],
    ['claude', commandExists('claude', ['--version'])],
    ['codex', commandExists('codex', ['--version'])],
    ['config', fs.existsSync(configFile)],
    ['review schema', fs.existsSync(schemaFile)],
  ]
  for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  const dirty = statusPaths(repo)
  if (dirty.length) console.log(`WARN  owner checkout has uncommitted paths: ${dirty.join(', ')}`)
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1
}

function init(flags) {
  const repo = repoRoot(defaultRepo)
  const config = readJson(path.join(repo, '.agent-loop', 'config.json'))
  const task = slug(flags.task)
  const builder = flags.builder ?? 'claude'
  if (!['claude', 'codex'].includes(builder)) throw new Error('Builder must be claude or codex')
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

  createWorktree(repo, worktrees.coordinator, branches.coordinator, baseline)
  createWorktree(repo, worktrees.claude, branches.claude, baseline)
  createWorktree(repo, worktrees.codex, branches.codex, baseline)

  const now = new Date().toISOString()
  const state = {
    version: 1,
    task,
    request: flags.request.trim(),
    builder,
    reviewer: builder === 'claude' ? 'codex' : 'claude',
    baseline,
    candidate: null,
    phase: 'ready',
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
  writeJson(file, state)
  console.log(`Created ${task} from ${baseline}`)
  console.log(`Coordinator: ${worktrees.coordinator}`)
  console.log(`Builder: ${builder} in ${worktrees[builder]}`)
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
    (finding) => ['P0', 'P1'].includes(finding.severity) && finding.disposition === 'open',
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
    state.review.findings,
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
    [...claimFiles, report, decisionFile].map((value) => path.relative(builderWorktree, value)),
  )
  const acceptedHead = commit(builderWorktree, `docs(agent-${task}): record accepted review`)
  ensureClean(state.worktrees.coordinator)
  git(state.worktrees.coordinator, ['merge', '--ff-only', acceptedHead])
  updateState(file, state, { phase: 'complete', acceptedHead })
  console.log(`Accepted ${task} at ${acceptedHead}`)
  console.log(`Review in ${state.worktrees.coordinator}`)
}

function executeTask(flags) {
  const context = loadContext(flags.task)
  const { repo, config, task, file, state } = context
  if (state.phase === 'complete') throw new Error(`${task} is already complete`)
  if (new Date() >= new Date(state.deadlineAt)) {
    updateState(file, state, { phase: 'human_required', humanGateReasons: ['time cap reached'] })
    throw new Error('Task reached its time cap')
  }
  const release = acquireLock(pathsFor(repo, config, task).runtime)

  try {
    while (state.round < config.maxRounds) {
      state.round += 1
      const round = state.round
      const builderWorktree = state.worktrees[state.builder]
      ensureClean(builderWorktree)
      if (branch(builderWorktree) !== state.branches[state.builder]) {
        throw new Error('Builder worktree is on the wrong branch')
      }

      updateState(file, state, { phase: 'building' })
      const previousFeedback = state.review?.next_instruction ?? 'None — this is the first round.'
      const builderReport = runBuilder({
        model: state.builder,
        repo,
        worktree: builderWorktree,
        runtime: pathsFor(repo, config, task).runtime,
        timeout: Math.max(60_000, new Date(state.deadlineAt).getTime() - Date.now()),
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

      const gateResult = runGates(
        builderWorktree,
        config.gates,
        path.join(pathsFor(repo, config, task).runtime, `round-${round}-gates`),
      )
      updateState(file, state, { gates: gateResult })
      if (!gateResult.passed) {
        updateState(file, state, { phase: 'gates_failed' })
        throw new Error(`A deterministic gate failed; inspect round-${round}-gates`)
      }

      updateState(file, state, { phase: 'reviewing' })
      const review = validateReview(
        runReviewer({
          model: state.reviewer,
          repo,
          worktree: builderWorktree,
          runtime: pathsFor(repo, config, task).runtime,
          timeout: Math.max(60_000, new Date(state.deadlineAt).getTime() - Date.now()),
          values: {
            TASK: task,
            CANDIDATE_SHA: candidate,
            REQUEST: state.request,
            BUILDER_REPORT: builderReport,
            ROUND: round,
          },
        }),
      )
      updateState(file, state, { review })

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

function approve(flags) {
  const context = loadContext(flags.task)
  const { repo, task, file, state } = context
  if (state.phase !== 'human_required') throw new Error('Task is not waiting for human approval')
  if (typeof flags.note !== 'string' || flags.note.trim().length < 10) {
    throw new Error('--note must record the owner decision and rationale')
  }
  finalizeAccepted({
    repo,
    task,
    file,
    state,
    humanApproval: {
      decision: 'approved',
      note: flags.note.trim(),
      at: new Date().toISOString(),
    },
  })
}

function reject(flags) {
  const { file, state } = loadContext(flags.task)
  if (state.phase !== 'human_required') throw new Error('Task is not waiting for a human decision')
  if (typeof flags.note !== 'string' || flags.note.trim().length < 10) {
    throw new Error('--note must record the owner decision and rationale')
  }
  updateState(file, state, {
    phase: 'rejected',
    humanDecision: { decision: 'rejected', note: flags.note.trim(), at: new Date().toISOString() },
  })
  console.log(`Rejected ${state.task}; branches and evidence were preserved`)
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
  const config = readJson(path.join(repo, '.agent-loop', 'config.json'))
  const result = runGates(repo, config.gates, path.join(repo, '.agent-loop', 'runtime', 'manual-gates'))
  console.log(JSON.stringify(result, null, 2))
  if (!result.passed) process.exitCode = 1
}

function help() {
  console.log(`PropScout Claude/Codex coordinator

Commands:
  doctor
  init --task <slug> --builder <claude|codex> --request <text>
  run --task <slug>
  status --task <slug>
  approve --task <slug> --note <decision rationale>
  reject --task <slug> --note <decision rationale>
  lint-claims
  report
  gates`)
}

try {
  const { command, flags } = parseArgs(process.argv.slice(2))
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
} catch (error) {
  console.error(`agent-loop: ${error.message}`)
  process.exitCode = 1
}
