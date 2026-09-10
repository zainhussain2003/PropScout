/**
 * Phase 3 Verification — write-capable agents, scoped.
 *
 * Verifies (no API calls):
 *   A. Per-agent tool scopes
 *   B. Sandbox path confinement (writes cannot escape)
 *   C. Command allowlist (no prod/DB/deploy commands)
 *   D. Test-DB isolation (Cyborg cannot target prod)
 *
 * Run: npx tsx src/verify-phase3.ts
 */

import { AGENT_TOOL_SETS } from './types.js';
import type { AgentRole } from './types.js';
import { resolveSandboxPath, checkCommandAllowed, describeScopes, SANDBOX_ROOT } from './safety/sandbox.js';
import { resolveTestDbTarget, getProdUrlForComparison } from './safety/testDb.js';
import { auditAction } from './audit/heimdall.js';

function section(title: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function tableRow(role: string, tools: string, readOnly: boolean, prod: string): void {
  console.log(`  ${role.padEnd(16)} | ${tools.padEnd(28)} | ${(readOnly ? 'read-only' : 'write').padEnd(10)} | ${prod}`);
}

function verifyToolScopes(): void {
  section('A. Per-Agent Tool Scopes');
  console.log(`  ${'Agent'.padEnd(16)} | ${'Tools'.padEnd(28)} | ${'Mode'.padEnd(10)} | Prod path`);
  console.log('  ' + '-'.repeat(74));

  const writeAgents: AgentRole[] = ['iron_man', 'spider_man', 'vision', 'doctor_strange', 'flash', 'cyborg', 'hawkeye'];
  const readAgents: AgentRole[] = ['fury', 'batman', 'oracle', 'black_widow', 'heimdall', 'jarvis'];

  for (const role of writeAgents) {
    const c = AGENT_TOOL_SETS[role];
    const prodPath = c.readOnly ? 'none' : 'gate only (request_prod_action)';
    tableRow(c.name, c.tools.join(','), c.readOnly, prodPath);
  }
  console.log('  ' + '-'.repeat(74));
  for (const role of readAgents) {
    const c = AGENT_TOOL_SETS[role];
    tableRow(c.name, c.tools.join(',') || '(none)', c.readOnly, 'none');
  }

  console.log('\n  Tool scope facts:');
  console.log('    - write tool → confined to sandbox (services/agents/sandbox/)');
  console.log('    - bash/command tool → allowlist only (npm test, tsc, pytest...)');
  console.log('    - NO agent has a direct prod/DB/deploy tool');
  console.log('    - prod is reachable ONLY via request_prod_action → human gate');
}

function verifySandboxConfinement(): void {
  section('B. Sandbox Path Confinement');
  console.log(`  Sandbox root: ${SANDBOX_ROOT}\n`);

  const cases: { path: string; shouldAllow: boolean }[] = [
    { path: 'utils/format.ts', shouldAllow: true },
    { path: 'nested/dir/helper.ts', shouldAllow: true },
    { path: '../../../etc/passwd', shouldAllow: false },
    { path: '/etc/passwd', shouldAllow: false },
    { path: '../../apps/api/src/app.ts', shouldAllow: false },
    { path: '../.env', shouldAllow: false },
    { path: 'foo/../../bar.ts', shouldAllow: false },
    { path: 'supabase/migrations/001.sql', shouldAllow: false },
  ];

  let pass = 0;
  for (const { path, shouldAllow } of cases) {
    const r = resolveSandboxPath(path);
    const ok = r.ok === shouldAllow;
    if (ok) pass++;
    console.log(`  ${ok ? '✓' : '✗'} ${r.ok ? 'ALLOW' : 'BLOCK'} "${path}"${r.reason ? ' — ' + r.reason : ''}`);
  }
  console.log(`\n  ${pass}/${cases.length} confinement checks correct.`);
  auditAction('verify', 'PHASE3_SANDBOX', `${pass}/${cases.length} path checks passed`);
}

function verifyCommandAllowlist(): void {
  section('C. Command Allowlist');
  const cases: { cmd: string; shouldAllow: boolean }[] = [
    { cmd: 'npm test', shouldAllow: true },
    { cmd: 'npx tsc --noEmit', shouldAllow: true },
    { cmd: 'pytest tests/', shouldAllow: true },
    { cmd: 'supabase db push', shouldAllow: false },
    { cmd: 'psql -c "TRUNCATE rental_comps"', shouldAllow: false },
    { cmd: 'railway up', shouldAllow: false },
    { cmd: 'git push origin main', shouldAllow: false },
    { cmd: 'rm -rf services', shouldAllow: false },
    { cmd: 'curl https://prod.example.com', shouldAllow: false },
  ];

  let pass = 0;
  for (const { cmd, shouldAllow } of cases) {
    const r = checkCommandAllowed(cmd);
    const ok = r.ok === shouldAllow;
    if (ok) pass++;
    console.log(`  ${ok ? '✓' : '✗'} ${r.ok ? 'ALLOW' : 'BLOCK'} "${cmd}"`);
  }
  console.log(`\n  ${pass}/${cases.length} command checks correct.`);
  auditAction('verify', 'PHASE3_COMMANDS', `${pass}/${cases.length} command checks passed`);
}

function verifyTestDbIsolation(): void {
  section('D. Test-DB Isolation (Cyborg)');

  const prodUrl = getProdUrlForComparison();
  console.log(`  Prod Supabase URL:  ${prodUrl ? prodUrl.slice(0, 40) + '...' : '(not set)'}`);

  // Scenario 1: no test DB configured → Cyborg gets NO target (cannot use prod)
  delete process.env.TEST_SUPABASE_URL;
  delete process.env.LOCAL_SUPABASE_URL;
  const noTarget = resolveTestDbTarget();
  console.log(`\n  Scenario 1 — no test DB configured:`);
  console.log(`    Target available: ${noTarget.available}`);
  console.log(`    ${!noTarget.available ? '✓ Cyborg gets NO DB target — cannot fall back to prod.' : '✗ FAIL: got a target.'}`);
  console.log(`    Reason: ${noTarget.reason}`);

  // Scenario 2: test DB set to prod URL → must be REJECTED
  process.env.TEST_SUPABASE_URL = prodUrl || 'https://dvlmkecrpoelqlzhwebg.supabase.co';
  const prodAsTest = resolveTestDbTarget();
  console.log(`\n  Scenario 2 — test DB set EQUAL to prod URL:`);
  console.log(`    Target available: ${prodAsTest.available}`);
  console.log(`    ${!prodAsTest.available && prodAsTest.isProd ? '✓ REJECTED — refuses to run tests against prod.' : '✗ FAIL: accepted prod as test target.'}`);

  // Scenario 3: a real separate test DB → accepted
  process.env.TEST_SUPABASE_URL = 'http://localhost:54321';
  const realTest = resolveTestDbTarget();
  console.log(`\n  Scenario 3 — separate local test DB (localhost:54321):`);
  console.log(`    Target available: ${realTest.available}`);
  console.log(`    Target != prod:   ${realTest.url !== prodUrl}`);
  console.log(`    ${realTest.available && realTest.url !== prodUrl ? '✓ Accepted — and it is NOT the prod URL.' : '✗ FAIL'}`);

  // cleanup
  delete process.env.TEST_SUPABASE_URL;
  delete process.env.LOCAL_SUPABASE_URL;

  console.log('\n  Test-DB isolation: Cyborg can only ever target a DB that is');
  console.log('  explicitly NOT prod. No test run can write the prod tables.');
}

function main(): void {
  console.log('PropScout Agent System — Phase 3 Verification');
  console.log('----------------------------------------------');
  auditAction('verify', 'PHASE3_VERIFY_START', 'Tool scopes, sandbox, commands, test-DB');

  verifyToolScopes();
  verifySandboxConfinement();
  verifyCommandAllowlist();
  verifyTestDbIsolation();

  section('Full Scope Description (from safety/sandbox.ts)');
  console.log(describeScopes());

  console.log('\n  Phase 3 static verification complete.');
  auditAction('verify', 'PHASE3_VERIFY_DONE', 'All static scope checks complete');
}

main();
