/**
 * run.ts — thin front door for the agent loop.
 *
 * Reads a task prompt and optional --role flag from the CLI, enqueues it, and
 * runs the loop with the EXISTING defaults (cost cap, iteration cap, gate,
 * watchdog, audit log — all unchanged). Prints the LoopResult.
 *
 * Usage:
 *   npx tsx services/agents/src/run.ts [--role <role>] "task prompt"
 *
 * Example:
 *   npx tsx services/agents/src/run.ts --role iron_man "Write a pure function..."
 */

import { enqueue } from './orchestrator/queue.js';
import { runLoop } from './orchestrator/loop.js';
import { AGENT_TOOL_SETS } from './types.js';
import type { AgentRole } from './types.js';

function parseArgs(argv: string[]): { role: AgentRole; prompt: string } {
  let role = 'iron_man';
  const promptParts: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--role') {
      role = argv[i + 1] ?? role;
      i++; // skip the value
    } else {
      promptParts.push(arg);
    }
  }

  if (!(role in AGENT_TOOL_SETS)) {
    const valid = Object.keys(AGENT_TOOL_SETS).join(', ');
    throw new Error(`Unknown role "${role}". Valid roles: ${valid}`);
  }

  const prompt = promptParts.join(' ').trim();
  if (!prompt) {
    throw new Error('No task prompt provided. Usage: run.ts [--role <role>] "task prompt"');
  }

  return { role: role as AgentRole, prompt };
}

async function main(): Promise<void> {
  const { role, prompt } = parseArgs(process.argv.slice(2));

  console.log('PropScout Agent Loop — front door');
  console.log('---------------------------------');
  console.log(`Role:   ${role}`);
  console.log(`Prompt: ${prompt}`);
  console.log('');

  enqueue(role, prompt);

  // Run with EXISTING defaults — no overrides of caps, gate, watchdog, or audit.
  const result = await runLoop();

  // Print the counters without the (potentially long) response text...
  const { taskResults, ...counters } = result;
  console.log('\n=== LoopResult ===');
  console.log(JSON.stringify(counters, null, 2));

  // ...then the agent's FULL response per task. For a review agent the response
  // IS the deliverable — previously it was discarded, leaving only the counters.
  console.log('\n=== Task Results ===');
  for (const t of taskResults) {
    console.log(`\n[${t.id}] ${t.role} — ${t.status.toUpperCase()}`);
    if (t.failureReason) console.log(`reason: ${t.failureReason}`);
    console.log('--- agent response ---');
    console.log(t.response || '(no response text)');
  }
}

main().catch((err) => {
  console.error('run.ts failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
