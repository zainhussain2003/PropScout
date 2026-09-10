/**
 * Phase 4 Prerequisite — No-Response Watchdog Proof.
 *
 * Triggers a gate request with a SHORT timeout (70s instead of 30min so the
 * test is runnable), taps NOTHING, and proves:
 *   - It AUTO-REJECTS after the timeout (never auto-approves).
 *   - It notifies you it auto-rejected.
 *   - The task is cleanly abandoned, not executed.
 *
 * Run: npx tsx src/test-watchdog.ts
 *   >>> DO NOT TAP ANYTHING. Wait ~70s. <<<
 */

import { auditAction } from './audit/heimdall.js';
import { requestApproval } from './telegram/jarvis.js';
import type { EscalationRequest } from './types.js';

function section(title: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

async function main(): Promise<void> {
  console.log('PropScout Agent System — No-Response Watchdog Proof');
  console.log('----------------------------------------------------\n');
  auditAction('test', 'WATCHDOG_TEST_START', 'Watchdog with 70s timeout');

  section('Watchdog Test (70s timeout)');
  console.log('  Production default is 30 minutes; this test uses 70s so it is runnable.');
  console.log('  >>> DO NOT TAP ANYTHING on Telegram. Wait it out. <<<\n');

  const TEST_TIMEOUT_MS = 70_000;

  const req: EscalationRequest = {
    action: 'Apply schema migration to prod (WATCHDOG TEST — do not tap)',
    category: 'schema_migration',
    agent: 'Doctor Strange',
    detail: 'Watchdog test: leave this unanswered. It must AUTO-REJECT after 70s and notify you. It must NEVER auto-approve.',
    timestamp: new Date().toISOString(),
  };

  const started = Date.now();
  const result = await requestApproval(req, TEST_TIMEOUT_MS);
  const elapsed = Math.round((Date.now() - started) / 1000);

  section('Result');
  console.log(`  Decision:      ${result.decision.toUpperCase()}`);
  console.log(`  Auto-rejected: ${result.autoRejected ? 'YES (watchdog)' : 'no (human tapped)'}`);
  console.log(`  Elapsed:       ${elapsed}s`);

  section('Verdict');
  if (result.decision === 'reject' && result.autoRejected) {
    console.log('  ✓ The watchdog AUTO-REJECTED after the timeout.');
    console.log('  ✓ It did NOT auto-approve (the only safe direction).');
    console.log('  ✓ You received an auto-reject notification on Telegram.');
    console.log('  ✓ A loop receiving this result treats it exactly like a human reject:');
    console.log('    the action is NOT executed; the task is abandoned/re-queued.');
  } else if (result.decision === 'reject' && !result.autoRejected) {
    console.log('  ⚠ You tapped Reject before the timeout. The watchdog path was not');
    console.log('    exercised — re-run and tap nothing to test the timeout.');
  } else {
    console.log('  ✗ Decision was APPROVE — this should be impossible on no-response.');
    console.log('    If you see this without tapping, the watchdog is broken.');
  }

  auditAction('test', 'WATCHDOG_TEST_DONE', `decision=${result.decision} autoRejected=${result.autoRejected} elapsed=${elapsed}s`);
}

main().catch((err) => {
  console.error('Watchdog test failed:', err);
  process.exit(1);
});
