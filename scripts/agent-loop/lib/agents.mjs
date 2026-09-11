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
        '--ephemeral',
        '--sandbox',
        'workspace-write',
        '--ask-for-approval',
        'never',
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

function extractClaudeStructuredOutput(stdout) {
  const parsed = JSON.parse(stdout)
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
        '--ephemeral',
        '--sandbox',
        'read-only',
        '--ask-for-approval',
        'never',
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
    const schema = fs.readFileSync(schemaFile, 'utf8')
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
