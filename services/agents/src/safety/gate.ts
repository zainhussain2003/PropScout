import { AGENT_TOOL_SETS } from '../types.js';
import { requestApproval } from '../telegram/jarvis.js';
import { auditAction, auditEscalation } from '../audit/heimdall.js';
import type {
  EscalationCategory,
  EscalationRequest,
  ApprovalResult,
  AgentRole,
  ToolPermission,
} from '../types.js';

export function classifyAction(action: string): EscalationCategory | null {
  const lower = action.toLowerCase();

  // --- Data deletion (check first — "drop table" overlaps with schema keywords) ---
  if (/\b(drop\s+table|delete\s+all|rm\s+-rf|truncate|purge|wipe|clear\s+out|remove\s+all\s+rows)\b/.test(lower))
    return 'data_deletion';

  // --- Schema migration ---
  if (/\b(migrate|migration|alter\s+table|add\s+column|ddl|create\s+table|create\s+(unique\s+)?index|createtable|schema\.(create|alter|drop))\b/.test(lower))
    return 'schema_migration';
  if (/\b(supabase\s+rpc|prisma\s+migrate|knex\.schema|raw\s+sql|execute\s+raw)\b/.test(lower))
    return 'schema_migration';

  // --- Prod writes ---
  if (/\b(insert|upsert|delete\s+from|backfill|patch\s+all|bulk\s+update)\b/.test(lower) && /\b(prod|production|live)\b/.test(lower))
    return 'prod_write';

  // --- Deploy ---
  if (/\b(deploy|push\s+to\s+(main|master|prod)|railway\s+deploy)\b/.test(lower))
    return 'deploy';

  // --- City/source list changes ---
  if (/\b(add\s+(city|source)|remove\s+(city|source)|change\s+source|enable\s+scraping|disable\s+scraping)\b/.test(lower))
    return 'city_source_change';
  if (/\b(cities\s+array|source.?list|active\s+sources)\b/.test(lower) && /\b(update|modify|change|add|remove|include)\b/.test(lower))
    return 'city_source_change';

  // --- Credential access ---
  if (/(api[_.]?key|secret[_.]?key|anon[_.]?key|service[_.]?role|_key\b)/i.test(lower) && /\b(rotate|update|change|set|modify|env)\b/.test(lower))
    return 'credential_access';
  if (/\b(credential|password)\b/.test(lower))
    return 'credential_access';

  // --- RLS / access control ---
  if (/\b(rls|row[_.]?level|policy|grant|revoke)\b/.test(lower))
    return 'rls_change';

  return null;
}

const KNOWN_SAFE_PATTERNS = [
  /^read\b/i,
  /^grep\b/i,
  /^glob\b/i,
  /^search\b/i,
  /^list\b/i,
  /^cat\b/i,
  /^find\b/i,
  /^count\b/i,
  /^check\b/i,
  /^review\b/i,
  /^analyze\b/i,
  /^run\s+(unit\s+)?test/i,
  /^run\s+the\s+(unit\s+)?test/i,
  /^typecheck\b/i,
  /^lint\b/i,
  /^summarize\b/i,
  /^explain\b/i,
  /^describe\b/i,
];

export function isKnownSafe(action: string): boolean {
  return KNOWN_SAFE_PATTERNS.some((p) => p.test(action.trim()));
}

export function classifyActionFailClosed(
  action: string,
  agentRole: AgentRole,
): EscalationCategory | null {
  const explicit = classifyAction(action);
  if (explicit) return explicit;

  if (isReadOnly(agentRole)) return null;
  if (isKnownSafe(action)) return null;

  return 'ambiguous_irreversible';
}

export function enforceToolRestriction(role: AgentRole, requestedTool: ToolPermission): boolean {
  const config = AGENT_TOOL_SETS[role];
  if (!config) return false;
  return config.tools.includes(requestedTool);
}

export function isReadOnly(role: AgentRole): boolean {
  return AGENT_TOOL_SETS[role]?.readOnly ?? true;
}

export async function gateCheck(
  agent: string,
  action: string,
  detail: string,
  agentRole?: AgentRole,
): Promise<ApprovalResult | null> {
  const category = agentRole
    ? classifyActionFailClosed(action, agentRole)
    : classifyAction(action);

  if (!category) {
    auditAction(agent, 'GATE_PASS', `Action not escalate-category: ${action}`);
    return null;
  }

  auditAction(agent, 'GATE_BLOCK', `Escalate-category detected: ${category} — ${action}`);

  const request: EscalationRequest = {
    action,
    category,
    agent,
    detail,
    timestamp: new Date().toISOString(),
  };

  const result = await requestApproval(request);

  if (result.decision === 'reject') {
    auditAction(agent, 'GATE_REJECTED', `Action rejected by human: ${action}`);
  } else {
    auditAction(agent, 'GATE_APPROVED', `Action approved by human: ${action}`);
  }

  return result;
}

export function manualEscalate(
  agent: string,
  category: EscalationCategory,
  detail: string,
): Promise<ApprovalResult> {
  auditEscalation(agent, category, detail);

  const request: EscalationRequest = {
    action: 'Manual escalation',
    category,
    agent,
    detail,
    timestamp: new Date().toISOString(),
  };

  return requestApproval(request);
}
