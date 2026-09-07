"""
alarm_decision.py

Decides the scraper-yield alarm outcome for a single run given the
per-(source, city) classification results produced by the classifier.

This module is intentionally narrow: it only owns the decision + exit-code
logic.  It does NOT call sys.exit, reach out to the classifier, or do any
aggregation/orchestration — callers own those concerns.

Ported 1-to-1 from services/agents/sandbox/scratch/yieldAlarm/alarmDecision.ts.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Sequence

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

CityClassification = Literal["OK", "BLOCKED", "TRANSIENT", "NEEDS_REVIEW"]


@dataclass(frozen=True)
class CityResult:
    """Identity key + classification for a single (source, city) pair."""

    source: str
    """Scrape-source identifier, e.g. 'zillow', 'redfin'."""
    city: str
    """City slug, e.g. 'austin-tx'."""
    classification: CityClassification
    """Classification assigned by the classifier."""


AlarmLevel = Literal["HARD", "SOFT", "NONE"]
"""
HARD — at least one city is BLOCKED.  Caller MUST exit non-zero.
SOFT — no BLOCKED cities, but at least one NEEDS_REVIEW.  Caller exits 0.
NONE — all cities are OK or TRANSIENT.  Caller exits 0, no notification.
"""


@dataclass(frozen=True)
class AlarmSummary:
    """Human-readable summary embedded in every notification payload."""

    blocked_cities: list[str] = field(default_factory=list)
    """City slugs that were BLOCKED, sorted for deterministic output."""
    needs_review_cities: list[str] = field(default_factory=list)
    """City slugs that were NEEDS_REVIEW (and not BLOCKED), sorted."""


@dataclass(frozen=True)
class AlarmDecision:
    """
    Structured result returned by ``decide_alarm``.

    Callers are responsible for:
      - calling ``sys.exit(result.exit_code)`` when appropriate, and
      - dispatching ``result.notification`` through whatever channel they own.
    """

    level: AlarmLevel
    exit_code: int
    """0 for SOFT and NONE; 1 for HARD."""
    notification: AlarmSummary | None
    """Present for HARD and SOFT; None for NONE."""


# ---------------------------------------------------------------------------
# Core function
# ---------------------------------------------------------------------------


def decide_alarm(results: Sequence[CityResult]) -> AlarmDecision:
    """
    Inspect every classification result for a run and return a structured
    alarm decision.

    Rules (in priority order):
     1. ANY city BLOCKED          → HARD, exit_code=1, notification with summary.
     2. No BLOCKED, ≥1 NEEDS_REVIEW → SOFT, exit_code=0, notification.
     3. All OK / TRANSIENT        → NONE, exit_code=0, no notification.

    Parameters
    ----------
    results:
        Full set of per-(source, city) classification results for the run.
        An empty sequence is treated as "all clear" (NONE).
    """
    blocked_cities: set[str] = set()
    needs_review_cities: set[str] = set()

    for r in results:
        if r.classification == "BLOCKED":
            blocked_cities.add(r.city)
        elif r.classification == "NEEDS_REVIEW":
            needs_review_cities.add(r.city)

    # Rule 1: HARD — any city is BLOCKED
    if blocked_cities:
        summary = AlarmSummary(
            blocked_cities=sorted(blocked_cities),
            needs_review_cities=sorted(needs_review_cities),
        )
        return AlarmDecision(level="HARD", exit_code=1, notification=summary)

    # Rule 2: SOFT — no BLOCKED, but at least one NEEDS_REVIEW
    if needs_review_cities:
        summary = AlarmSummary(
            blocked_cities=[],
            needs_review_cities=sorted(needs_review_cities),
        )
        return AlarmDecision(level="SOFT", exit_code=0, notification=summary)

    # Rule 3: NONE — all OK or TRANSIENT
    return AlarmDecision(level="NONE", exit_code=0, notification=None)
