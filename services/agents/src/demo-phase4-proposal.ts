/**
 * Phase 4 — Single Gated Prod-Action Proposal, End to End.
 *
 * Vision PROPOSES a real, reversible, low-stakes prod-touching action: preparing
 * the pending `first_seen_at` migration (which the repo records as NOT yet
 * applied). Because schema_migration is PREPARE-ONLY, approve means "produce the
 * verified SQL artifact for the human to apply by hand" — the loop never writes prod.
 *
 * Full chain shown: propose -> gate -> Telegram -> your decision -> outcome.
 *
 * Run: npx tsx src/demo-phase4-proposal.ts
 *   >>> Tap APPROVE to see the prepare-only outcome, or REJECT to block. <<<
 */

import { auditAction } from './audit/heimdall.js';
import { runWriteAgent } from './agents/writeRunner.js';
import { describePolicyTable, approveMode, approveRationale } from './safety/approveSemantics.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(here, 'agents', 'prompts');

function section(title: string): void {
  console.log(`\n${'='.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(64));
}

async function main(): Promise<void> {
  console.log('PropScout Agent System — Phase 4 Gated Proposal');
  console.log('------------------------------------------------\n');
  auditAction('demo', 'PHASE4_PROPOSAL_START', 'Vision proposes first_seen_at migration (prepare-only)');

  // ── Show the approve-semantics policy that governs this run ──
  section('Approve-Semantics Policy (locked)');
  console.log(describePolicyTable());
  console.log(`\n  schema_migration → ${approveMode('schema_migration')}`);
  console.log(`  Rationale: ${approveRationale('schema_migration')}`);

  // ── The proposal chain ──
  section('Proposal Chain: propose → gate → Telegram → decision → outcome');
  console.log('  Vision (data-layer) will PROPOSE preparing the pending first_seen_at');
  console.log('  migration. This is reversible (an artifact, not a prod write) and low-stakes.');
  console.log('  >>> Tap APPROVE (prepare-only outcome) or REJECT (blocked) on Telegram. <<<\n');

  const result = await runWriteAgent({
    id: 'phase4-proposal',
    role: 'vision',
    prompt: [
      'There is a pending migration that adds a nullable first_seen_at timestamptz',
      'column to the rental_comps table. It is additive and was written but NOT applied to prod.',
      'Do NOT explore the repo — you have everything you need. Do these steps in order:',
      'STEP 1: Immediately call request_prod_action with',
      'action="Apply the first_seen_at column migration to the prod rental_comps table"',
      'and detail explaining it is an additive, nullable, reversible column add.',
      'STEP 2: Read the tool result. If it says PREPARE-ONLY and APPROVED, call',
      'write_sandbox_file at path "migrations/add_first_seen_at.sql" with a clean additive',
      'migration: ALTER TABLE rental_comps ADD COLUMN IF NOT EXISTS first_seen_at',
      'timestamptz; plus a SQL comment explaining it and a note that the human applies it',
      'in the Supabase dashboard. If REJECTED, do nothing further.',
      'STEP 3: Report what happened and that you did NOT apply anything to prod.',
      'Start with STEP 1 now — call request_prod_action first.',
    ].join(' '),
    systemPrompt: readFileSync(resolve(PROMPTS_DIR, 'vision.md'), 'utf-8'),
  });

  // ── Outcome ──
  section('Outcome');
  console.log(`  Prod requests made: ${result.prodRequests.length}`);
  for (const pr of result.prodRequests) {
    console.log(`    - "${pr.action.slice(0, 55)}..." → ${pr.decision.toUpperCase()}`);
  }
  console.log(`  Files prepared in sandbox: ${result.filesWritten.join(', ') || '(none)'}`);
  console.log(`  Cost: $${result.costUsd.toFixed(4)}`);

  section('Chain Summary');
  const pr = result.prodRequests[0];
  if (!pr) {
    console.log('  ⚠ Vision did not route through request_prod_action. Check the transcript.');
  } else if (pr.decision === 'approve') {
    console.log('  1. PROPOSE   → Vision proposed applying the first_seen_at migration');
    console.log('  2. GATE      → classified schema_migration → escalated (prepare-only policy)');
    console.log('  3. TELEGRAM  → approval request sent, loop blocked');
    console.log('  4. DECISION  → you APPROVED');
    console.log('  5. OUTCOME   → PREPARE-ONLY: verified SQL written to sandbox for you to apply.');
    console.log('                 The loop did NOT touch prod. You apply the DDL by hand.');
  } else {
    console.log('  1. PROPOSE   → Vision proposed applying the first_seen_at migration');
    console.log('  2. GATE      → classified schema_migration → escalated');
    console.log('  3. TELEGRAM  → approval request sent, loop blocked');
    console.log(`  4. DECISION  → you REJECTED${result.prodRequests[0] ? '' : ''}`);
    console.log('  5. OUTCOME   → blocked. Nothing prepared, nothing applied.');
  }

  console.log('\n  Agent final message:');
  console.log('  ' + result.response.slice(0, 600).replace(/\n/g, '\n  '));

  auditAction('demo', 'PHASE4_PROPOSAL_DONE',
    `decision=${pr?.decision ?? 'none'} files=${result.filesWritten.length} cost=$${result.costUsd.toFixed(4)}`);
}

main().catch((err) => {
  console.error('Proposal demo failed:', err);
  process.exit(1);
});
