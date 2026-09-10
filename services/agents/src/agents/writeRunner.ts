import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { execSync } from 'child_process';
import { ENV } from '../config.js';
import { auditAction } from '../audit/heimdall.js';
import { AGENT_TOOL_SETS } from '../types.js';
import type { AgentRole } from '../types.js';
import { resolveSandboxPath, checkCommandAllowed, isVerificationCommand, SANDBOX_ROOT } from '../safety/sandbox.js';
import { gateCheck, classifyActionFailClosed } from '../safety/gate.js';
import { approveMode } from '../safety/approveSemantics.js';

const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

const SONNET_INPUT_COST_PER_TOKEN = 3.0 / 1_000_000;
const SONNET_OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000;
const REPO_ROOT = 'c:/Users/zain0/OneDrive/Desktop/PropScout';

// Read tools — available to every agent.
const READ_TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read a file from the PropScout repository (read-only, whole repo).',
    input_schema: {
      type: 'object' as const,
      properties: { path: { type: 'string', description: 'Relative path from repo root' } },
      required: ['path'],
    },
  },
  {
    name: 'grep_codebase',
    description: 'Search for a regex pattern across the codebase.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string' },
        glob: { type: 'string', description: 'Optional file glob' },
      },
      required: ['pattern'],
    },
  },
];

// Write tools — confined to the sandbox by safety/sandbox.ts.
const WRITE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'write_sandbox_file',
    description: 'Write a file inside the agent sandbox (services/agents/sandbox/). Cannot write outside the sandbox. Use a path relative to the sandbox root.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Path relative to the sandbox root (e.g. "utils/format.ts")' },
        content: { type: 'string', description: 'Full file contents' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_sandbox_file',
    description: 'Read a file you previously wrote inside the sandbox.',
    input_schema: {
      type: 'object' as const,
      properties: { path: { type: 'string', description: 'Path relative to the sandbox root' } },
      required: ['path'],
    },
  },
];

// Test/command tool — restricted to an allowlist (no prod, no DB, no deploy).
const TEST_TOOLS: Anthropic.Tool[] = [
  {
    name: 'run_command',
    description: 'Run an allowlisted test/build command (npm test, npx tsc, pytest, etc.). Prod/DB/deploy commands are blocked — those require the escalation gate.',
    input_schema: {
      type: 'object' as const,
      properties: { command: { type: 'string', description: 'The command to run' } },
      required: ['command'],
    },
  },
];

// The ONLY path to a prod-touching action. This tool does NOT execute
// anything — it routes the request through the human escalation gate.
const PROD_REQUEST_TOOL: Anthropic.Tool = {
  name: 'request_prod_action',
  description: 'Request a production-touching action (DB write, migration, deploy). This does NOT execute — it routes to the human for Telegram approval. Use ONLY when the task genuinely requires touching prod.',
  input_schema: {
    type: 'object' as const,
    properties: {
      action: { type: 'string', description: 'The prod action, described precisely (e.g. "upsert 500 comps into prod rental_comps")' },
      detail: { type: 'string', description: 'Why this is needed and exactly what it changes' },
    },
    required: ['action', 'detail'],
  },
};

function getToolsForRole(role: AgentRole): Anthropic.Tool[] {
  const config = AGENT_TOOL_SETS[role];
  const tools: Anthropic.Tool[] = [...READ_TOOLS];
  if (config.tools.includes('write')) {
    tools.push(...WRITE_TOOLS);
  }
  if (config.tools.includes('bash')) {
    tools.push(...TEST_TOOLS);
  }
  // Every write-capable agent also gets the prod-request tool (gated).
  if (!config.readOnly) {
    tools.push(PROD_REQUEST_TOOL);
  }
  return tools;
}

export interface WriteAgentTask {
  id: string;
  role: AgentRole;
  prompt: string;
  systemPrompt: string;
}

/** One run of an allowlisted command, with the REAL exit code it returned. */
export interface CommandRun {
  command: string;
  exitCode: number;
  /** True if this is a test/typecheck/lint/build command (a pass/fail gate). */
  isVerification: boolean;
}

export interface VerificationSummary {
  ranVerification: boolean;
  verificationPassed: boolean;
  lastVerificationCommand: string | null;
  lastVerificationExitCode: number | null;
}

/**
 * Derive verification truth from the real exit codes of the commands an agent ran.
 * Pure and side-effect free so it can be unit-tested without the API or sandbox.
 *
 * The success signal keys off the LAST verification command, not all of them, so a
 * legitimate red→green cycle (fail, fix, re-run, pass) counts as a pass while a
 * green→red cycle (last run fails) counts as a fail.
 */
export function computeVerification(commandRuns: CommandRun[]): VerificationSummary {
  const verificationRuns = commandRuns.filter((c) => c.isVerification);
  const last = verificationRuns.length > 0 ? verificationRuns[verificationRuns.length - 1] : null;
  return {
    ranVerification: verificationRuns.length > 0,
    verificationPassed: last !== null && last.exitCode === 0,
    lastVerificationCommand: last?.command ?? null,
    lastVerificationExitCode: last?.exitCode ?? null,
  };
}

