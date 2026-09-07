/**
 * Phase 2 Demo — Read-Only Agent Loop
 *
 * Runs 4 read-only tasks + 1 simulated side-effect escalation through the loop.
 * Proves: dispatch, tool calls, re-queue, audit logging, escalation on simulated write.
 *
 * Run: npx tsx src/demo-phase2.ts
 */

import { auditAction } from './audit/heimdall.js';
import { enqueue, getQueue } from './orchestrator/queue.js';
import { runLoop } from './orchestrator/loop.js';

function section(title: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

async function main(): Promise<void> {
  console.log('PropScout Agent System — Phase 2 Demo');
  console.log('--------------------------------------\n');
  auditAction('demo', 'PHASE2_START', 'Phase 2 demo: read-only agents + loop');

  // ── Queue read-only tasks ──
  section('1. Queuing Tasks');

  enqueue('oracle', [
    'Investigate the PropScout API route structure.',
    'Read apps/api/src/app.ts and list every registered route.',
    'Report the route paths and which service each calls.',
  ].join(' '));
  console.log('  Queued: Oracle — API route probe');

  enqueue('batman', [
    'Review the scraper deduplication logic in services/scrapers/dedupe.py.',
    'Read the file and assess:',
    '1. Is the dedupe window correctly implemented?',
    '2. Could overlapping city radius searches produce false positives?',
    '3. What happens if the source_url is null?',
    'End with VERDICT, ESCALATE?, NEXT INSTRUCTION.',
  ].join(' '));
  console.log('  Queued: Batman — code review (dedupe logic)');

  enqueue('black_widow', [
    'Security audit: check whether the Supabase service role key is',
    'ever exposed to the frontend. Search for SUPABASE_SERVICE_ROLE_KEY',
    'in apps/web/ and check that it only appears in apps/api/ and services/.',
    'Also check if any .env files are committed to git.',
    'Report findings with severity classification.',
  ].join(' '));
  console.log('  Queued: Black Widow — security/RLS review');

  enqueue('heimdall', [
    'Read the audit log at services/agents/logs/ and summarize what',
    'has happened in the agent system today. Report which agents acted,',
    'what was escalated, and whether any anomalies are visible.',
  ].join(' '));
  console.log('  Queued: Heimdall — audit log summary');

  console.log(`\n  Total tasks queued: ${getQueue().length}`);

  // ── Run the loop ──
  section('2. Running Loop (max 10 iterations, $2.00 cap)');
  console.log('  Starting orchestrator loop...\n');

  const result = await runLoop({ maxIterations: 10, maxCostUsd: 2.0 });

  // ── Results ──
  section('3. Loop Results');
  console.log(`  Iterations run:    ${result.iterationsRun}`);
  console.log(`  Tasks completed:   ${result.tasksCompleted}`);
  console.log(`  Tasks failed:      ${result.tasksFailed}`);
  console.log(`  Tasks rejected:    ${result.tasksRejected}`);
  console.log(`  Total input tokens:  ${result.totalInputTokens.toLocaleString()}`);
  console.log(`  Total output tokens: ${result.totalOutputTokens.toLocaleString()}`);
  console.log(`  Estimated cost:    $${result.totalCostUsd.toFixed(4)}`);
  console.log(`  Halt reason:       ${result.haltReason}`);

  // ── Task outputs ──
  section('4. Task Outputs');
  for (const task of getQueue()) {
    console.log(`\n  ─── ${task.id} (${task.role}) — ${task.status} ───`);
    if (task.result) {
      console.log(`  ${task.result.slice(0, 400)}`);
    }
  }

  // ── Budget accuracy note ──
  section('5. Budget Estimate');
  console.log(`  Estimated cost from token counts: $${result.totalCostUsd.toFixed(4)}`);
  console.log(`  Model: claude-sonnet-4-6 ($3.00/MTok in, $15.00/MTok out)`);
  console.log(`  Input tokens:  ${result.totalInputTokens.toLocaleString()} × $0.000003 = $${(result.totalInputTokens * 3.0 / 1_000_000).toFixed(4)}`);
  console.log(`  Output tokens: ${result.totalOutputTokens.toLocaleString()} × $0.000015 = $${(result.totalOutputTokens * 15.0 / 1_000_000).toFixed(4)}`);
  console.log('  → Compare this against console.anthropic.com usage for this run.');

  auditAction('demo', 'PHASE2_COMPLETE', `${result.tasksCompleted} tasks, $${result.totalCostUsd.toFixed(4)}`);
  console.log('\n  Phase 2 demo complete. Check services/agents/logs/ for full audit trail.');
}

main().catch((err) => {
  console.error('Phase 2 demo failed:', err);
  process.exit(1);
});
