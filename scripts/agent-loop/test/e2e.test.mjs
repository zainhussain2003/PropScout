/**
 * End-to-end: drives the real coordinator through init → build → candidate
 * commit → gates → review → promotion, against a disposable repository with
 * fake agents. This is the test the loop did not have when it was declared
 * verified; every prior check exercised a library function or `init` alone.
 *
 * Scenarios:
 *   1. changes_requested on round 1, accepted on round 2 → coordinator branch
 *      fast-forwards to the accepted commit; claims and decision recorded.
 *   2. human_required → reject records the decision and preserves evidence.
 *   3. human_required → approve promotes.
 *   4. --builder claude refused without the acknowledgement flag.
 *   5. A partially failed init removes the lanes it created.
 *   6. A reviewer citation that does not resolve at the candidate is rejected.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { git } from '../lib/git.mjs'
import { run } from '../lib/process.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const cli = path.join(here, '..', 'cli.mjs')
const realSchema = path.join(
  here,
  '..',
  '..',
  '..',
  'docs',
  'agent-loop',
  'schemas',
  'review.schema.json'
)
const node = process.execPath

/** A minimal PropScout-shaped repository the coordinator can operate on. */
function fixtureRepo({ gatePasses = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-e2e-'))
  const repo = path.join(root, 'repo')
  fs.mkdirSync(repo)
  git(repo, ['init', '-q', '-b', 'master'], { echo: false })
  git(repo, ['config', 'user.email', 'e2e@example.com'], { echo: false })
  git(repo, ['config', 'user.name', 'E2E'], { echo: false })

  const write = (relative, content) => {
    const file = path.join(repo, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, content)
  }

  write('.gitignore', 'node_modules/\n.venv/\n')
  write('src/existing.txt', 'line one\nline two\n')
  write(
    '.agent-loop/config.json',
    JSON.stringify(
      {
        version: 2,
        defaultBuilder: 'codex',
        maxRounds: 4,
        maxMinutes: 10,
        turnMinutes: 5,
        branchPrefix: 'agent',
        worktreeRoot: '.wt',
        runtimeRoot: '.rt',
        protectedPaths: ['.agent-loop/', 'AGENTS.md'],
        humanGatePaths: ['supabase/migrations/'],
        forbiddenPathFragments: ['node_modules/'],
        bootstrap: { steps: [] },
        gates: [
          {
            name: 'trivial',
            command: node,
            args: [
              '-e',
              gatePasses ? 'process.exit(0)' : 'console.log("gate says no"); process.exit(1)',
            ],
          },
        ],
      },
      null,
      2
    )
  )
  write(
    'docs/agent-loop/prompts/build.md',
    'Build {{TASK}} at {{BASELINE_SHA}} round {{ROUND}}.\n{{REVIEW_FEEDBACK}}\n'
  )
  write('docs/agent-loop/prompts/review.md', 'Review {{CANDIDATE_SHA}} round {{ROUND}}.\n')
  write('docs/agent-loop/schemas/review.schema.json', fs.readFileSync(realSchema, 'utf8'))
  git(repo, ['add', '--', '.'], { echo: false })
  git(repo, ['commit', '-q', '-m', 'baseline'], { echo: false })
  return { root, repo }
}

/** Fake agents. The reviewer's behaviour is chosen per test via a JSON plan file. */
function fakeAgents(root, plan) {
  const directory = path.join(root, 'fakes')
  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(path.join(directory, 'plan.json'), JSON.stringify(plan))
  fs.writeFileSync(
    path.join(directory, 'builder.mjs'),
    `import fs from 'node:fs'
const round = process.env.AGENT_LOOP_ROUND
fs.mkdirSync('src', { recursive: true })
fs.writeFileSync('src/feature.txt', 'feature line 1\\nfeature line 2 (round ' + round + ')\\n')
process.stdout.write('Builder round ' + round + ': wrote src/feature.txt')
`
  )
  fs.writeFileSync(
    path.join(directory, 'reviewer.mjs'),
    `import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const plan = JSON.parse(fs.readFileSync(path.join(here, 'plan.json'), 'utf8'))
const round = Number(process.env.AGENT_LOOP_ROUND)
const step = plan[round - 1] ?? plan[plan.length - 1]
process.stdout.write(JSON.stringify(step))
`
  )
  return directory
}

function finding(overrides = {}) {
  return {
    severity: 'P2',
    evidence: 'confirmed',
    claim: 'The feature file is written as requested.',
    disposition: 'verified',
    citations: [{ path: 'src/feature.txt', start_line: 1, end_line: 2 }],
    ...overrides,
  }
}

function coordinator(repo, fakes, args, extraEnv = {}) {
  return run(node, [cli, ...args, '--allow-test-seams'], {
    cwd: repo,
    echo: false,
    env: { AGENT_LOOP_REPO: repo, AGENT_LOOP_FAKE_AGENTS: fakes, ...extraEnv },
  })
}

function readState(root, task) {
  return JSON.parse(fs.readFileSync(path.join(root, '.rt', task, 'state.json'), 'utf8'))
}

test('changes_requested then accepted: candidate is promoted to the coordinator branch', () => {
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [
    {
      verdict: 'changes_requested',
      summary: 'Needs a second line.',
      next_instruction: 'Add a second line to src/feature.txt.',
      findings: [
        finding({
          severity: 'P1',
          disposition: 'open',
          claim: 'Second line is missing from the feature file.',
        }),
      ],
    },
    { verdict: 'accepted', summary: 'Looks good.', next_instruction: '', findings: [finding()] },
  ])

  coordinator(repo, fakes, [
    'init',
    '--task',
    'e2e-accept',
    '--request',
    'Write the feature file with two lines',
  ])
  const initial = readState(root, 'e2e-accept')
  assert.equal(initial.builder, 'codex', 'default builder is codex')
  assert.equal(initial.builderSandboxed, true)

  coordinator(repo, fakes, ['run', '--task', 'e2e-accept'])
  const state = readState(root, 'e2e-accept')

  assert.equal(state.phase, 'complete')
  assert.equal(state.round, 2, 'one revision round then acceptance')
  assert.equal(state.bootstrapped, true)
  assert.equal(state.gates.passed, true)
  assert.equal(state.review.verdict, 'accepted')

  const coordinatorHead = git(state.worktrees.coordinator, ['rev-parse', 'HEAD'], { echo: false })
  assert.equal(
    coordinatorHead,
    state.acceptedHead,
    'coordinator branch fast-forwarded to the accepted commit'
  )
  assert.ok(git(repo, ['branch', '--list', 'agent/e2e-accept/coordinator'], { echo: false }))

  const promoted = git(
    state.worktrees.coordinator,
    ['show', `${state.acceptedHead}:src/feature.txt`],
    { echo: false }
  )
  assert.match(promoted, /round 2/)
  assert.ok(
    fs.existsSync(
      path.join(state.worktrees.coordinator, 'docs', 'agent-loop', 'decisions', 'e2e-accept.json')
    )
  )
  assert.ok(
    fs.existsSync(path.join(state.worktrees.coordinator, 'docs', 'agent-loop', 'CLAIMS.md'))
  )
  assert.ok(!fs.existsSync(path.join(root, '.rt', 'e2e-accept', 'lock')), 'lock released')
})

