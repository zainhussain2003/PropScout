import { auditAction } from '../audit/heimdall.js';
import { sendPlainNotification } from '../telegram/jarvis.js';
import type { BudgetState, LoopConfig } from '../types.js';

// Conservative per-run ceilings. These sit INSIDE the Console monthly spend
// limit as the inner ceiling. Lowered for early unattended operation — raise
// deliberately, never by accident. Whichever cap is hit first pauses the loop.
const DEFAULT_CONFIG: LoopConfig = {
  maxIterations: 12,   // ~4 build/test/review cycles at 3 dispatches each
  maxCostUsd: 2.5,     // ~8 agent calls at $0.30; well inside a Console limit
};

let state: BudgetState = {
  iterationsUsed: 0,
  iterationCap: DEFAULT_CONFIG.maxIterations,
  estimatedCostUsd: 0,
  costCapUsd: DEFAULT_CONFIG.maxCostUsd,
  killed: false,
};

export function initBudget(config?: Partial<LoopConfig>): void {
  state = {
    iterationsUsed: 0,
    iterationCap: config?.maxIterations ?? DEFAULT_CONFIG.maxIterations,
    estimatedCostUsd: 0,
    costCapUsd: config?.maxCostUsd ?? DEFAULT_CONFIG.maxCostUsd,
    killed: false,
  };
  auditAction('budget', 'INIT', `caps: ${state.iterationCap} iterations, $${state.costCapUsd}`);
}

export function recordIteration(costUsd: number = 0): void {
  state.iterationsUsed++;
  state.estimatedCostUsd += costUsd;
  auditAction(
    'budget',
    'ITERATION',
    `#${state.iterationsUsed}/${state.iterationCap} | $${state.estimatedCostUsd.toFixed(4)}/$${state.costCapUsd}`,
  );
}

export function getBudgetState(): Readonly<BudgetState> {
  return { ...state };
}

export async function checkBudget(): Promise<{ ok: boolean; reason?: string }> {
  if (state.killed) {
    return { ok: false, reason: 'Kill switch activated' };
  }

  if (state.iterationsUsed >= state.iterationCap) {
    const reason = `Iteration cap reached (${state.iterationsUsed}/${state.iterationCap})`;
    auditAction('budget', 'CAP_HIT', reason);
    await sendPlainNotification(
      `[PropScout Agents] PAUSED at iteration cap — ${reason}. ` +
      `The loop is STOPPED (not auto-continuing). Estimated run cost so far: $${state.estimatedCostUsd.toFixed(4)}. ` +
      `Re-run with a higher cap if you want it to continue.`,
    );
    return { ok: false, reason };
  }

  if (state.estimatedCostUsd >= state.costCapUsd) {
    const reason = `Cost cap reached ($${state.estimatedCostUsd.toFixed(2)}/$${state.costCapUsd})`;
    auditAction('budget', 'CAP_HIT', reason);
    await sendPlainNotification(
      `[PropScout Agents] PAUSED at cost cap — ${reason}. ` +
      `The loop is STOPPED (not auto-continuing). Reconcile against console.anthropic.com. ` +
      `Re-run with a higher cap if you want it to continue.`,
    );
    return { ok: false, reason };
  }

  return { ok: true };
}

/**
 * Per-run cost reconciliation line for the audit log. Call at end of every run
 * so the morning reconciliation against console.anthropic.com is one grep away.
 */
export function logRunCostEstimate(): void {
  auditAction(
    'budget',
    'RUN_COST_ESTIMATE',
    `estimated_run_cost=$${state.estimatedCostUsd.toFixed(4)} | ` +
    `iterations=${state.iterationsUsed}/${state.iterationCap} | ` +
    `cost_cap=$${state.costCapUsd} | ` +
    `RECONCILE against console.anthropic.com usage for this run window`,
  );
}

export function markKilled(): void {
  state.killed = true;
  auditAction('budget', 'KILLED', 'Kill switch activated — loop will halt at next iteration boundary');
}
