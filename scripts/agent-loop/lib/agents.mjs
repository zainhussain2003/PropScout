import fs from 'node:fs'
import path from 'node:path'
import { run } from './process.mjs'

function render(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)),
    template,
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

  if (model === 'codex') {
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
      { cwd: worktree, input: prompt, timeout },
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
      { cwd: worktree, timeout },
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

  if (model === 'codex') {
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
      { cwd: worktree, input: prompt, timeout },
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
      { cwd: worktree, timeout },
    )
    fs.writeFileSync(outputFile, result.stdout)
    review = extractClaudeStructuredOutput(result.stdout)
  }
  return review
}