test('human_required then reject: decision recorded, nothing promoted, evidence kept', () => {
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [
    {
      verdict: 'human_required',
      summary: 'Touches product policy.',
      next_instruction: '',
      findings: [finding()],
    },
  ])
  coordinator(repo, fakes, [
    'init',
    '--task',
    'e2e-reject',
    '--request',
    'Something needing a human decision',
  ])
  coordinator(repo, fakes, ['run', '--task', 'e2e-reject'])
  assert.equal(readState(root, 'e2e-reject').phase, 'human_required')

  assert.throws(
    () => coordinator(repo, fakes, ['reject', '--task', 'e2e-reject', '--note', 'no']),
    /--note must record/,
    'a rejection needs a real rationale'
  )
  coordinator(repo, fakes, [
    'reject',
    '--task',
    'e2e-reject',
    '--note',
    'Rejected: conflicts with a documented decision',
  ])
  const state = readState(root, 'e2e-reject')
  assert.equal(state.phase, 'rejected')
  assert.equal(state.humanDecision.decision, 'rejected')
  assert.equal(state.acceptedHead, undefined)
  const coordinatorHead = git(state.worktrees.coordinator, ['rev-parse', 'HEAD'], { echo: false })
  assert.equal(coordinatorHead, state.baseline, 'coordinator branch untouched')
  assert.ok(fs.existsSync(state.worktrees[state.builder]), 'builder lane preserved for inspection')
  assert.throws(() => coordinator(repo, fakes, ['run', '--task', 'e2e-reject']), /was rejected/)
})

