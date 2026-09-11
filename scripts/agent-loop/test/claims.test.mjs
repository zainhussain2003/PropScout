import assert from 'node:assert/strict'
import test from 'node:test'
import { validateClaim } from '../lib/claims.mjs'

function validClaim() {
  return {
    schema_version: 1,
    id: 'codex-sample-01',
    task: 'sample-task',
    author: 'codex',
    subject_sha: 'abcdef1',
    severity: 'P2',
    status: 'verified',
    evidence: 'confirmed',
    claim: 'The candidate preserves the expected behaviour.',
    citations: [{ path: 'apps/web/src/App.tsx', start_line: 1, end_line: 2 }],
    verification: [{ by: 'claude', result: 'accepted', note: 'Verified.' }],
    history: [{ at: new Date().toISOString(), actor: 'coordinator', from: null, to: 'verified', note: 'Imported.' }],
  }
}

test('accepts a structurally valid claim', () => {
  assert.equal(validateClaim(validClaim()).id, 'codex-sample-01')
})

test('requires runtime proof for inferred P1 claims', () => {
  const claim = validClaim()
  claim.severity = 'P1'
  claim.evidence = 'inferred'
  assert.throws(() => validateClaim(claim), /runtime_check/)
})

test('rejects inverted citation ranges', () => {
  const claim = validClaim()
  claim.citations[0] = { path: 'x.ts', start_line: 4, end_line: 3 }
  assert.throws(() => validateClaim(claim), /line range/)
})
