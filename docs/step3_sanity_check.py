"""
Step 3 sanity check — PR 2 calc-engine verification.

Run from services/calc-engine/ directory:
    python ../../docs/step3_sanity_check.py

All function names and expected values are verified against:
  - The regression test suite (tests/test_regression.py, 20/20 passing)
  - Manual Ontario LTT bracket calculation for $729,900

Correction log (2026-05-26):
  - monthly_payment          → calculate_monthly_payment  (calculations.mortgage)
  - ontario_ltt              → calculate_ontario_ltt      (calculations.closing_costs)
  - from calculations.osfi   → calculate_osfi_stress_rate (calculations.mortgage, no osfi.py)
  - compute_deal_score       → calculate_deal_score       (calculations.deal_score)
  - compute_metrics          → does not exist yet          (built in PR 4 router)
  - Expected LTT $11,475     → $11,073 (manual bracket calc confirms; regression passes)
  - Expected payment ~$3,340 → $3,327  (Canadian semi-annual compounding; regression: $3,326.64)
"""

import sys
import os

# Allow running from the docs/ directory or the repo root.
_engine = os.path.join(os.path.dirname(__file__), "..", "services", "calc-engine")
sys.path.insert(0, os.path.abspath(_engine))

from calculations.mortgage import (  # noqa: E402
    calculate_monthly_payment,
    calculate_osfi_stress_rate,
)
from calculations.closing_costs import calculate_ontario_ltt  # noqa: E402
from calculations.deal_score import calculate_deal_score  # noqa: E402

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"

failures = []

# ── Monthly mortgage payment ──────────────────────────────────────────────────
# Vaughan: $583,920 loan at 4.79%, 25yr
# Canadian semi-annual compounding: r = (1 + 0.0479/2)^(1/6) - 1 = 0.395241%/mo
# Regression-verified: $3,326.64/mo
p = calculate_monthly_payment(
    principal=583_920, annual_rate=0.0479, amortization_years=25
)
ok = abs(p - 3_327) <= 10
print(f"{PASS if ok else FAIL} Monthly payment: ${p:,.0f}  (expected $3,327 +/- $10)")
if not ok:
    failures.append(f"Monthly payment ${p:,.0f} outside ±$10 of $3,327")

# ── Ontario Land Transfer Tax ─────────────────────────────────────────────────
# $729,900 non-Toronto:
#   0.5% × $55,000     =    $275.00
#   1.0% × $195,000    =  $1,950.00
#   1.5% × $150,000    =  $2,250.00
#   2.0% × $329,900    =  $6,598.00
#                        = $11,073.00  (not $11,475 — that figure was wrong)
ltt = calculate_ontario_ltt(purchase_price=729_900)
ok = ltt == 11_073.00
print(f"{PASS if ok else FAIL} Ontario LTT:      ${ltt:,.0f}  (expected $11,073)")
if not ok:
    failures.append(f"Ontario LTT ${ltt:,.0f} != $11,073")

# ── OSFI stress rate ──────────────────────────────────────────────────────────
# Contract rate 4.79% + 2% = 6.79%  (floor 5.25% does not apply)
osfi = calculate_osfi_stress_rate(contract_rate=0.0479)
ok = abs(osfi * 100 - 6.79) < 0.01
print(f"{PASS if ok else FAIL} OSFI stress rate:  {osfi*100:.2f}%  (expected 6.79%)")
if not ok:
    failures.append(f"OSFI rate {osfi*100:.2f}% != 6.79%")

# ── Vaughan deal score ────────────────────────────────────────────────────────
score = calculate_deal_score(
    cap_rate=0.0248,
    cash_flow_monthly=-1833,
    cash_on_cash=-0.12,
    dscr=0.45,
    cmhc_vacancy_rate=0.018,
    rental_days_on_market=21,
    rent_trend="flat",
    risk_flag_deductions=5,
)
ok_score = score["total"] <= 15
ok_verdict = score["verdict"] == "hard_pass"
score_total = score["total"]
score_verdict = score["verdict"]
print(
    f"{PASS if ok_score else FAIL} Vaughan deal score: {score_total}  (expected <= 15)"
)
print(
    f"{PASS if ok_verdict else FAIL} Verdict:            {score_verdict}  (expected hard_pass)"
)
if not ok_score:
    failures.append(f'Deal score {score["total"]} > 15')
if not ok_verdict:
    failures.append(f'Verdict "{score["verdict"]}" != "hard_pass"')

# ── Summary ───────────────────────────────────────────────────────────────────
print()
if failures:
    print(f"\033[31mFAIL — {len(failures)} check(s) failed:\033[0m")
    for f in failures:
        print(f"   * {f}")
    sys.exit(1)
else:
    print("\033[32mPASS - All Step 3 sanity checks pass.\033[0m")
