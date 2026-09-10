import Anthropic from '@anthropic-ai/sdk';
import { existsSync, statSync, readFileSync } from 'fs';
import { ENV } from '../config.js';
import { auditAction } from '../audit/heimdall.js';
import type { AgentRole } from '../types.js';
import { AGENT_TOOL_SETS } from '../types.js';

const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

const REPO_ROOT = 'c:/Users/zain0/OneDrive/Desktop/PropScout';

/**
 * Resolve a read path to an absolute repo path. Accepts repo-root-relative paths
 * (e.g. "apps/api/src/app.ts") AND sandbox-relative shorthand: a leading
 * "sandbox/..." is rewritten to "services/agents/sandbox/...", so both
 * "sandbox/scratch/x.ts" and "services/agents/sandbox/scratch/x.ts" find the same
 * file instead of one silently resolving to a non-existent repo-root path.
 * The `..` strip preserves the existing path-traversal guard.
 */
function resolveReadPath(requestedPath: string): string {
  let p = requestedPath.replace(/\.\./g, '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (p.startsWith('sandbox/')) p = `services/agents/${p}`;
  return `${REPO_ROOT}/${p}`;
}

const READ_ONLY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read a file from the PropScout repository. Returns the file contents.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Repo-root-relative path (e.g. "apps/api/src/app.ts"). Sandbox files may use the "sandbox/..." shorthand or the full "services/agents/sandbox/..." path.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'grep_codebase',
    description: 'Search for a pattern across the PropScout codebase. Returns matching file paths and line numbers.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for' },
        glob: { type: 'string', description: 'Optional glob to restrict file types (e.g. "*.ts")' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'list_files',
    description: 'List files matching a glob pattern in the PropScout repo.',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g. "apps/api/src/**/*.ts")' },
      },
      required: ['pattern'],
    },
  },
];

function getToolsForRole(role: AgentRole): Anthropic.Tool[] {
  const config = AGENT_TOOL_SETS[role];
  if (!config || config.readOnly) return READ_ONLY_TOOLS;
  return READ_ONLY_TOOLS;
}

export interface AgentTask {
  id: string;
  role: AgentRole;
  prompt: string;
  systemPrompt: string;
}

export interface AgentResult {
  taskId: string;
  role: AgentRole;
  response: string;
  toolCalls: string[];
  /** read_file calls that could not return a file (not found / is a directory). */
  readFailures: string[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const SONNET_INPUT_COST_PER_TOKEN = 3.0 / 1_000_000;
const SONNET_OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000;

export async function runAgent(task: AgentTask): Promise<AgentResult> {
  const tools = getToolsForRole(task.role);
  const agentName = AGENT_TOOL_SETS[task.role].name;

  auditAction(agentName, 'AGENT_START', `Task ${task.id}: ${task.prompt.slice(0, 100)}`);

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: task.prompt },
  ];

  let totalInput = 0;
  let totalOutput = 0;
  const toolCallLog: string[] = [];
  const readFailures: string[] = [];
  let finalText = '';

  for (let turn = 0; turn < 10; turn++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: task.systemPrompt,
      tools,
      messages,
    });

    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    );
    if (textBlocks.length > 0) {
      finalText = textBlocks.map(b => b.text).join('\n');
    }

    if (response.stop_reason === 'end_turn') {
      break;
    }

    if (response.stop_reason !== 'tool_use') {
      break;
    }

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const toolInput = toolUse.input as Record<string, string>;
      toolCallLog.push(`${toolUse.name}(${JSON.stringify(toolInput)})`);
      auditAction(agentName, 'TOOL_CALL', `${toolUse.name}: ${JSON.stringify(toolInput).slice(0, 200)}`);

      const result = await executeReadOnlyTool(toolUse.name, toolInput, readFailures);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  const costUsd =
    totalInput * SONNET_INPUT_COST_PER_TOKEN +
    totalOutput * SONNET_OUTPUT_COST_PER_TOKEN;

  auditAction(agentName, 'AGENT_DONE', `Task ${task.id}: ${totalInput}in/${totalOutput}out $${costUsd.toFixed(4)} readFailures=${readFailures.length}`);

  return {
    taskId: task.id,
    role: task.role,
    response: finalText,
    toolCalls: toolCallLog,
    readFailures,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    costUsd,
  };
}

async function executeReadOnlyTool(
  name: string,
  input: Record<string, string>,
  readFailures: string[],
): Promise<string> {
  const { execSync } = await import('child_process');
  const repoRoot = REPO_ROOT;

  try {
    switch (name) {
      case 'read_file': {
        const resolved = resolveReadPath(input.path);
        // A read that cannot return file contents is recorded as a failure so the
        // loop can fail the review loudly — it must not be swallowed as empty text.
        if (!existsSync(resolved)) {
          readFailures.push(`${input.path} (not found)`);
          return `READ FAILED: no file at "${input.path}". It does not exist. Do NOT review on partial/grep information — report that you cannot read this required file.`;
        }
        if (statSync(resolved).isDirectory()) {
          readFailures.push(`${input.path} (is a directory)`);
          return `READ FAILED: "${input.path}" is a directory, not a file. Specify a file path.`;
        }
        return readFileSync(resolved, 'utf-8').slice(0, 12_000);
      }

      case 'grep_codebase': {
        const pattern = input.pattern.replace(/[;|&$`]/g, '');
        const glob = input.glob ? `--glob "${input.glob}"` : '';
        const isWin = process.platform === 'win32';
        const nullDev = isWin ? '2>NUL' : '2>/dev/null';
        const cmd = `rg -n --max-count 20 --no-ignore-vcs --glob "!node_modules" ${glob} "${pattern}" "${repoRoot}" ${nullDev} || ${isWin ? 'echo.' : 'true'}`;
        const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50_000, timeout: 10000, shell: isWin ? 'cmd.exe' : '/bin/sh' });
        return result.trim().slice(0, 8_000) || 'No matches found.';
      }

      case 'list_files': {
        const pattern = input.pattern.replace(/[;|&$`]/g, '');
        const isWin = process.platform === 'win32';
        const cmd = isWin
          ? `powershell -NoProfile -Command "Get-ChildItem -Path '${repoRoot}' -Recurse -File -Filter '${pattern.split('/').pop() ?? '*'}' -ErrorAction SilentlyContinue | Select-Object -First 30 -ExpandProperty FullName"`
          : `find "${repoRoot}" -path "*/${pattern}" -type f 2>/dev/null | head -30 || true`;
        const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 20_000, timeout: 10000 });
        return result.trim().slice(0, 4_000) || 'No files found.';
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Tool error: ${message.slice(0, 500)}`;
  }
}
