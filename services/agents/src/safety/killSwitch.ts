import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { auditAction } from '../audit/heimdall.js';
import { markKilled } from './budget.js';

const here = dirname(fileURLToPath(import.meta.url));
const KILL_FILE = resolve(here, '..', '..', 'KILL_SWITCH');

export function isKilled(): boolean {
  return existsSync(KILL_FILE);
}

export function activateKillSwitch(reason: string = 'Manual kill'): void {
  writeFileSync(KILL_FILE, `${new Date().toISOString()} — ${reason}\n`, 'utf-8');
  markKilled();
  auditAction('kill_switch', 'ACTIVATED', reason);
}

export function clearKillSwitch(): void {
  if (existsSync(KILL_FILE)) {
    unlinkSync(KILL_FILE);
    auditAction('kill_switch', 'CLEARED', 'Kill switch file removed');
  }
}

export function checkKillSwitch(): { alive: boolean; reason?: string } {
  if (isKilled()) {
    const reason = 'Kill switch file detected — halting loop cleanly';
    markKilled();
    auditAction('kill_switch', 'HALT', reason);
    return { alive: false, reason };
  }
  return { alive: true };
}
