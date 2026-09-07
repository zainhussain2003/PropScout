import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { auditAction } from '../audit/heimdall.js';
import { checkBudget, recordIteration, initBudget, getBudgetState, logRunCostEstimate } from '../safety/budget.js';
import { checkKillSwitch, clearKillSwitch } from '../safety/killSwitch.js';
import { gateCheck } from '../safety/gate.js';
import { runAgent } from '../agents/runner.js';
import { runWriteAgent } from '../agents/writeRunner.js';
import type { WriteAgentResult } from '../agents/writeRunner.js';
import { dequeue, markCompleted, markFailed, markRejected } from './queue.js';
import type { QueuedTask } from './queue.js';
import { sendPlainNotification } from '../telegram/jarvis.js';
import { AGENT_TOOL_SETS } from '../types.js';
import type { LoopConfig, AgentRole } from '../types.js';

const here = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(here, '..', 'agents', 'prompts');

function loadSystemPrompt(role: string): string {
  const filename = role === 'doctor_strange' ? 'doctor_strange' : role;
  try {
    return readFileSync(resolve(PROMPTS_DIR, `${filename}.md`), 'utf-8');
  } catch {
    return `You are ${AGENT_TOOL_SETS[role as keyof typeof AGENT_TOOL_SETS]?.name ?? role}. Follow your instructions carefully.`;
  }
}

/** The verification fields a write task must satisfy to be marked completed. */
export interface CompletionInput {
  ranVerification: boolean;
  verificationPassed: boolean;
  lastVerificationCommand: string | null;
  lastVerificationExitCode: number | null;
}

export interface CompletionDecision {
  completionOk: boolean;
  failureReason: string;
}

/**
 * Decide whether a write/build task may be marked `completed`. Pure and testable:
 * completion depends ONLY on a verification command having run and passed (exit 0),
 * never on the agent's text response. Read-only tasks do not pass through here.
 */
export function decideWriteCompletion(v: CompletionInput): CompletionDecision {
  if (!v.ranVerification) {
    return {
      completionOk: false,
      failureReason:
        'No verification command (tests/typecheck) executed — completion requires a passing ' +
        "verify command, not the agent's claim of done.",
    };
  }
  if (!v.verificationPassed) {
    return {
      completionOk: false,
      failureReason:
        `Verification failed: \`${v.lastVerificationCommand}\` exited ` +
        `${v.lastVerificationExitCode} (expected 0).`,
    };
  }
  return { completionOk: true, failureReason: '' };
}

export interface ReviewDecision {
  completionOk: boolean;
  reviewOutcome: 'pass' | 'fail';
  /** Prefix for the original task's failure reason (FAIL only). */
  failureReasonPrefix?: string;
}

/**
 * Decide a write task's outcome from Batman's automatic-review verdict. Pure and
 * testable, mirroring decideWriteCompletion. The verdict passed here is already
 * resolved to PASS|FAIL by the caller (an unparseable verdict is mapped to FAIL —
 * fail-closed — before this is called).
 *
 * PASS → the task may complete (reviewOutcome 'pass').
 * FAIL → completion is denied (reviewOutcome 'fail'); the caller keys the
 *        TASK_FAILED_REVIEW audit event and the Telegram notify off exactly this
 *        (completionOk:false + reviewOutcome:'fail').
 */
export function decideReviewOutcome(verdict: 'PASS' | 'FAIL'): ReviewDecision {
  if (verdict === 'PASS') {
    return { completionOk: true, reviewOutcome: 'pass' };
  }
  return { completionOk: false, reviewOutcome: 'fail', failureReasonPrefix: 'Failed Batman review' };
}

/**
 * Fail-closed outcome for a transient error in the escalation gate (e.g. a network
 * failure reaching Telegram/Anthropic during the approval request or long-poll).
 *
 * An errored gate is NEVER treated as approval — the task is failed/skipped, never
 * allowed to proceed. The loop catches this per-task so one transient blip fails one
 * task cleanly instead of crashing the whole unattended run.
 */
export function gateErrorOutcome(error: unknown): { status: 'failed'; failureReason: string } {
  const msg = error instanceof Error ? error.message : String(error);
  return {
    status: 'failed',
    failureReason: `Gate check errored: ${msg.slice(0, 200)} — fail-closed (task not approved; loop continues)`,
  };
}

/**
 * Parse Batman's machine-readable verdict line. Returns the LAST `VERDICT: PASS|FAIL`
 * found (the structured final line), tolerating markdown emphasis/headings. Returns
 * null when no verdict line is present — the caller treats null as FAIL (fail-closed).
 */
export function parseReviewVerdict(response: string): 'PASS' | 'FAIL' | null {
  const matches = [...response.matchAll(/VERDICT:\s*\**\s*(PASS|FAIL)\b/gi)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1].toUpperCase() as 'PASS' | 'FAIL';
}

