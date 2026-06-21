/**
 * Human-readable labels for risk flag IDs surfaced by the extraction
 * pipeline (regex_rules + haiku) and the orchestrator's synthetic flags.
 *
 * Flag IDs are snake_case strings produced server-side. The UI shows the
 * label; the ID stays as the stable identifier for overrides + telemetry.
 *
 * Unknown IDs fall through to humanizeFlagId() which Title-Cases the words.
 */

export const FLAG_LABELS: Record<string, string> = {
  // Extraction-pipeline flags (spec Section 19)
  basement_suite: 'Basement suite',
  short_term_rental: 'Short-term rental setup',
  shared_laundry: 'Shared laundry',
  coin_laundry: 'Coin laundry',
  street_parking_only: 'Street parking only',
  first_floor_unit: 'Ground floor unit',
  condo_fee_includes_utilities: 'Condo fee includes utilities',
  tenant_occupied: 'Tenant occupied',
  power_of_sale: 'Power of sale',
  as_is_where_is: 'Sold as-is',
  no_representation: 'No seller representation',
  grow_op_history: 'Grow-op history',
  remediation_done: 'Remediation completed',
  flooding_history: 'Flooding history',
  noise_concern: 'Noise concern',

  // Orchestrator-synthetic structural flags
  condo_fee_unknown: 'Condo fee not disclosed',
  pre_1980_build: 'Pre-1980 build — knob & tube risk',
  high_dom: 'Long days on market',
}

/**
 * Title-Case fallback for unknown flag IDs.
 *   'water_damage' → 'Water Damage'
 */
export function humanizeFlagId(id: string): string {
  if (!id) return ''
  return id
    .split('_')
    .map((w) => (w.length === 0 ? '' : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

/** Look up the human-readable label, falling back to Title Case of the id. */
export function flagLabel(id: string): string {
  return FLAG_LABELS[id] ?? humanizeFlagId(id)
}
