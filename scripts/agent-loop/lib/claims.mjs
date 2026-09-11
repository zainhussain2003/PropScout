import fs from 'node:fs'
import path from 'node:path'
import { git } from './git.mjs'

const ENUMS = {
  author: ['claude', 'codex', 'coordinator'],
  severity: ['P0', 'P1', 'P2', 'P3'],
  status: ['open', 'verified', 'rejected', 'withdrawn'],
  evidence: ['confirmed', 'inferred', 'unknown'],
}

function fail(file, message) {
  throw new Error(`${file}: ${message}`)
}

export function validateClaim(claim, file = '<claim>') {
  const required = [
    'schema_version',
    'id',
    'task',
    'author',
    'subject_sha',
    'severity',
    'status',
    'evidence',
    'citations',
    'claim',
    'verification',
    'history',
  ]
  for (const key of required) if (!(key in claim)) fail(file, `missing ${key}`)
  if (claim.schema_version !== 1) fail(file, 'schema_version must be 1')
  if (!/^[a-z0-9][a-z0-9-]*$/.test(claim.id)) fail(file, 'invalid id')
  if (!/^[a-z0-9][a-z0-9-]*$/.test(claim.task)) fail(file, 'invalid task')
  if (!/^[0-9a-f]{7,40}$/.test(claim.subject_sha)) fail(file, 'invalid subject_sha')
  for (const [key, values] of Object.entries(ENUMS)) {
    if (!values.includes(claim[key])) fail(file, `${key} must be one of ${values.join(', ')}`)
  }
  if (typeof claim.claim !== 'string' || claim.claim.trim().length < 10) {
    fail(file, 'claim must contain at least 10 characters')
  }
  if (!Array.isArray(claim.citations) || claim.citations.length === 0) {
    fail(file, 'at least one citation is required')
  }
  for (const citation of claim.citations) {
    if (!citation.path || !Number.isInteger(citation.start_line) || !Number.isInteger(citation.end_line)) {
      fail(file, 'citations require path, integer start_line, and integer end_line')
    }
    if (citation.start_line < 1 || citation.end_line < citation.start_line) {
      fail(file, 'citation line range is invalid')
    }
  }
  if (!Array.isArray(claim.verification) || claim.verification.length === 0) {
    fail(file, 'verification history is required')
  }
  if (!Array.isArray(claim.history) || claim.history.length === 0) {
    fail(file, 'status history is required')
  }
  if (['P0', 'P1'].includes(claim.severity) && claim.evidence === 'inferred' && !claim.runtime_check) {
    fail(file, 'inferred P0/P1 requires runtime_check')
  }
  return claim
}

export function validateCitationAtSha(repo, claim, file = '<claim>') {
  git(repo, ['cat-file', '-e', `${claim.subject_sha}^{commit}`], { echo: false })
  for (const citation of claim.citations) {
    const repoPath = citation.path.replaceAll('\\', '/')
    const contents = git(repo, ['show', `${claim.subject_sha}:${repoPath}`], { echo: false })
    const lineCount = contents === '' ? 0 : contents.split(/\r?\n/).length
    if (citation.end_line > lineCount) {
      fail(file, `${repoPath}:${citation.end_line} exceeds ${lineCount} lines at ${claim.subject_sha}`)
    }
  }
}

export function loadClaims(repo) {
  const directory = path.join(repo, 'docs', 'agent-loop', 'claims')
  if (!fs.existsSync(directory)) return []
  return fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const file = path.join(directory, name)
      const claim = JSON.parse(fs.readFileSync(file, 'utf8'))
      validateClaim(claim, file)
      validateCitationAtSha(repo, claim, file)
      return { file, claim }
    })
}

export function writeClaims(repo, task, author, reviewer, subjectSha, findings) {
  const directory = path.join(repo, 'docs', 'agent-loop', 'claims')
  fs.mkdirSync(directory, { recursive: true })
  const now = new Date().toISOString()
  const written = []

  findings.forEach((finding, index) => {
    const id = `${author}-${task}-${String(index + 1).padStart(2, '0')}`
    const status = finding.disposition
    const claim = {
      schema_version: 1,
      id,
      task,
      author: reviewer,
      subject_sha: subjectSha,
      severity: finding.severity,
      status,
      evidence: finding.evidence,
      citations: finding.citations,
      claim: finding.claim,
      ...(finding.runtime_check ? { runtime_check: finding.runtime_check } : {}),
      verification: [
        {
          by: reviewer,
          result: status === 'verified' ? 'accepted' : status === 'open' ? 'needs_changes' : 'rejected',
          note: `Recorded from the final structured review of ${subjectSha}.`,
        },
      ],
      history: [
        {
          at: now,
          actor: 'coordinator',
          from: null,
          to: status,
          note: 'Imported from the accepted task review.',
        },
      ],
    }
    validateClaim(claim, id)
    validateCitationAtSha(repo, claim, id)
    const file = path.join(directory, `${id}.json`)
    fs.writeFileSync(file, `${JSON.stringify(claim, null, 2)}\n`, { flag: 'wx' })
    written.push(file)
  })
  return written
}

export function generateClaimsMarkdown(repo, records = loadClaims(repo)) {
  const output = path.join(repo, 'docs', 'agent-loop', 'CLAIMS.md')
  const lines = ['# PropScout agent findings', '']
  if (records.length === 0) {
    lines.push('No accepted task has emitted a finding yet.', '')
  } else {
    for (const { claim } of records) {
      lines.push(`## ${claim.id} — ${claim.severity} — ${claim.status}`, '')
      lines.push(claim.claim.trim(), '')
      lines.push(`- Author: ${claim.author}`)
      lines.push(`- Evidence: ${claim.evidence}`)
      lines.push(`- Subject: \`${claim.subject_sha}\``)
      lines.push('- Citations:')
      for (const citation of claim.citations) {
        lines.push(`  - \`${citation.path}:${citation.start_line}-${citation.end_line}\``)
      }
      lines.push('')
    }
  }
  lines.push('_Generated from `docs/agent-loop/claims/*.json`; do not edit by hand._', '')
  fs.writeFileSync(output, lines.join('\n'))
  return output
}