/**
 * From a reviewer's read failures, return the REQUIRED files it failed to read.
 *
 * `readFailures` are the raw `"<path> (reason)"` entries the read-only runner records;
 * `requiredFiles` are the builder's changed files the reviewer was explicitly given.
 * Matching is by normalized path containment so the `sandbox/...` shorthand and the
 * full `services/agents/sandbox/...` form both match. Failed reads of files NOT in the
 * required list (e.g. a benign probe confirming an absent jest.config) are ignored.
 */
export function requiredReadFailures(readFailures: string[], requiredFiles: string[]): string[] {
  const norm = (s: string): string => s.toLowerCase().replace(/\\/g, '/');
  const failedNorm = readFailures.map(norm);
  return requiredFiles.filter((rf) => {
    const needle = norm(rf);
    return failedNorm.some((f) => f.includes(needle));
  });
}

/**
 * Resolve the effective review verdict. Fail-loud takes precedence: if the reviewer
 * failed to read any REQUIRED file its verdict is untrustworthy → FAIL, regardless of
 * the verdict line (mirrors the read-only dispatch guard). Otherwise an unparseable
 * verdict is FAIL (fail-closed); otherwise the parsed verdict stands.
 */
export function resolveReviewVerdict(
  parsed: 'PASS' | 'FAIL' | null,
  unreadRequiredFiles: string[],
): 'PASS' | 'FAIL' {
  if (unreadRequiredFiles.length > 0) return 'FAIL';
  return parsed ?? 'FAIL';
}

/**
 * Build the automatic-review prompt for Batman: the ORIGINAL task spec plus the
 * files the builder changed (as repo-root paths Batman's read_file can resolve).
 */
export function buildReviewPrompt(taskSpec: string, filesWritten: string[]): string {
  const files = filesWritten.length > 0
    ? filesWritten.map((f) => `- services/agents/sandbox/${f}`).join('\n')
    : '(the Builder reported NO files written — a missing deliverable is a FAIL)';
  return [
    "You are the automatic review gate for the Builder's just-completed work.",
    'It has ALREADY passed the mechanical test gate (its tests ran and exited 0).',
    'Your job is the SUBSTANTIVE gate: does the work satisfy the FULL task spec —',
    'every requirement implemented AND tested AND verifiable — not merely "tests pass"?',
    '',
    '== ORIGINAL TASK SPEC ==',
    taskSpec,
    '',
    '== FILES THE BUILDER CHANGED (read each one before judging) ==',
    files,
    '',
    'Read every changed file. If a required file cannot be read, FAIL.',
    'End with your machine-readable line: exactly "VERDICT: PASS" or "VERDICT: FAIL".',
  ].join('\n');
}

