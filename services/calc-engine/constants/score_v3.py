"""
Brackets for the version-3 shadow score (D-115). UNCALIBRATED: these are
starting points chosen to read sensibly on the calibration properties, to be
fitted against a 20–30 property set with expected verdicts before version 3
can become the headline. Every number here is a placeholder by design and
says so.

Two sub-scores, each 0–100:

  Property economics — what the asset earns regardless of who finances it
    cap rate           0–60
    operating margin   0–20   NOI / gross rent
    demand             0–20   the version-2 demand brackets, rescaled

  Financing resilience — whether THIS financing survives a bad year
    DSCR               0–50   None (no debt) = 50
    debt burden        0–25   mortgage payment / effective rental income
    rent cushion       0–25   how far rent can fall before the break-even ask
"""

# ── Property economics ────────────────────────────────────────────────────────
CAP_RATE_BRACKETS: tuple[tuple[float, int], ...] = (
    (0.060, 60),
    (0.050, 48),
    (0.040, 36),
    (0.030, 22),
    (0.020, 10),
)
CAP_RATE_MAX = 60

# NOI as a share of gross rent — how much of the rent survives operating costs.
OPERATING_MARGIN_BRACKETS: tuple[tuple[float, int], ...] = (
    (0.70, 20),
    (0.60, 15),
    (0.50, 10),
    (0.40, 5),
)
OPERATING_MARGIN_MAX = 20

# Version 2's demand component is 0–10; scale ×2.
DEMAND_SCALE = 2
DEMAND_MAX = 20

# ── Financing resilience ──────────────────────────────────────────────────────
DSCR_BRACKETS: tuple[tuple[float, int], ...] = (
    (1.50, 50),
    (1.25, 42),
    (1.10, 32),
    (1.00, 20),
    (0.85, 8),
)
DSCR_MAX = 50

# Mortgage payment as a share of effective rental income (rent after vacancy).
DEBT_BURDEN_BRACKETS: tuple[tuple[float, int], ...] = (
    (0.50, 25),
    (0.65, 18),
    (0.80, 10),
    (1.00, 4),
)
DEBT_BURDEN_MAX = 25

# (rent − break-even ask) / rent: the drop in rent the position can absorb.
RENT_CUSHION_BRACKETS: tuple[tuple[float, int], ...] = (
    (0.20, 25),
    (0.10, 18),
    (0.00, 10),
    (-0.10, 4),
)
RENT_CUSHION_MAX = 25

# Provisional composite for side-by-side comparison with version 2 only.
COMPOSITE_PROPERTY_WEIGHT = 0.6
COMPOSITE_FINANCING_WEIGHT = 0.4