test('human_required then approve: promotes with the human decision recorded', () => {
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [
    {
      verdict: 'human_required',
      summary: 'Needs owner sign-off.',
      next_instruction: '',
      findings: [finding()],
    },
  ])
  coordinator(repo, fakes, [
    'init',
    '--task',
    'e2e-approve',
    '--request',
    'Something needing approval',
  ])
  coordinator(repo, fakes, ['run', '--task', 'e2e-approve'])
  coordinator(repo, fakes, [
    'approve',
    '--task',
    'e2e-approve',
    '--note',
    'Approved after reviewing the candidate',
  ])
  const state = readState(root, 'e2e-approve')
  assert.equal(state.phase, 'complete')
  const decision = JSON.parse(
    fs.readFileSync(
      path.join(state.worktrees.coordinator, 'docs', 'agent-loop', 'decisions', 'e2e-approve.json'),
      'utf8'
    )
  )
  assert.equal(decision.human_approval.decision, 'approved')
  assert.equal(decision.builder_sandboxed, true)
})

test('an open P1 blocks approval even with a human note', () => {
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [
    {
      verdict: 'human_required',
      summary: 'Unresolved.',
      next_instruction: '',
      findings: [
        finding({
          severity: 'P1',
          disposition: 'open',
          claim: 'A critical defect remains open here.',
        }),
      ],
    },
  ])
  coordinator(repo, fakes, [
    'init',
    '--task',
    'e2e-block',
    '--request',
    'Something with an open P1',
  ])
  coordinator(repo, fakes, ['run', '--task', 'e2e-block'])
  assert.throws(
    () =>
      coordinator(repo, fakes, [
        'approve',
        '--task',
        'e2e-block',
        '--note',
        'Trying to force it through anyway',
      ]),
    /cannot bypass an open P0\/P1/
  )
})

test('--builder claude is refused without the explicit acknowledgement', () => {
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [])
  assert.throws(
    () =>
      coordinator(repo, fakes, [
        'init',
        '--task',
        'e2e-claude',
        '--builder',
        'claude',
        '--request',
        'Anything at all here',
      ]),
    /not a security boundary/
  )
  assert.ok(
    !fs.existsSync(path.join(root, '.rt', 'e2e-claude')),
    'no state written for the refused task'
  )
  coordinator(repo, fakes, [
    'init',
    '--task',
    'e2e-claude',
    '--builder',
    'claude',
    '--request',
    'Anything at all here',
    '--acknowledge-unsandboxed-claude-builder',
  ])
  const state = readState(root, 'e2e-claude')
  assert.equal(state.builder, 'claude')
  assert.equal(state.builderSandboxed, false, 'the unsandboxed choice is recorded in state')
})

