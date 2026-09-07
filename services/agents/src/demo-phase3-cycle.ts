/**
 * Phase 3 — Build/Test/Review Cycle on a SAFE, reversible code task.
 *
 * Task: build a pure Ontario-postal-code normalizer + validator in the sandbox,
 * with unit tests. No prod, no migration, no DB — fully reversible.
 *
 * Cycle: Iron Man builds → Flash writes & runs tests → Batman reviews.
 * Reports per-agent cost = the real Phase 3 burn rate.
 *
 * Run: npx tsx src/demo-phase3-cycle.ts
 */

import { auditAction } from './audit/heimdall.js';
import { runWriteAgent } from './agents/writeRunner.js';
import { runAgent } from './agents/runner.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(here, 'agents', 'prompts');

function loadPrompt(role: string): string {
  return readFileSync(resolve(PROMPTS_DIR, `${role}.md`), 'utf-8');
}

function section(title: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

interface AgentCost {
  agent: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  toolCalls: number;
}

async function main(): Promise<void> {
  console.log('PropScout Agent System — Phase 3 Build/Test/Review Cycle');
  console.log('---------------------------------------------------------\n');
  auditAction('demo', 'PHASE3_CYCLE_START', 'Safe code task: postal code normalizer');

  const costs: AgentCost[] = [];

  // ── 1. Iron Man builds ──
  section('1. Iron Man — Build');
  console.log('  Task: build a pure Ontario postal-code normalizer + validator.\n');
  const build = await runWriteAgent({
    id: 'cycle-build',
    role: 'iron_man',
    prompt: [
      'Build a small, pure TypeScript module in the sandbox at "postal/ontarioPostal.ts".',
      'It must export two functions:',
      '1. normalizePostalCode(raw: string): string — uppercases and inserts a single',
      '   space in the middle (e.g. "m5v2t6" or "m5v 2t6" → "M5V 2T6").',
      '2. isOntarioFSA(postal: string): boolean — returns true if the first letter is',
      '   one of K, L, M, N, P (Ontario forward sortation areas).',
      'Both must have typed params and return values, and a docstring comment.',
      'After writing, run "npx tsc --noEmit postal/ontarioPostal.ts" to verify it compiles.',
      'Report what you built and the compile result.',
    ].join(' '),
    systemPrompt: loadPrompt('iron_man'),
  });
  costs.push({ agent: 'Iron Man', inputTokens: build.inputTokens, outputTokens: build.outputTokens, costUsd: build.costUsd, toolCalls: build.toolCalls.length });
  console.log(`  Files written: ${build.filesWritten.join(', ')}`);
  console.log(`  Cost: $${build.costUsd.toFixed(4)} (${build.toolCalls.length} tool calls)`);
  console.log(`  Result: ${build.response.slice(0, 300)}`);

  // ── 2. Flash tests ──
  section('2. The Flash — Unit Tests');
  console.log('  Task: write and run unit tests for the normalizer.\n');
  const test = await runWriteAgent({
    id: 'cycle-test',
    role: 'flash',
    prompt: [
      'Iron Man wrote a module at sandbox "postal/ontarioPostal.ts" with',
      'normalizePostalCode(raw) and isOntarioFSA(postal). First read it with',
      'read_sandbox_file at "postal/ontarioPostal.ts". Then write a Node-based test',
      'file at "postal/ontarioPostal.test.mjs" that imports nothing external — instead,',
      'inline-copy the two functions as plain JS at the top of the test file and assert',
      'their behavior with node:assert: e.g. normalize "m5v2t6" → "M5V 2T6",',
      'isOntarioFSA("M5V 2T6") → true, isOntarioFSA("V6B 1A1") → false (BC).',
      'Run it with "node postal/ontarioPostal.test.mjs" and report pass/fail with output.',
    ].join(' '),
    systemPrompt: loadPrompt('flash'),
  });
  costs.push({ agent: 'The Flash', inputTokens: test.inputTokens, outputTokens: test.outputTokens, costUsd: test.costUsd, toolCalls: test.toolCalls.length });
  console.log(`  Files written: ${test.filesWritten.join(', ')}`);
  console.log(`  Cost: $${test.costUsd.toFixed(4)} (${test.toolCalls.length} tool calls)`);
  console.log(`  Result: ${test.response.slice(0, 300)}`);

  // ── 3. Batman reviews (read-only) ──
  section('3. Batman — Adversarial Review');
  console.log('  Task: review the build + tests, emit VERDICT / ESCALATE? / NEXT INSTRUCTION.\n');
  const review = await runAgent({
    id: 'cycle-review',
    role: 'batman',
    prompt: [
      'Iron Man built a postal-code module and Flash tested it, both in',
      'services/agents/sandbox/postal/. Read both files',
      '(services/agents/sandbox/postal/ontarioPostal.ts and',
      'services/agents/sandbox/postal/ontarioPostal.test.mjs) and review adversarially.',
      'Check: does the test actually test the real function or a drifted copy? Are edge',
      'cases covered (lowercase, already-spaced, invalid length, non-Ontario FSA)? Does',
      'the verification prove what it claims? End with VERDICT, ESCALATE?, NEXT INSTRUCTION.',
    ].join(' '),
    systemPrompt: loadPrompt('batman'),
  });
  costs.push({ agent: 'Batman', inputTokens: review.inputTokens, outputTokens: review.outputTokens, costUsd: review.costUsd, toolCalls: review.toolCalls.length });
  console.log(`  Cost: $${review.costUsd.toFixed(4)} (${review.toolCalls.length} tool calls)`);
  console.log(`  Review: ${review.response.slice(0, 600)}`);

  // ── Per-agent cost summary ──
  section('4. Per-Agent Burn Rate (the real Phase 3 cost)');
  console.log(`  ${'Agent'.padEnd(12)} | ${'In'.padStart(8)} | ${'Out'.padStart(7)} | ${'Tools'.padStart(5)} | Cost`);
  console.log('  ' + '-'.repeat(50));
  let totalCost = 0;
  let totalIn = 0;
  let totalOut = 0;
  for (const c of costs) {
    console.log(`  ${c.agent.padEnd(12)} | ${c.inputTokens.toLocaleString().padStart(8)} | ${c.outputTokens.toLocaleString().padStart(7)} | ${String(c.toolCalls).padStart(5)} | $${c.costUsd.toFixed(4)}`);
    totalCost += c.costUsd;
    totalIn += c.inputTokens;
    totalOut += c.outputTokens;
  }
  console.log('  ' + '-'.repeat(50));
  console.log(`  ${'TOTAL'.padEnd(12)} | ${totalIn.toLocaleString().padStart(8)} | ${totalOut.toLocaleString().padStart(7)} | ${String(costs.reduce((a, c) => a + c.toolCalls, 0)).padStart(5)} | $${totalCost.toFixed(4)}`);
  console.log(`\n  One full build/test/review cycle cost: $${totalCost.toFixed(4)}`);
  console.log(`  Model: claude-sonnet-4-6. Note: Iron Man + Flash on Opus would be ~5x.`);

  auditAction('demo', 'PHASE3_CYCLE_DONE', `cycle cost $${totalCost.toFixed(4)}`);
  console.log('\n  Cycle complete. Files are in services/agents/sandbox/postal/.');
}

main().catch((err) => {
  console.error('Cycle failed:', err);
  process.exit(1);
});
