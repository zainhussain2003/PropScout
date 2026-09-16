"""
Deal-score model versions (D-115).

The `analyses.score_version` column (migration 20260623) reserves:

  1  flat -5-per-red-flag model — every analysis stored before the tiered
     model shipped (the column's default)
  2  the mode-aware tiered/gating model that runs today: severe flags cap the
     ceiling, standard red flags deduct additively (spec §10a). From D-115 it
     has no display floor.
  3  the shadow redesign (score_v3.py): property economics and financing
     resilience scored separately, investor outcomes reported not scored,
     severe flags a risk status rather than a numeric cap. Computed and stored
     beside version 2 on every analysis; never the headline until calibrated.

The headline score a report shows is SCORE_VERSION_CURRENT. Change it only
with a calibration set and a DECISIONS entry.
"""

SCORE_VERSION_CURRENT = 2
SCORE_VERSION_SHADOW = 3