export interface WriteAgentResult {
  taskId: string;
  role: AgentRole;
  response: string;
  toolCalls: string[];
  filesWritten: string[];
  prodRequests: { action: string; decision: string }[];
  /** Every command the agent ran, each with its real exit code. */
  commandRuns: CommandRun[];
  /** True if at least one verification command (tests/typecheck) actually executed. */
  ranVerification: boolean;
  /**
   * The ground-truth success signal. True ONLY when a verification command ran
   * AND the most recent verification command returned exit code 0. This does not
   * depend on the agent's text response — an agent claiming "done" cannot set it.
   */
  verificationPassed: boolean;
  /** The last verification command run (null if none ran). */
  lastVerificationCommand: string | null;
  /** The exit code of the last verification command (null if none ran). */
  lastVerificationExitCode: number | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function runWriteAgent(task: WriteAgentTask): Promise<WriteAgentResult> {
  const tools = getToolsForRole(task.role);
  const agentName = AGENT_TOOL_SETS[task.role].name;

  auditAction(agentName, 'AGENT_START', `Task ${task.id}: ${task.prompt.slice(0, 100)}`);

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: task.prompt }];

  let totalInput = 0;
  let totalOutput = 0;
  const toolCallLog: string[] = [];
  const filesWritten: string[] = [];
  const prodRequests: { action: string; decision: string }[] = [];
  const commandRuns: CommandRun[] = [];
  let finalText = '';

  for (let turn = 0; turn < 12; turn++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: task.systemPrompt,
      tools,
      messages,
    });

    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;

    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');
    if (textBlocks.length > 0) finalText = textBlocks.map((b) => b.text).join('\n');

    if (response.stop_reason === 'end_turn') break;
    if (response.stop_reason !== 'tool_use') break;

    const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const toolInput = toolUse.input as Record<string, string>;
      toolCallLog.push(`${toolUse.name}(${JSON.stringify(toolInput).slice(0, 120)})`);

      const { output, isError } = await executeWriteTool(
        agentName, toolUse.name, toolInput, filesWritten, prodRequests, commandRuns,
      );

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: output,
        is_error: isError,
      });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  // --- Verification truth: derived from REAL exit codes, never from the agent's text. ---
  const verification = computeVerification(commandRuns);

  const costUsd = totalInput * SONNET_INPUT_COST_PER_TOKEN + totalOutput * SONNET_OUTPUT_COST_PER_TOKEN;
  auditAction(
    agentName,
    'AGENT_DONE',
    `Task ${task.id}: ${totalInput}in/${totalOutput}out $${costUsd.toFixed(4)} files=${filesWritten.length} ` +
      `verify=${verification.ranVerification ? `${verification.lastVerificationCommand} exit=${verification.lastVerificationExitCode}` : 'NONE'} ` +
      `passed=${verification.verificationPassed}`,
  );

  return {
    taskId: task.id,
    role: task.role,
    response: finalText,
    toolCalls: toolCallLog,
    filesWritten,
    prodRequests,
    commandRuns,
    ranVerification: verification.ranVerification,
    verificationPassed: verification.verificationPassed,
    lastVerificationCommand: verification.lastVerificationCommand,
    lastVerificationExitCode: verification.lastVerificationExitCode,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    costUsd,
  };
}

