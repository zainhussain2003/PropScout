import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateAgainstSchema } from '../lib/schema.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const reviewSchema = JSON.parse(
  fs.readFileSync(
    path.join(here, '..', '..', '..', 'docs', 'agent-loop', 'schemas', 'review.schema.json'),
    'utf8'
  )
)

function validReview() {
  return {
    verdict: 'accepted',
    summary: 'Candidate is sound.',
    next_instruction: '',
    findings: [
      {
        severity: 'P2',
        evidence: 'confirmed',
        claim: 'A finding of at least ten characters.',
        disposition: 'verified',
        citations: [{ path: 'apps/web/src/App.tsx', start_line: 1, end_line: 3 }],
      },
    ],
  }
}

test('accepts a review that matches the schema', () => {
  assert.deepEqual(validateAgainstSchema(validReview(), reviewSchema), [])
})

test('rejects unknown top-level properties', () => {
  // The previous hand validator checked only the fields it knew about, so a
  // reviewer could attach arbitrary extra keys and they would pass silently.
  const review = { ...validReview(), unexpected: true }
  const errors = validateAgainstSchema(review, reviewSchema)
  assert.ok(
    errors.some((e) => /additional property "unexpected"/.test(e)),
    errors.join('; ')
  )
})

test('rejects unknown properties inside a finding', () => {
  const review = validReview()
  review.findings[0].note = 'not allowed'
  const errors = validateAgainstSchema(review, reviewSchema)
  assert.ok(
    errors.some((e) => /findings\[0\].*additional property "note"/.test(e)),
    errors.join('; ')
  )
})

test('enforces enums, minItems, minimum and minLength with a path to the failure', () => {
  const review = validReview()
  review.verdict = 'maybe'
  review.findings[0].citations = []
  review.findings.push({
    severity: 'P9',
    evidence: 'confirmed',
    claim: 'short',
    disposition: 'open',
    citations: [{ path: '', start_line: 0, end_line: 2 }],
  })
  const errors = validateAgainstSchema(review, reviewSchema)
  const joined = errors.join('\n')
  assert.match(joined, /verdict.*enum/)
  assert.match(joined, /findings\[0\]\.citations.*minItems/)
  assert.match(joined, /findings\[1\]\.severity.*enum/)
  assert.match(joined, /findings\[1\]\.claim.*minLength/)
  assert.match(joined, /findings\[1\]\.citations\[0\]\.path.*minLength/)
  assert.match(joined, /findings\[1\]\.citations\[0\]\.start_line.*minimum/)
})

test('enforces integer type — a float line number is not a line number', () => {
  const review = validReview()
  review.findings[0].citations[0].start_line = 1.5
  const errors = validateAgainstSchema(review, reviewSchema)
  assert.match(errors.join('\n'), /start_line.*integer/)
})

test('reports missing required fields', () => {
  const review = validReview()
  delete review.summary
  const errors = validateAgainstSchema(review, reviewSchema)
  assert.match(errors.join('\n'), /required property "summary"/)
})