interface ReviewOutcome {
  verdict: 'PASS' | 'FAIL';
  parsed: boolean;        // false when no VERDICT line was found (→ fail-closed FAIL)
  /** Required (builder-changed) files the reviewer failed to read — forces FAIL when non-empty. */
  unreadRequiredFiles: string[];
  response: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/** Run Batman as the automatic second gate over a builder's just-completed work. */
async function runBatmanReview(task: QueuedTask, builder: WriteAgentResult): Promise<ReviewOutcome> {
  const prompt = buildReviewPrompt(task.prompt, builder.filesWritten);
  const systemPrompt = loadSystemPrompt('batman');
  const review = await runAgent({ id: `${task.id}-review`, role: 'batman', prompt, systemPrompt });
  const parsed = parseReviewVerdict(review.response);

  // Fail-loud for the review gate (mirrors the read-only dispatch guard): if Batman
  // failed to read any file he was explicitly given to review, his verdict is built on
  // partial info → force FAIL regardless of the verdict line. Benign probes for files
  // NOT in the required list (e.g. confirming no jest.config was created) are ignored.
  const unreadRequiredFiles = requiredReadFailures(review.readFailures, builder.filesWritten);

  return {
    verdict: resolveReviewVerdict(parsed, unreadRequiredFiles),
    parsed: parsed !== null,
    unreadRequiredFiles,
    response: review.response,
    inputTokens: review.inputTokens,
    outputTokens: review.outputTokens,
    costUsd: review.costUsd,
  };
}

/** Telegram notify that never crashes the loop if the network/API hiccups. */
async function notifyHuman(text: string): Promise<void> {
  try {
    await sendPlainNotification(text);
  } catch (e) {
    auditAction('fury', 'NOTIFY_FAILED', e instanceof Error ? e.message : String(e));
  }
}

/** The full outcome of one task — including the agent's complete response text. */
export interface TaskResult {
  id: string;
  role: AgentRole;
  status: 'completed' | 'failed';
  response: string;
  failureReason?: string;
}

export interface LoopResult {
  iterationsRun: number;
  tasksCompleted: number;
  tasksFailed: number;
  tasksRejected: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  haltReason: string;
  /** Per-task outcomes with the agent's FULL response (the deliverable for review agents). */
  taskResults: TaskResult[];
}

export async function runLoop(config?: Partial<LoopConfig>): Promise<LoopResult> {
  initBudget(config);
  clearKillSwitch();

  const stats: LoopResult = {
    iterationsRun: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    tasksRejected: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    haltReason: '',
    taskResults: [],
  };

  auditAction('fury', 'LOOP_START', `Config: ${JSON.stringify(config ?? {})}`);

  while (true) {
    // --- Kill switch check ---
    const ks = checkKillSwitch();
    if (!ks.alive) {
      stats.haltReason = ks.reason ?? 'Kill switch';
      auditAction('fury', 'LOOP_HALT', stats.haltReason);
      break;
    }

    // --- Budget check ---
    const budget = await checkBudget();
    if (!budget.ok) {
      stats.haltReason = budget.reason ?? 'Budget exceeded';
      auditAction('fury', 'LOOP_HALT', stats.haltReason);
      break;
    }

    // --- Dequeue ---
    const task = dequeue();
    if (!task) {
      stats.haltReason = 'Queue empty';
      auditAction('fury', 'LOOP_HALT', 'No more tasks in queue');
      break;
    }

    stats.iterationsRun++;
    auditAction('fury', 'DISPATCH', `${task.id} → ${AGENT_TOOL_SETS[task.role].name}: ${task.prompt.slice(0, 80)}`);

    // --- Gate check for non-read-only agents (simulated side effect test) ---
    // The gate makes network calls (Telegram approval request + long-poll). A
    // transient failure there must fail THIS task fail-closed and let the loop go
    // on — never crash the whole unattended run, and never be read as approval.
    const agentConfig = AGENT_TOOL_SETS[task.role];
    if (!agentConfig.readOnly) {
      let gateResult: Awaited<ReturnType<typeof gateCheck>>;
      try {
        gateResult = await gateCheck(
          agentConfig.name,
          task.prompt,
          `Task ${task.id}: agent ${agentConfig.name} attempting action`,
          task.role,
        );
      } catch (gateErr) {
        const outcome = gateErrorOutcome(gateErr);
        markFailed(task.id, outcome.failureReason);
        stats.tasksFailed++;
        stats.taskResults.push({ id: task.id, role: task.role, status: 'failed', response: '', failureReason: outcome.failureReason });
        auditAction('fury', 'GATE_ERROR', `${task.id}: ${outcome.failureReason}`);
        continue;   // fail-closed: skip this task, keep the loop alive
      }
      if (gateResult && gateResult.decision === 'reject') {
        markRejected(task.id, 'Gate rejected');
        stats.tasksRejected++;
        auditAction('fury', 'TASK_REJECTED', `${task.id}: gate rejected`);
        continue;
      }
    }

    // --- Run agent (write-capable agents use the sandboxed write runner) ---
    try {
      const systemPrompt = loadSystemPrompt(task.role);
      let response: string;
      let toolCallCount: number;
      let inputTokens: number;
      let outputTokens: number;
      let costUsd: number;

      // Completion gate. Read-only agents produce analysis — there is nothing to
      // verify, so a clean return is success. Write/build agents must PROVE success:
      // a verification command (the task's tests) must have executed and returned
      // exit code 0. The agent's text response is never consulted for this.
      let completionOk = true;
      let failureReason = '';
      // 'none' = no review ran (read-only, or mechanical gate failed first);
      // 'pass'/'fail' = Batman's automatic review verdict.
      let reviewOutcome: 'none' | 'pass' | 'fail' = 'none';

      if (agentConfig.readOnly) {
        const result = await runAgent({ id: task.id, role: task.role, prompt: task.prompt, systemPrompt });
        response = result.response;
        toolCallCount = result.toolCalls.length;
        inputTokens = result.inputTokens;
        outputTokens = result.outputTokens;
        costUsd = result.costUsd;

        // Fail-loud for reviewers: a read-only review whose required reads FAILED
        // cannot be a normal completion. A reviewer that can't see its inputs must
        // not pass on grep scraps — the task reflects that it could not review.
        if (result.readFailures.length > 0) {
          completionOk = false;
          failureReason =
            `Reviewer could not read required input(s): ${result.readFailures.join('; ')}. ` +
            'A read-only review cannot complete without reading its targets.';
        }
      } else {
        const result = await runWriteAgent({ id: task.id, role: task.role, prompt: task.prompt, systemPrompt });
        response = result.response;
        toolCallCount = result.toolCalls.length;
        inputTokens = result.inputTokens;
        outputTokens = result.outputTokens;
        costUsd = result.costUsd;

        const decision = decideWriteCompletion(result);
        completionOk = decision.completionOk;
        failureReason = decision.failureReason;

        // SECOND GATE — automatic Batman review. Runs ONLY after the mechanical
        // gate passes (no point reviewing work whose own tests are red). A write
        // task now needs BOTH gates: tests green AND Batman PASS.
        if (completionOk) {
          auditAction('fury', 'REVIEW_DISPATCHED',
            `${task.id}: Batman reviewing ${result.filesWritten.length} changed file(s) against the task spec`);
          const review = await runBatmanReview(task, result);

          // The review is its own agent dispatch — charge its budget + tokens, and
          // surface its full findings as a task result.
          recordIteration(review.costUsd);
          stats.totalInputTokens += review.inputTokens;
          stats.totalOutputTokens += review.outputTokens;
          stats.totalCostUsd += review.costUsd;
          stats.taskResults.push({
            id: `${task.id}-review`,
            role: 'batman',
            status: review.verdict === 'PASS' ? 'completed' : 'failed',
            response: review.response,
          });
          const verdictLabel = review.unreadRequiredFiles.length > 0
            ? `FAIL (forced — unread required file: ${review.unreadRequiredFiles.join(', ')})`
            : review.parsed ? review.verdict : 'UNPARSEABLE → FAIL (fail-closed)';
          auditAction('batman', 'REVIEW_VERDICT', `${task.id}: ${verdictLabel}`);

          const reviewDecision = decideReviewOutcome(review.verdict);
          reviewOutcome = reviewDecision.reviewOutcome;
          if (!reviewDecision.completionOk) {
            completionOk = false;
            const why = review.unreadRequiredFiles.length > 0
              ? `could not read required file(s): ${review.unreadRequiredFiles.join(', ')} — review on partial info refused`
              : review.parsed ? 'VERDICT: FAIL' : 'no parseable VERDICT line — fail-closed';
            failureReason = `${reviewDecision.failureReasonPrefix} (${why}). Findings:\n${review.response}`;
            await notifyHuman(
              `[PropScout Agents] ${task.id} FAILED Batman review (${why}) and is STOPPED, waiting on you. ` +
              'It passed its tests but did not satisfy the spec review. It was NOT auto-sent back to the ' +
              'Builder. See the audit log / task results for Batman\'s findings.',
            );
          }
        }
      }

      // Budget and token totals are charged whether the task passed or failed —
      // the work consumed real tokens either way.
      recordIteration(costUsd);
      stats.totalInputTokens += inputTokens;
      stats.totalOutputTokens += outputTokens;
      stats.totalCostUsd += costUsd;

      if (completionOk) {
        markCompleted(task.id, response.slice(0, 500));
        stats.tasksCompleted++;
        stats.taskResults.push({ id: task.id, role: task.role, status: 'completed', response });
        const tag = reviewOutcome === 'pass' ? 'verified-and-reviewed' : 'verified';
        auditAction('fury', 'TASK_DONE', `${task.id}: ${toolCallCount} tool calls, $${costUsd.toFixed(4)}, ${tag}`);
      } else {
        markFailed(task.id, failureReason);
        stats.tasksFailed++;
        stats.taskResults.push({ id: task.id, role: task.role, status: 'failed', response, failureReason });
        const event = reviewOutcome === 'fail' ? 'TASK_FAILED_REVIEW' : 'TASK_FAILED';
        auditAction('fury', event, `${task.id}: ${failureReason.slice(0, 300)}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      markFailed(task.id, msg);
      stats.tasksFailed++;
      stats.taskResults.push({ id: task.id, role: task.role, status: 'failed', response: '', failureReason: msg });
      recordIteration(0);
      auditAction('fury', 'TASK_FAILED', `${task.id}: ${msg.slice(0, 200)}`);
    }
  }

  const budgetState = getBudgetState();
  auditAction('fury', 'LOOP_END', [
    `iterations=${stats.iterationsRun}`,
    `completed=${stats.tasksCompleted}`,
    `failed=${stats.tasksFailed}`,
    `rejected=${stats.tasksRejected}`,
    `tokens=${stats.totalInputTokens}in/${stats.totalOutputTokens}out`,
    `cost=$${stats.totalCostUsd.toFixed(4)}`,
    `budget_used=${budgetState.iterationsUsed}/${budgetState.iterationCap}`,
    `halt=${stats.haltReason}`,
  ].join(' | '));

  // Per-run cost reconciliation line (grep RUN_COST_ESTIMATE to reconcile).
  logRunCostEstimate();

  return stats;
}
