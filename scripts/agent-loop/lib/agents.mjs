import fs from 'node:fs'
import path from 'node:path'
import { run } from './process.mjs'

/**
 * Test seam. When `AGENT_LOOP_FAKE_AGENTS` names a directory, the builder and
 * reviewer are `node <dir>/builder.mjs` and `node <dir>/reviewer.mjs` instead
 * of the real CLIs. They receive the rendered prompt on stdin, the worktree as
 * cwd, and `AGENT_LOOP_ROUND` / `AGENT_LOOP_CANDIDATE_SHA` in the environment.
 *
 * This is what lets the end-to-end test drive a real init → build → commit →
 * gates → review → promote cycle deterministically. It is env-gated, `doctor`
 * reports it when set, and it must never be set for an unattended run.
 */
export function fakeAgentsDirectory() {
  const value = process.env.AGENT_LOOP_FAKE_AGENTS
  return value && value.trim() ? path.resolve(value) : null
}

function runFakeAgent(kind, { worktree, prompt, timeout, values }) {
  const script = path.join(fakeAgentsDirectory(), `${kind}.mjs`)
  if (!fs.existsSync(script)) throw new Error(`Fake ${kind} not found: ${script}`)
  return run(process.execPath, [script], {
    cwd: worktree,
    input: prompt,
    timeout,
    echo: false,
    env: {
      AGENT_LOOP_ROUND: String(values.ROUND),
      AGENT_LOOP_CANDIDATE_SHA: String(values.CANDIDATE_SHA ?? values.BASELINE_SHA ?? ''),
    },
  }).stdout
}

/**
 * Flags common to both Codex lanes.
 *
 * `codex exec` is non-interactive: a command the sandbox blocks fails rather
 * than prompting, so no approval flag exists or is needed. The operator's
 * ~/.codex/config.toml enables plugins (github, browser, computer-use) and
 * its execpolicy .rules could widen what may run; neither may reach a lane,
 * so the coordinator's flags are the whole policy. Auth still comes from
 * CODEX_HOME.
 *
 * On Windows, Codex's sandbox is off unless `windows.sandbox` is set — and
 * `--sandbox workspace-write` then silently degrades to read-only. Because
 * user config is ignored, the mode is passed here. `unelevated` (restricted
 * token + ACLs, no administrator setup) was verified on this project's
 * machine: writes outside the worktree and %TEMP% are denied, outbound
 * network is refused, reads are unrestricted (Codex's design). `elevated`
 * adds firewall rules and dedicated sandbox users but needs `codex sandbox
 * setup --elevated` from an administrator shell.
 */
export const CODEX_COMMON_FLAGS = [
  '--ephemeral',
  '--ignore-user-config',
  '--ignore-rules',
  ...(process.platform === 'win32' ? ['-c', 'windows.sandbox="unelevated"'] : []),
]

function render(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)),
    template
  )
}

function readPrompt(repo, name, values) {
  const template = fs.readFileSync(path.join(repo, 'docs', 'agent-loop', 'prompts', name), 'utf8')
  return render(template, values)
}

export function runBuilder({ model, repo, worktree, runtime, values, timeout }) {
  const prompt = readPrompt(repo, 'build.md', values)
  const outputFile = path.join(runtime, `round-${values.ROUND}-${model}-build.txt`)
  let output

  if (fakeAgentsDirectory()) {
    output = runFakeAgent('builder', { worktree, prompt, timeout, values })
    fs.writeFileSync(outputFile, output)
  } else if (model === 'codex') {
    run(
      'codex',
      [
        'exec',
        ...CODEX_COMMON_FLAGS,
        '--sandbox',
        'workspace-write',
        '--output-last-message',
        outputFile,
        '--cd',
        worktree,
        '-',
      ],
      { cwd: worktree, input: prompt, timeout }
    )
    output = fs.readFileSync(outputFile, 'utf8')
  } else {
    const result = run(
      'claude',
      [
        '--print',
        '--no-session-persistence',
        '--permission-mode',
        'acceptEdits',
        '--allowedTools',
        'Read,Edit,Write,Glob,Grep,Bash(npm run *),Bash(npm test *),Bash(python -m pytest *),Bash(git diff *),Bash(git status *)',
        prompt,
      ],
      { cwd: worktree, timeout }
    )
    output = result.stdout
    fs.writeFileSync(outputFile, output)
  }
  return output.trim()
}

/**
 * The schema file declares draft 2020-12, which is what it is written to.
 * `claude --json-schema` validates the argument with a draft-07 validator that
 * rejects an unknown `$schema` URI outright ("no schema with key or ref"), so
 * the declaration is dropped for that call only. Nothing in the schema uses a
 * 2020-12-only keyword; the coordinator's own validator (schema.mjs) ignores
 * `$schema` and Codex's `--output-schema` accepts the file as written.
 */
export function schemaForClaude(schemaFile) {
  const { $schema, ...schema } = JSON.parse(fs.readFileSync(schemaFile, 'utf8'))
  return JSON.stringify(schema)
}

export function extractClaudeStructuredOutput(stdout) {
  const parsed = JSON.parse(stdout)
  // `--output-format json` reports auth and API failures as a success-shaped
  // envelope with `is_error: true` and prose in `result`; parsing that prose as
  // a review would fail with an unhelpful JSON error.
  if (parsed.is_error) throw new Error(`claude reviewer failed: ${parsed.result}`)
  if (parsed.structured_output) return parsed.structured_output
  if (typeof parsed.result === 'string') return JSON.parse(parsed.result)
  return parsed
}

export function runReviewer({ model, repo, worktree, runtime, values, timeout }) {
  const prompt = readPrompt(repo, 'review.md', values)
  const schemaFile = path.join(repo, 'docs', 'agent-loop', 'schemas', 'review.schema.json')
  const outputFile = path.join(runtime, `round-${values.ROUND}-${model}-review.json`)
  let review

  if (fakeAgentsDirectory()) {
    const stdout = runFakeAgent('reviewer', { worktree, prompt, timeout, values })
    fs.writeFileSync(outputFile, stdout)
    review = JSON.parse(stdout)
  } else if (model === 'codex') {
    run(
      'codex',
      [
        'exec',
        ...CODEX_COMMON_FLAGS,
        '--sandbox',
        'read-only',
        '--output-schema',
        schemaFile,
        '--output-last-message',
        outputFile,
        '--cd',
        worktree,
        '-',
      ],
      { cwd: worktree, input: prompt, timeout }
    )
    review = JSON.parse(fs.readFileSync(outputFile, 'utf8'))
  } else {
    const schema = schemaForClaude(schemaFile)
    const result = run(
      'claude',
      [
        '--print',
        '--no-session-persistence',
        '--permission-mode',
        'dontAsk',
        '--allowedTools',
        'Read,Grep,Glob,Bash(git diff *),Bash(git show *),Bash(git status *)',
        '--output-format',
        'json',
        '--json-schema',
        schema,
        prompt,
      ],
      { cwd: worktree, timeout }
    )
    fs.writeFileSync(outputFile, result.stdout)
    review = extractClaudeStructuredOutput(result.stdout)
  }
  return review
}
