/**
 * completionGate_test.ts — proves the verification truth-check actually discriminates.
 *
 * This is the regression artifact for the fix that made `completed` depend on a real
 * passing exit code rather than the agent's claim of "done". It exercises the whole
 * chain deterministically, with NO Anthropic API call and NO Telegram gate:
 *
 *   real exit code (execSync)  →  isVerificationCommand  →  computeVerification
 *     →  decideWriteCompletion  →  the completed/failed branch the loop takes
 *
 * Run:  npx tsx services/agents/src/orchestrator/completionGate_test.ts
 * Exits non-zero if any assertion fails, so the run itself is the proof.
 */

import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { isVerificationCommand } from '../safety/sandbox.js';
import { computeVerification, type CommandRun } from '../agents/writeRunner.js';
import { decideWriteCompletion, parseReviewVerdict } from './loop.js';

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  PASS  ${name}`);
}

/**
 * Mirror of the executor's run_command exit-code capture, run against a REAL
 * subprocess so we prove execSync's thrown `.status` is captured — that swallowed
 * exit code was the original bug.
 */
function realExitCode(command: string): number {
  try {
    execSync(command, { stdio: 'pipe' });
    return 0;
  } catch (err) {
    const e = err as { status?: number | null };
    return typeof e.status === 'number' ? e.status : 1;
  }
}

console.log('\n[1] Real exit-code capture (the actual bug — execSync .status)');
check('a passing process is captured as exit 0', () => {
  assert.equal(realExitCode('node -e "process.exit(0)"'), 0);
});
check('a failing process is captured as exit 1 (not swallowed)', () => {
  assert.equal(realExitCode('node -e "process.exit(1)"'), 1);
});
check('a non-zero exit other than 1 is captured verbatim', () => {
  assert.equal(realExitCode('node -e "process.exit(7)"'), 7);
});

console.log('\n[2] isVerificationCommand — a real test command, not a masquerade');
check('npm test counts as verification', () => {
  assert.equal(isVerificationCommand('npm test'), true);
});
check('npx tsc / pytest count as verification', () => {
  assert.equal(isVerificationCommand('npx tsc --noEmit'), true);
  assert.equal(isVerificationCommand('pytest -q'), true);
});
check('a bare node script does NOT count (closes the proof-by-masquerade hole)', () => {
  assert.equal(isVerificationCommand('node build_something.js'), false);
});
check('npx tsx <script> does NOT count', () => {
  assert.equal(isVerificationCommand('npx tsx do_thing.ts'), false);
});

console.log('\n[3] computeVerification — last-run rule from real exit codes');
const fail: CommandRun = { command: 'npm test', exitCode: 1, isVerification: true };
const pass: CommandRun = { command: 'npm test', exitCode: 0, isVerification: true };
const ranScript: CommandRun = { command: 'node x.js', exitCode: 0, isVerification: false };

check('a single failing verification ⇒ not passed', () => {
  const v = computeVerification([fail]);
  assert.equal(v.ranVerification, true);
  assert.equal(v.verificationPassed, false);
  assert.equal(v.lastVerificationExitCode, 1);
});
check('red→green (fail then pass) ⇒ passed (legit fix cycle)', () => {
  assert.equal(computeVerification([fail, pass]).verificationPassed, true);
});
check('green→red (pass then fail) ⇒ not passed (last run is the truth)', () => {
  assert.equal(computeVerification([pass, fail]).verificationPassed, false);
});
check('only a non-verification command ran ⇒ ranVerification false', () => {
  const v = computeVerification([ranScript]);
  assert.equal(v.ranVerification, false);
  assert.equal(v.verificationPassed, false);
});

console.log('\n[4] decideWriteCompletion — the completed/failed branch the loop takes');
check('FAIL PATH: verification ran and failed ⇒ NOT completed', () => {
  const d = decideWriteCompletion(computeVerification([fail]));
  assert.equal(d.completionOk, false);
  assert.match(d.failureReason, /Verification failed/);
  assert.match(d.failureReason, /exited 1/);
});
check('FAIL PATH: agent ran no verification ⇒ NOT completed (claim ignored)', () => {
  const d = decideWriteCompletion(computeVerification([ranScript]));
  assert.equal(d.completionOk, false);
  assert.match(d.failureReason, /No verification command/);
});
check('PASS PATH: verification ran and passed ⇒ completed', () => {
  const d = decideWriteCompletion(computeVerification([pass]));
  assert.equal(d.completionOk, true);
  assert.equal(d.failureReason, '');
});

console.log('\n[5] End-to-end: a REAL failing test command cannot reach `completed`');
check('real exit 1 ⇒ computeVerification ⇒ decideWriteCompletion = NOT completed', () => {
  const realCode = realExitCode('node -e "process.exit(1)"');
  const run: CommandRun = { command: 'npm test', exitCode: realCode, isVerification: true };
  const d = decideWriteCompletion(computeVerification([run]));
  assert.equal(d.completionOk, false);
});
check('real exit 0 ⇒ completed', () => {
  const realCode = realExitCode('node -e "process.exit(0)"');
  const run: CommandRun = { command: 'npm test', exitCode: realCode, isVerification: true };
  assert.equal(decideWriteCompletion(computeVerification([run])).completionOk, true);
});

console.log('\n[6] parseReviewVerdict — the review gate, fail-closed');
check('parses a clean trailing VERDICT: PASS', () => {
  assert.equal(parseReviewVerdict('findings...\nVERDICT: PASS'), 'PASS');
});
check('parses VERDICT: FAIL', () => {
  assert.equal(parseReviewVerdict('findings...\nVERDICT: FAIL'), 'FAIL');
});
check('tolerates markdown bold around the verdict', () => {
  assert.equal(parseReviewVerdict('## VERDICT: **FAIL**'), 'FAIL');
});
check('takes the LAST verdict line if more than one appears', () => {
  assert.equal(parseReviewVerdict('VERDICT: PASS\n...reconsidered...\nVERDICT: FAIL'), 'FAIL');
});
check('no VERDICT line ⇒ null (caller treats as fail-closed FAIL)', () => {
  assert.equal(parseReviewVerdict('I think it looks fine, ship it.'), null);
});
check('does NOT match the prose header "**VERDICT**" (no PASS/FAIL token)', () => {
  assert.equal(parseReviewVerdict('1. **VERDICT** — what is sound and what is not.'), null);
});

console.log(`\nAll ${passed} assertions passed.\n`);
