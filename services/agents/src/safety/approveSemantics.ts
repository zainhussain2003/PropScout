import { ESCALATION_CATEGORIES } from '../types.js';
import type { EscalationCategory } from '../types.js';

/**
 * Approve-semantics policy.
 *
 * "Approve" does NOT uniformly mean "the loop now writes to prod." For
 * genuinely irreversible actions — schema migrations and deploys above all —
 * approve means "PREPARE the verified artifact for the human to apply by hand."
 * The loop produces the SQL / command / migration file; the human applies it
 * in the Supabase dashboard (or wherever). This matches how every migration in
 * this project has shipped, and the service-role key cannot run DDL anyway.
 *
 * Only routine, reversible prod writes MAY execute on approve.
 *
 * Default when unsure: PREPARE_ONLY. We never widen to EXECUTE by accident.
 */

export type ApproveMode = 'prepare_only' | 'execute_on_approve';

interface CategoryPolicy {
  mode: ApproveMode;
  rationale: string;
}

const POLICY: Record<EscalationCategory, CategoryPolicy> = {
  schema_migration: {
    mode: 'prepare_only',
    rationale: 'Irreversible DDL. Loop produces verified SQL; human applies it in the Supabase dashboard. Service-role key cannot run DDL.',
  },
  rls_change: {
    mode: 'prepare_only',
    rationale: 'Access-control change — a wrong RLS policy leaks data. Loop prepares the policy SQL; human applies and verifies.',
  },
  deploy: {
    mode: 'prepare_only',
    rationale: 'Deploys are hard to reverse and affect all users. Loop prepares the build/release; human triggers the deploy.',
  },
  data_deletion: {
    mode: 'prepare_only',
    rationale: 'Deletion is irreversible. Loop prepares the exact statement + a row-count preview; human runs it.',
  },
  city_source_change: {
    mode: 'prepare_only',
    rationale: 'Changing the city/source list changes what the whole scraper does. Loop prepares the diff; human applies it.',
  },
  credential_access: {
    mode: 'prepare_only',
    rationale: 'Touching secrets/keys. Loop never reads or writes credentials; human handles all key changes.',
  },
  prod_write: {
    mode: 'execute_on_approve',
    rationale: 'Routine reversible prod writes (e.g. an idempotent upsert keyed on source_url) MAY execute on approve — but each is still gated and the upsert is reversible.',
  },
  multi_segment_blast: {
    mode: 'prepare_only',
    rationale: 'Blast radius spans multiple app segments — too wide to execute unattended. Prepare and hand off.',
  },
  ambiguous_irreversible: {
    mode: 'prepare_only',
    rationale: 'Unclassified-but-risky (fail-closed default). Safe reading is prepare-only until the human disambiguates.',
  },
  builder_reviewer_disagreement: {
    mode: 'prepare_only',
    rationale: 'Unresolved disagreement — the human decides the substance, the loop does not execute either side.',
  },
};

export function approveMode(category: EscalationCategory): ApproveMode {
  return POLICY[category]?.mode ?? 'prepare_only'; // default: prepare-only
}

export function approveRationale(category: EscalationCategory): string {
  return POLICY[category]?.rationale ?? 'No explicit policy — defaulting to prepare-only.';
}

export function isPrepareOnly(category: EscalationCategory): boolean {
  return approveMode(category) === 'prepare_only';
}

export function describePolicyTable(): string {
  const rows = ESCALATION_CATEGORIES.map((cat) => {
    const p = POLICY[cat];
    return `  ${cat.padEnd(30)} | ${p.mode.padEnd(18)} | ${p.rationale}`;
  });
  return [
    `  ${'Category'.padEnd(30)} | ${'Approve means'.padEnd(18)} | Rationale`,
    '  ' + '-'.repeat(100),
    ...rows,
  ].join('\n');
}