test('a partially failed init removes the lanes it had created', () => {
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [])
  // Pre-occupy the third lane's path so the third worktree creation fails.
  const codexLane = path.join(root, '.wt', 'e2e-partial', 'codex')
  fs.mkdirSync(codexLane, { recursive: true })
  assert.throws(
    () =>
      coordinator(repo, fakes, [
        'init',
        '--task',
        'e2e-partial',
        '--request',
        'Init that will fail part way',
      ]),
    /init failed/
  )
  const branches = git(repo, ['branch', '--list', 'agent/e2e-partial/*'], { echo: false })
  assert.equal(branches, '', 'no orphaned branches')
  assert.ok(
    !fs.existsSync(path.join(root, '.wt', 'e2e-partial', 'coordinator')),
    'coordinator lane removed'
  )
  assert.ok(!fs.existsSync(path.join(root, '.wt', 'e2e-partial', 'claude')), 'claude lane removed')
  assert.ok(
    !fs.existsSync(path.join(root, '.rt', 'e2e-partial', 'state.json')),
    'no state for a failed init'
  )
})

test('an init whose state write fails removes the lanes it had created', () => {
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [])
  // Make the runtime directory for this task a regular file, so mkdir for
  // state.json fails after all three worktrees exist.
  fs.mkdirSync(path.join(root, '.rt'), { recursive: true })
  fs.writeFileSync(path.join(root, '.rt', 'e2e-statefail'), 'not a directory')
  assert.throws(
    () =>
      coordinator(repo, fakes, [
        'init',
        '--task',
        'e2e-statefail',
        '--request',
        'Init whose state write fails',
      ]),
    /init failed/
  )
  const branches = git(repo, ['branch', '--list', 'agent/e2e-statefail/*'], { echo: false })
  assert.equal(branches, '', 'no orphaned branches')
  for (const lane of ['coordinator', 'claude', 'codex']) {
    assert.ok(!fs.existsSync(path.join(root, '.wt', 'e2e-statefail', lane)), `${lane} lane removed`)
  }
})

test('the test-only environment seams are refused without --allow-test-seams', () => {
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [])
  let caught
  try {
    // Same env the harness uses, but without the flag the harness adds.
    run(node, [cli, 'init', '--task', 'e2e-seams', '--request', 'Should be refused'], {
      cwd: repo,
      echo: false,
      env: { AGENT_LOOP_REPO: repo, AGENT_LOOP_FAKE_AGENTS: fakes },
    })
  } catch (error) {
    caught = error
  }
  assert.ok(caught, 'expected the coordinator to refuse')
  assert.match(caught.stderr, /AGENT_LOOP_REPO and AGENT_LOOP_FAKE_AGENTS are set/)
  assert.ok(!fs.existsSync(path.join(root, '.wt', 'e2e-seams')), 'nothing was created')
})

test('a task idle for longer than the cap still runs: the cap is run time, not calendar', () => {
  // The first observed real run expired at round 0 because the deadline was
  // fixed at init and the operator spent three hours fixing bootstrap.
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [
    { verdict: 'accepted', summary: 'Fine.', next_instruction: '', findings: [finding()] },
  ])
  coordinator(repo, fakes, ['init', '--task', 'e2e-idle', '--request', 'Idle before first run'])
  const file = path.join(root, '.rt', 'e2e-idle', 'state.json')
  const state = JSON.parse(fs.readFileSync(file, 'utf8'))
  // Backdate creation by a day; no run time has been charged.
  state.createdAt = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
  fs.writeFileSync(file, JSON.stringify(state))
  coordinator(repo, fakes, ['run', '--task', 'e2e-idle'])
  const after = readState(root, 'e2e-idle')
  assert.equal(after.phase, 'complete')
  assert.ok(after.elapsedRunMs > 0 && after.elapsedRunMs < 10 * 60_000, 'run time charged')
})

