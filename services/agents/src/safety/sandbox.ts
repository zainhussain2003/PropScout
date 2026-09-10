import { resolve, isAbsolute, relative } from 'path';
import { auditAction } from '../audit/heimdall.js';

/**
 * Sandbox path confinement.
 *
 * All write tools route through here. A write is permitted ONLY if its
 * resolved absolute path stays inside the sandbox root (the agent work
 * area inside the repo). Anything that escapes — `..`, absolute paths,
 * symlink-style traversal — is rejected.
 *
 * There is deliberately NO prod path, NO DB connection, NO deploy command
 * reachable from any write tool. The only path to a prod-touching action
 * is the escalation gate, which requires human Telegram approval.
 */

const REPO_ROOT = resolve(
  new URL('../../../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
);

// The sandbox: a scratch area inside the agents service. Write agents may
// only create/edit files here. They may READ the wider repo (read tools),
// but they may only WRITE inside this directory.
export const SANDBOX_ROOT = resolve(REPO_ROOT, 'services', 'agents', 'sandbox');

// Hard denylist: substrings that must never appear in a write target,
// even inside the sandbox. Defense in depth against a confused agent.
const FORBIDDEN_SUBSTRINGS = [
  '.env',
  'node_modules',
  '.git',
  'supabase/migrations',
  'KILL_SWITCH',
];

export interface PathCheck {
  ok: boolean;
  resolved?: string;
  reason?: string;
}

export function resolveSandboxPath(requestedPath: string): PathCheck {
  if (isAbsolute(requestedPath)) {
    return { ok: false, reason: `Absolute paths are not allowed: ${requestedPath}` };
  }

  if (requestedPath.includes('..')) {
    return { ok: false, reason: `Path traversal (..) is not allowed: ${requestedPath}` };
  }

  const resolved = resolve(SANDBOX_ROOT, requestedPath);
  const rel = relative(SANDBOX_ROOT, resolved);

  if (rel.startsWith('..') || isAbsolute(rel)) {
    return { ok: false, reason: `Path escapes the sandbox: ${requestedPath}` };
  }

  // Normalize slashes so forward-slash substrings match Windows backslash paths.
  const normalizedResolved = resolved.toLowerCase().replace(/\\/g, '/');
  const normalizedRequest = requestedPath.toLowerCase().replace(/\\/g, '/');
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    const f = forbidden.toLowerCase().replace(/\\/g, '/');
    if (normalizedResolved.includes(f) || normalizedRequest.includes(f)) {
      return { ok: false, reason: `Path touches a forbidden target (${forbidden}): ${requestedPath}` };
    }
  }

  return { ok: true, resolved };
}

/**
 * Commands a test agent may run. Anything not on this allowlist is rejected
 * BEFORE execution. There is no `psql`, no `supabase db push`, no `railway`,
 * no `git push` here — those are escalate-category and go through the gate.
 */
const ALLOWED_COMMAND_PREFIXES = [
  'npm test',
  'npm run test',
  'npm run typecheck',
  'npm run lint',
  'npx tsc',
  'npx jest',
  'npx vitest',
  'pytest',
  'python -m pytest',
  'node ',
  'npx tsx',
];

// The subset of allowed commands that constitute a real pass/fail VERIFICATION
// of an agent's work: tests, typecheck, lint, build. A non-zero exit from one of
// these is the ground truth for "the work is broken". Deliberately EXCLUDES the
// arbitrary script runners (`node `, `npx tsx`) — running `node hello.js` and
// getting exit 0 must NOT count as proof a task succeeded.
const VERIFICATION_COMMAND_PREFIXES = [
  'npm test',
  'npm run test',
  'npm run typecheck',
  'npm run lint',
  'npx tsc',
  'npx jest',
  'npx vitest',
  'pytest',
  'python -m pytest',
];

const FORBIDDEN_COMMAND_SUBSTRINGS = [
  'supabase',
  'psql',
  'railway',
  'deploy',
  'git push',
  'git commit',
  'rm -rf',
  'curl',
  'wget',
  'DROP',
  'TRUNCATE',
  'DELETE FROM',
  '> .env',
  'prod',
];

export interface CommandCheck {
  ok: boolean;
  reason?: string;
}

export function checkCommandAllowed(command: string): CommandCheck {
  const lower = command.toLowerCase();

  for (const forbidden of FORBIDDEN_COMMAND_SUBSTRINGS) {
    if (lower.includes(forbidden.toLowerCase())) {
      auditAction('sandbox', 'COMMAND_BLOCKED', `Forbidden substring "${forbidden}": ${command}`);
      return { ok: false, reason: `Command contains forbidden substring "${forbidden}". Prod-touching commands must go through the escalation gate.` };
    }
  }

  const allowed = ALLOWED_COMMAND_PREFIXES.some((prefix) =>
    command.trim().startsWith(prefix)
  );

  if (!allowed) {
    auditAction('sandbox', 'COMMAND_BLOCKED', `Not on allowlist: ${command}`);
    return { ok: false, reason: `Command not on the allowlist. Allowed: ${ALLOWED_COMMAND_PREFIXES.join(', ')}` };
  }

  return { ok: true };
}

/**
 * Is this command a verification command — one whose exit code provably means
 * the agent's work passed or failed? Used by the loop to gate task completion:
 * a write task may only be marked `completed` if such a command actually ran and
 * returned exit code 0. An allowlisted-but-non-verifying command (e.g. a bare
 * `node script.js`) returns false and cannot satisfy the completion gate.
 */
export function isVerificationCommand(command: string): boolean {
  const trimmed = command.trim();
  return VERIFICATION_COMMAND_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

export function describeScopes(): string {
  return [
    `Sandbox root (write area): ${SANDBOX_ROOT}`,
    `Repo root (read-only for agents): ${REPO_ROOT}`,
    `Forbidden write substrings: ${FORBIDDEN_SUBSTRINGS.join(', ')}`,
    `Allowed command prefixes: ${ALLOWED_COMMAND_PREFIXES.join(', ')}`,
    `Forbidden command substrings: ${FORBIDDEN_COMMAND_SUBSTRINGS.join(', ')}`,
  ].join('\n');
}
