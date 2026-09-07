import { appendFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AuditEntry } from '../types.js';

const here = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = resolve(here, '..', '..', 'logs');
mkdirSync(LOG_DIR, { recursive: true });

function logPath(): string {
  const date = new Date().toISOString().slice(0, 10);
  return resolve(LOG_DIR, `audit-${date}.log`);
}

function formatEntry(entry: AuditEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.agent}]`,
    entry.event,
  ];
  if (entry.category) parts.push(`category=${entry.category}`);
  if (entry.decision) parts.push(`decision=${entry.decision}`);
  parts.push(entry.detail);
  return parts.join(' | ');
}

export function audit(entry: AuditEntry): void {
  const line = formatEntry(entry) + '\n';
  appendFileSync(logPath(), line, 'utf-8');
  if (process.env.AGENT_DEBUG === '1') {
    process.stderr.write(`[AUDIT] ${line}`);
  }
}

export function auditAction(agent: string, event: string, detail: string): void {
  audit({
    timestamp: new Date().toISOString(),
    agent,
    event,
    detail,
  });
}

export function auditEscalation(
  agent: string,
  category: AuditEntry['category'],
  detail: string,
  decision?: AuditEntry['decision'],
): void {
  audit({
    timestamp: new Date().toISOString(),
    agent,
    event: decision ? 'ESCALATION_RESOLVED' : 'ESCALATION_REQUESTED',
    detail,
    category,
    decision,
  });
}
