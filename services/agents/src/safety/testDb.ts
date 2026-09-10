import { ENV } from '../config.js';
import { auditAction } from '../audit/heimdall.js';

/**
 * Test-DB isolation for Cyborg (Supabase integration tests).
 *
 * Cyborg's integration tests must run against a TEST database target, never
 * the production rental_listings / analyses tables. This module resolves the
 * test target and refuses to hand back the prod URL.
 *
 * The prod Supabase URL lives in SUPABASE_URL. The test target must be a
 * SEPARATE project (TEST_SUPABASE_URL) or a local stack
 * (http://localhost:54321). If neither is set, Cyborg gets NO database
 * target at all — it cannot fall back to prod.
 */

const PROD_SUPABASE_URL = ENV.supabaseUrl;

export interface TestDbTarget {
  available: boolean;
  url?: string;
  reason?: string;
  isProd: boolean;
}

export function resolveTestDbTarget(): TestDbTarget {
  const testUrl = process.env.TEST_SUPABASE_URL?.trim();
  const localUrl = process.env.LOCAL_SUPABASE_URL?.trim();

  const candidate = testUrl || localUrl;

  if (!candidate) {
    auditAction('cyborg', 'TESTDB_NONE', 'No TEST_SUPABASE_URL or LOCAL_SUPABASE_URL set — Cyborg gets no DB target (cannot fall back to prod)');
    return {
      available: false,
      isProd: false,
      reason: 'No test DB configured. Set TEST_SUPABASE_URL or LOCAL_SUPABASE_URL. Cyborg will NOT fall back to prod.',
    };
  }

  // Hard guard: the test target must NOT equal the prod URL.
  if (PROD_SUPABASE_URL && candidate === PROD_SUPABASE_URL) {
    auditAction('cyborg', 'TESTDB_REJECTED', 'Test DB target equals prod URL — REJECTED');
    return {
      available: false,
      isProd: true,
      reason: 'Test DB target is identical to the prod URL. Refusing to run tests against prod.',
    };
  }

  auditAction('cyborg', 'TESTDB_RESOLVED', `Test DB target: ${candidate.slice(0, 40)}...`);
  return { available: true, url: candidate, isProd: false };
}

export function getProdUrlForComparison(): string {
  // Exposed only for the isolation test to PROVE test != prod.
  return PROD_SUPABASE_URL;
}