test('a model turn that cannot fit in the remaining budget is not started', () => {
  // Gates already skipped here; a turn was clamped to 1ms and granted the
  // wrapper's grace, overrunning the deadline. Now it stops for a human.
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [{ verdict: 'accepted', summary: 'unused', findings: [] }])
  coordinator(repo, fakes, ['init', '--task', 'e2e-nofit', '--request', 'Turn should not start'])
  const file = path.join(root, '.rt', 'e2e-nofit', 'state.json')
  const state = JSON.parse(fs.readFileSync(file, 'utf8'))
  // Less than the grace remains: positive, so the round-level check passes.
  // The budget is run time, so spend all but 5s of it before this run.
  state.elapsedRunMs = 10 * 60_000 - 5_000
  fs.writeFileSync(file, JSON.stringify(state))
  coordinator(repo, fakes, ['run', '--task', 'e2e-nofit'])
  const after = readState(root, 'e2e-nofit')
  assert.equal(after.phase, 'human_required')
  assert.ok(
    after.humanGateReasons.some((r) => /before builder turn/.test(r)),
    after.humanGateReasons
  )
  assert.equal(after.candidate, null, 'no candidate was built')
  assert.equal(after.round, 1)
})

test('doctor refuses a redirected repository before touching it', () => {
  const { root, repo } = fixtureRepo()
  // A hostile AGENT_LOOP_REPO could carry git configuration that runs code
  // on `git status`; doctor must not consult it without the test flag.
  fs.writeFileSync(path.join(repo, '.git', 'touched'), '')
  git(repo, ['config', 'core.fsmonitor', 'this-would-run'], { echo: false })
  let caught
  try {
    run(node, [cli, 'doctor'], {
      cwd: root,
      echo: false,
      env: { AGENT_LOOP_REPO: repo },
    })
  } catch (error) {
    caught = error
  }
  assert.ok(caught, 'doctor should exit non-zero')
  assert.match(caught.stdout, /FAIL\s+AGENT_LOOP_REPO is set/)
  assert.doesNotMatch(caught.stdout, /PASS\s+git/, 'no checks ran')
})

test('a review citing a path that does not exist at the candidate is rejected', () => {
  const { root, repo } = fixtureRepo()
  const fakes = fakeAgents(root, [
    {
      verdict: 'accepted',
      summary: 'Fine.',
      next_instruction: '',
      findings: [
        finding({ citations: [{ path: 'src/imaginary.txt', start_line: 1, end_line: 1 }] }),
      ],
    },
  ])
  coordinator(repo, fakes, [
    'init',
    '--task',
    'e2e-cite',
    '--request',
    'Exercise citation validation',
  ])
  assert.throws(
    () => coordinator(repo, fakes, ['run', '--task', 'e2e-cite']),
    /citations do not resolve/
  )
  const state = readState(root, 'e2e-cite')
  assert.equal(state.phase, 'review_invalid')
  assert.match(state.reviewErrors[0], /src\/imaginary\.txt/)
  assert.ok(
    !fs.existsSync(path.join(root, '.rt', 'e2e-cite', 'lock')),
    'lock released after the failure'
  )
})

test('a failing gate stops the round with the failure captured in the log', () => {
  const { root, repo } = fixtureRepo({ gatePasses: false })
  const fakes = fakeAgents(root, [
    { verdict: 'accepted', summary: 'x', next_instruction: '', findings: [] },
  ])
  coordinator(repo, fakes, ['init', '--task', 'e2e-gate', '--request', 'Exercise a failing gate'])
  assert.throws(() => coordinator(repo, fakes, ['run', '--task', 'e2e-gate']), /gate failed/)
  const state = readState(root, 'e2e-gate')
  assert.equal(state.phase, 'gates_failed')
  const log = fs.readFileSync(
    path.join(root, '.rt', 'e2e-gate', 'round-1-gates', 'trivial.log'),
    'utf8'
  )
  assert.match(log, /gate says no/)
})
