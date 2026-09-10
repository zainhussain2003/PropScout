export const ESCALATION_CATEGORIES = [
  'schema_migration',
  'prod_write',
  'deploy',
  'data_deletion',
  'city_source_change',
  'credential_access',
  'rls_change',
  'multi_segment_blast',
  'ambiguous_irreversible',
  'builder_reviewer_disagreement',
] as const;

export type EscalationCategory = typeof ESCALATION_CATEGORIES[number];

export type ApprovalDecision = 'approve' | 'reject';

export interface EscalationRequest {
  action: string;
  category: EscalationCategory;
  agent: string;
  detail: string;
  timestamp: string;
}

export interface ApprovalResult {
  decision: ApprovalDecision;
  respondedAt: string;
  requestedAt: string;
  /** True when the decision came from the no-response watchdog, not a human tap. */
  autoRejected?: boolean;
}

/** No-response watchdog: minutes to wait before AUTO-REJECT. Never auto-approves. */
export const APPROVAL_TIMEOUT_MINUTES = 30;

export type AgentRole =
  | 'fury'
  | 'iron_man'
  | 'spider_man'
  | 'vision'
  | 'doctor_strange'
  | 'flash'
  | 'cyborg'
  | 'hawkeye'
  | 'batman'
  | 'oracle'
  | 'black_widow'
  | 'heimdall'
  | 'jarvis';

export type ToolPermission = 'read' | 'write' | 'bash' | 'web';

export interface AgentConfig {
  role: AgentRole;
  name: string;
  tools: ToolPermission[];
  readOnly: boolean;
}

export const AGENT_TOOL_SETS: Record<AgentRole, AgentConfig> = {
  fury:          { role: 'fury',          name: 'Nick Fury',      tools: [],                          readOnly: true },
  iron_man:      { role: 'iron_man',      name: 'Iron Man',       tools: ['read', 'write', 'bash'],   readOnly: false },
  spider_man:    { role: 'spider_man',    name: 'Spider-Man',     tools: ['read', 'write', 'bash', 'web'], readOnly: false },
  vision:        { role: 'vision',        name: 'Vision',         tools: ['read', 'write', 'bash'],   readOnly: false },
  doctor_strange:{ role: 'doctor_strange',name: 'Doctor Strange', tools: ['read', 'write', 'bash'],   readOnly: false },
  flash:         { role: 'flash',         name: 'The Flash',      tools: ['read', 'write', 'bash'],   readOnly: false },
  cyborg:        { role: 'cyborg',        name: 'Cyborg',         tools: ['read', 'write', 'bash'],   readOnly: false },
  hawkeye:       { role: 'hawkeye',       name: 'Hawkeye',        tools: ['read', 'write', 'bash', 'web'], readOnly: false },
  batman:        { role: 'batman',        name: 'Batman',         tools: ['read'],                    readOnly: true },
  oracle:        { role: 'oracle',        name: 'Oracle',         tools: ['read', 'web'],             readOnly: true },
  black_widow:   { role: 'black_widow',   name: 'Black Widow',   tools: ['read'],                    readOnly: true },
  heimdall:      { role: 'heimdall',      name: 'Heimdall',       tools: ['read'],                    readOnly: true },
  jarvis:        { role: 'jarvis',        name: 'Jarvis',         tools: [],                          readOnly: true },
};

export interface AuditEntry {
  timestamp: string;
  agent: string;
  event: string;
  detail: string;
  category?: EscalationCategory;
  decision?: ApprovalDecision;
}

export interface BudgetState {
  iterationsUsed: number;
  iterationCap: number;
  estimatedCostUsd: number;
  costCapUsd: number;
  killed: boolean;
}

export interface LoopConfig {
  maxIterations: number;
  maxCostUsd: number;
}
