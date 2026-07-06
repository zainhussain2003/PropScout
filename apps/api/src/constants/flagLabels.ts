/**
 * Human-readable labels for risk flag IDs surfaced by the extraction
 * pipeline (regex_rules + haiku) and the orchestrator's synthetic flags.
 *
 * Flag IDs are snake_case strings produced server-side. The UI shows the
 * label; the ID stays as the stable identifier for overrides + telemetry.
 *
 * Unknown IDs fall through to humanizeFlagId() which Title-Cases the words.
 *
 * Keep this list in sync with:
 *   - services/calc-engine/extraction/haiku_extraction.py _FLAG_IDS
 *   - services/calc-engine/extraction/regex_rules.py rule list
 */

export const FLAG_LABELS: Record<string, string> = {
  // Haiku-extracted flags (haiku_extraction.py _FLAG_IDS)
  unverified_bedroom: 'Unverified bedroom (den or office)',
  glass_door_bedroom: 'Glass-door bedroom',
  is_basement_unit: 'Basement unit',
  basement_unit: 'Basement / secondary suite',
  parking_unclear: 'Parking status unclear',
  parking_included: 'Parking included',
  illegal_unit_risk: 'Unpermitted secondary suite risk',
  special_assessment_risk: 'Special assessment / reserve fund risk',
  no_exterior_window: 'Possible no exterior window',
  pets_allowed: 'Pets allowed',
  no_pets: 'No pets',
  utilities_included: 'Utilities included',
  utilities_extra: 'Utilities extra (not included)',
  furnished: 'Furnished',
  den_present: 'Den present',
  no_smoking: 'No smoking',
  short_term_ok: 'Short-term rental allowed',
  renovation_needed: 'Needs renovation',
  new_construction: 'New construction',

  // Regex-only flags not in the Haiku set
  tenanted: 'Tenant occupied',
  str_history: 'Short-term rental history',
  needs_work: 'Sold as-is / needs work',
  recently_renovated: 'Recently renovated',

  // Legacy / spec-only flags (kept for backward compat with older clients)
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
  // Soft caution — ambiguous phrasing, a prompt to verify, NOT a confirmed claim.
  verify_history: 'Language worth verifying — ask the agent why',

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