async function executeWriteTool(
  agentName: string,
  name: string,
  input: Record<string, string>,
  filesWritten: string[],
  prodRequests: { action: string; decision: string }[],
  commandRuns: CommandRun[],
): Promise<{ output: string; isError: boolean }> {
  try {
    switch (name) {
      case 'read_file': {
        const filePath = input.path.replace(/\.\./g, '');
        const result = execSync(`cat "${REPO_ROOT}/${filePath}"`, {
          encoding: 'utf-8', maxBuffer: 50_000, timeout: 5000,
        });
        return { output: result.slice(0, 12_000), isError: false };
      }

      case 'grep_codebase': {
        const pattern = input.pattern.replace(/[;|&$`]/g, '');
        const glob = input.glob ? `--glob "${input.glob}"` : '';
        const cmd = `rg -n --max-count 20 --glob "!node_modules" ${glob} "${pattern}" "${REPO_ROOT}" 2>NUL || echo.`;
        const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50_000, timeout: 10000, shell: 'cmd.exe' });
        return { output: result.trim().slice(0, 8_000) || 'No matches found.', isError: false };
      }

      case 'write_sandbox_file': {
        const check = resolveSandboxPath(input.path);
        if (!check.ok || !check.resolved) {
          auditAction(agentName, 'WRITE_BLOCKED', `${input.path}: ${check.reason}`);
          return { output: `WRITE BLOCKED: ${check.reason}`, isError: true };
        }
        mkdirSync(dirname(check.resolved), { recursive: true });
        writeFileSync(check.resolved, input.content, 'utf-8');
        filesWritten.push(input.path);
        auditAction(agentName, 'FILE_WRITTEN', `sandbox/${input.path} (${input.content.length} bytes)`);
        return { output: `Wrote ${input.content.length} bytes to sandbox/${input.path}`, isError: false };
      }

      case 'read_sandbox_file': {
        const check = resolveSandboxPath(input.path);
        if (!check.ok || !check.resolved) {
          return { output: `READ BLOCKED: ${check.reason}`, isError: true };
        }
        try {
          const content = readFileSync(check.resolved, 'utf-8');
          return { output: content.slice(0, 12_000), isError: false };
        } catch {
          return { output: `File not found in sandbox: ${input.path}`, isError: true };
        }
      }

      case 'run_command': {
        const check = checkCommandAllowed(input.command);
        if (!check.ok) {
          auditAction(agentName, 'COMMAND_BLOCKED', `${input.command}: ${check.reason}`);
          return { output: `COMMAND BLOCKED: ${check.reason}`, isError: true };
        }

        const isVerification = isVerificationCommand(input.command);
        let exitCode: number;
        let output: string;
        try {
          // execSync returns stdout on a 0 exit, and throws on any non-zero exit.
          output = execSync(input.command, {
            encoding: 'utf-8', maxBuffer: 100_000, timeout: 60_000,
            cwd: SANDBOX_ROOT, shell: 'cmd.exe',
          });
          exitCode = 0;
        } catch (err) {
          // Non-zero exit (test failure, tsc error, etc.). The thrown error carries
          // the REAL exit code on `.status`; a null status (killed/timeout) is a fail.
          const e = err as { stdout?: string; stderr?: string; message?: string; status?: number | null };
          output = (e.stdout ?? '') + (e.stderr ?? '') + (e.message ?? '');
          exitCode = typeof e.status === 'number' ? e.status : 1;
        }

        // Record the truth — command + real exit code — regardless of pass/fail.
        commandRuns.push({ command: input.command, exitCode, isVerification });
        auditAction(
          agentName,
          isVerification ? 'VERIFY' : 'COMMAND_RUN',
          `exit=${exitCode} :: ${input.command}`,
        );

        // The agent still sees the full output (including failures) so it can fix
        // and re-run. isError stays false: a failing test is information for the
        // agent, not a tool error. The exit code above is the gate, not this flag.
        return { output: output.slice(0, 8_000) || '(no output)', isError: false };
      }

      case 'request_prod_action': {
        // THIS IS THE GATE. Nothing executes here. We route to the human, then
        // the OUTCOME depends on the approve-semantics policy for the category.
        auditAction(agentName, 'PROD_REQUEST', `${input.action}`);
        const role = roleFromName(agentName);
        const result = await gateCheck(agentName, input.action, input.detail ?? input.action, role);

        const decision = result?.decision ?? 'no-escalation';
        prodRequests.push({ action: input.action, decision });

        // Determine the category to apply the right approve-semantics.
        const category = classifyActionFailClosed(input.action, role) ?? 'ambiguous_irreversible';
        const mode = approveMode(category);

        if (result && decision === 'reject') {
          const why = result.autoRejected ? ' (AUTO-REJECTED by watchdog — no response)' : '';
          return {
            output: `Prod action REJECTED by human${why}. The action was NOT performed. Do not retry — find another approach or stop.`,
            isError: false,
          };
        }

        if (!result) {
          return { output: `Action did not escalate (not prod-category). Nothing was performed.`, isError: false };
        }

        // APPROVED. Outcome depends on approve-semantics policy.
        if (mode === 'prepare_only') {
          auditAction(agentName, 'PROD_PREPARED', `${category}: prepared for human to apply — NOT executed`);
          return {
            output: `Prod action APPROVED with PREPARE-ONLY semantics (category: ${category}). ` +
              `The loop does NOT execute this. Your job now: write the verified artifact ` +
              `(SQL file / command / migration) into the sandbox for the human to apply by hand ` +
              `in the Supabase dashboard. Do NOT attempt to run it. Report where you saved the artifact.`,
            isError: false,
          };
        }

        // execute_on_approve (routine reversible prod writes only).
        auditAction(agentName, 'PROD_EXECUTE_APPROVED', `${category}: approved for execute-on-approve`);
        return {
          output: `Prod action APPROVED with EXECUTE-ON-APPROVE semantics (category: ${category}). ` +
            `This category permits the loop to execute a routine, reversible prod write. ` +
            `NOTE: a real DB connector is not wired in this build — record the exact idempotent ` +
            `statement you would run (keyed for reversibility) and report it.`,
          isError: false,
        };
      }

      default:
        return { output: `Unknown tool: ${name}`, isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { output: `Tool error: ${message.slice(0, 500)}`, isError: true };
  }
}

function roleFromName(name: string): AgentRole {
  for (const [role, config] of Object.entries(AGENT_TOOL_SETS)) {
    if (config.name === name) return role as AgentRole;
  }
  return 'iron_man';
}
