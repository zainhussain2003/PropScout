/**
 * reviewGate_test.ts — proves the automatic-review FAIL path deterministically, offline.
 *
 * Four live runs could not stage a review FAIL (the builder sees the same spec Batman
 * sees, so an unauthorized gap can't be manufactured by prompt). So we prove the wiring
 * the same way decideWriteCompletion is proven: drive the REAL functions the loop runs.
 *
 * The full chain, with NO LLM and NO live run:
 *   Batman's raw text  →  parseReviewVerdict  →  (?? 'FAIL', fail-closed)  →  decideReviewOutcome
 *     →  { completionOk, reviewOutcome }  →  the TASK_DONE vs TASK_FAILED_REVIEW branch
 *
 * Run:  npx tsx services/agents/src/orchestrator/reviewGate_test.ts
 * Exits non-zero if any assertion fails, so the run itself is the proof.
 */

import assert from 'node:assert/strict';
import {
  parseReviewVerdict,
  decideReviewOutcome,
  requiredReadFailures,
  resolveReviewVerdict,
  gateErrorOutcome,
  type ReviewDecision,
} from './loop.js';

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  PASS  ${name}`);
}

/**
 * Mirror of the loop's verdict resolution. runBatmanReview runs the REAL
 * resolveReviewVerdict(parseReviewVerdict(text), unreadRequiredFiles); with no unread
 * required files this is the plain parsed verdict (fail-closed to FAIL when absent).
 */
function resolveVerdict(batmanText: string, unreadRequiredFiles: string[] = []): 'PASS' | 'FAIL' {
  return resolveReviewVerdict(parseReviewVerdict(batmanText), unreadRequiredFiles);
}

/**
 * Mirror of how the loop selects the final audit event in the completionOk===false
 * branch: `reviewOutcome === 'fail' ? 'TASK_FAILED_REVIEW' : 'TASK_FAILED'`. Used to
 * assert that a review FAIL is exactly what routes to the TASK_FAILED_REVIEW event.
 */
function auditEventFor(decision: ReviewDecision): 'TASK_DONE' | 'TASK_FAILED_REVIEW' | 'TASK_FAILED' {
  if (decision.completionOk) return 'TASK_DONE';
  return decision.reviewOutcome === 'fail' ? 'TASK_FAILED_REVIEW' : 'TASK_FAILED';
}

console.log('\n[1] Full chain: Batman text → verdict → outcome');
check('VERDICT: FAIL ⇒ FAIL ⇒ completionOk:false, reviewOutcome:fail', () => {
  const verdict = resolveVerdict('## FINDINGS\nreq 3 untested.\n\nVERDICT: FAIL');
  assert.equal(verdict, 'FAIL');
  const d = decideReviewOutcome(verdict);
  assert.equal(d.completionOk, false);
  assert.equal(d.reviewOutcome, 'fail');
  assert.equal(d.failureReasonPrefix, 'Failed Batman review');
});
check('VERDICT: PASS ⇒ PASS ⇒ completionOk:true, reviewOutcome:pass', () => {
  const verdict = resolveVerdict('All requirements implemented and tested.\n\nVERDICT: PASS');
  assert.equal(verdict, 'PASS');
  const d = decideReviewOutcome(verdict);
  assert.equal(d.completionOk, true);
  assert.equal(d.reviewOutcome, 'pass');
  assert.equal(d.failureReasonPrefix, undefined);
});

console.log('\n[2] Fail-closed: no parseable verdict ⇒ treated as FAIL');
check('no VERDICT line ⇒ null ⇒ (?? FAIL) ⇒ completionOk:false', () => {
  assert.equal(parseReviewVerdict('I think it looks fine, ship it.'), null);
  const verdict = resolveVerdict('I think it looks fine, ship it.');
  assert.equal(verdict, 'FAIL');                       // null mapped to FAIL
  const d = decideReviewOutcome(verdict);
  assert.equal(d.completionOk, false);
  assert.equal(d.reviewOutcome, 'fail');
});

console.log('\n[3] A FAIL outcome is exactly what drives TASK_FAILED_REVIEW + notify');
check('FAIL decision routes to the TASK_FAILED_REVIEW audit event', () => {
  const d = decideReviewOutcome('FAIL');
  // The loop notifies + audits TASK_FAILED_REVIEW iff completionOk===false AND reviewOutcome==='fail'.
  assert.equal(d.completionOk, false);
  assert.equal(d.reviewOutcome, 'fail');
  assert.equal(auditEventFor(d), 'TASK_FAILED_REVIEW');
});
check('fail-closed (no verdict) also routes to TASK_FAILED_REVIEW', () => {
  const d = decideReviewOutcome(resolveVerdict('no verdict at all'));
  assert.equal(auditEventFor(d), 'TASK_FAILED_REVIEW');
});
check('PASS routes to TASK_DONE, never TASK_FAILED_REVIEW', () => {
  const d = decideReviewOutcome('PASS');
  assert.equal(auditEventFor(d), 'TASK_DONE');
});

console.log('\n[4] Fail-loud: a failed read of a REQUIRED file forces FAIL over a PASS verdict');
check('Batman emits VERDICT: PASS but failed to read a required file ⇒ forced FAIL', () => {
  const parsed = parseReviewVerdict('Everything looks great, well done.\n\nVERDICT: PASS');
  assert.equal(parsed, 'PASS');                          // he literally said PASS
  const required = ['scratch/yieldAlarm/classifyCity.ts', 'scratch/yieldAlarm/classifyCity.test.ts'];
  const readFailures = ['services/agents/sandbox/scratch/yieldAlarm/classifyCity.ts (not found)'];
  const unread = requiredReadFailures(readFailures, required);
  assert.deepEqual(unread, ['scratch/yieldAlarm/classifyCity.ts']);   // matched the required file
  const verdict = resolveReviewVerdict(parsed, unread);
  assert.equal(verdict, 'FAIL');                          // PASS overridden by the unread required file
  const d = decideReviewOutcome(verdict);
  assert.equal(d.completionOk, false);
  assert.equal(d.reviewOutcome, 'fail');
  assert.equal(auditEventFor(d), 'TASK_FAILED_REVIEW');   // routes to the FAIL branch
});
check('shorthand sandbox/ path in the read failure still matches the required file', () => {
  const required = ['scratch/clamp.ts'];
  const readFailures = ['sandbox/scratch/clamp.ts (not found)'];   // shorthand form
  assert.deepEqual(requiredReadFailures(readFailures, required), ['scratch/clamp.ts']);
});
check('a benign probe for a NON-required absent file does NOT force FAIL', () => {
  const parsed = parseReviewVerdict('Both files read; no config present (correct).\n\nVERDICT: PASS');
  const required = ['scratch/x.ts', 'scratch/x.test.ts'];
  const readFailures = ['services/agents/sandbox/jest.config.ts (not found)'];   // not a required file
  const unread = requiredReadFailures(readFailures, required);
  assert.deepEqual(unread, []);                           // benign probe ignored
  const verdict = resolveReviewVerdict(parsed, unread);
  assert.equal(verdict, 'PASS');                          // PASS stands
  assert.equal(decideReviewOutcome(verdict).completionOk, true);
});
check('one required read fails while another is only a benign probe ⇒ still FAIL', () => {
  const required = ['scratch/a.ts', 'scratch/a.test.ts'];
  const readFailures = [
    'services/agents/sandbox/scratch/a.test.ts (not found)',   // required → forces FAIL
    'services/agents/sandbox/tsconfig.bak (not found)',        // not required → ignored
  ];
  const unread = requiredReadFailures(readFailures, required);
  assert.deepEqual(unread, ['scratch/a.test.ts']);
  assert.equal(resolveReviewVerdict('PASS', unread), 'FAIL');
});

console.log('\n[5] Fail-closed: a transient gate error fails ONE task, never approves');
check('a gate Error ⇒ status failed, reason names the error, marked fail-closed', () => {
  const o = gateErrorOutcome(new Error('fetch failed'));
  assert.equal(o.status, 'failed');
  assert.match(o.failureReason, /Gate check errored/);
  assert.match(o.failureReason, /fetch failed/);
  assert.match(o.failureReason, /fail-closed/);
});
check('a gate error is NEVER read as approval — status is failed, approval denied', () => {
  const o = gateErrorOutcome(new Error('socket hang up'));
  // The real fail-closed guarantee: the loop keys off status==='failed' (markFailed +
  // continue), so it can never proceed to run the agent as if approved.
  assert.equal(o.status, 'failed');
  assert.match(o.failureReason, /not approved/i);   // reason explicitly DENIES approval
});
check('a non-Error thrown value is handled (String coercion)', () => {
  const o = gateErrorOutcome('ECONNRESET');
  assert.equal(o.status, 'failed');
  assert.match(o.failureReason, /ECONNRESET/);
});

console.log(`\nAll ${passed} assertions passed.\n`);
