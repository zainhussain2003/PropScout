"""
scratch/yieldAlarm_py/retry.py

Python port of scratch/yieldAlarm/retry.ts

Retry logic for the scraper yield-alarm pipeline.

Two responsibilities:
  1. should_retry_page  — decide whether a single page result warrants one retry.
  2. track_source_blocks — per-source circuit-breaker that trips once
                           CONSECUTIVE_BLOCK_TRIP_COUNT cities in a row come
                           back BLOCKED, preventing further retries against a
                           source that is plainly refusing all traffic.

Everything here is pure (no I/O, no timers).  Backoff duration is the
caller's concern; this module only answers "should you retry?" and
"has the breaker tripped?".
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: Number of *consecutive* BLOCKED city outcomes required to trip the
#: per-source circuit-breaker.  Once tripped, all further cities for that
#: source skip the retry entirely for the remainder of the run.
#:
#: Default: 3.  Raise it if a source has known intermittent blocks that
#: clear within a run; lower it if hammering a refusing source is a concern.
#: Matches ``CONSECUTIVE_BLOCK_TRIP_COUNT`` in the TypeScript reference module.
CONSECUTIVE_BLOCK_TRIP_COUNT: int = 3

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

#: Outcome recorded for one city against one source.
CityOutcome = Literal["BLOCKED", "OK"]


@dataclass(frozen=True)
class CircuitBreakerState:
    """Snapshot returned by :func:`track_source_blocks`."""

    #: True when the breaker has tripped and retries should be skipped.
    tripped: bool
    #: How many consecutive BLOCKED cities are at the tail of the sequence.
    consecutive_blocked_count: int


# ---------------------------------------------------------------------------
# 1. should_retry_page
# ---------------------------------------------------------------------------


def should_retry_page(status: int, blocked: bool) -> bool:
    """Return ``True`` when a page result indicates a block and the page should
    be retried exactly once (with caller-managed backoff).

    A page is considered blocked when:
      - HTTP status is 403 or 429, OR
      - the scraper's *blocked* flag is explicitly ``True``.

    Any other status (200, 404, 5xx, …) is treated as a definitive result that
    does not warrant a retry via this path.

    Matches ``shouldRetryPage(status, blocked)`` in the TypeScript reference.
    """
    return blocked or status == 403 or status == 429


# ---------------------------------------------------------------------------
# 2. track_source_blocks — per-source circuit-breaker
# ---------------------------------------------------------------------------


def track_source_blocks(outcomes: list[CityOutcome]) -> CircuitBreakerState:
    """Given the ordered sequence of per-city outcomes recorded so far for one
    source, return the current circuit-breaker state.

    The breaker trips as soon as the *tail* of ``outcomes`` contains
    :data:`CONSECUTIVE_BLOCK_TRIP_COUNT` or more consecutive BLOCKED entries.
    Once tripped it stays tripped regardless of any later OK entries (callers
    should stop appending outcomes after the breaker trips, but this function
    is safe even if they don't).

    Usage pattern inside a scrape run::

        outcomes: list[CityOutcome] = []
        for city in cities:
            state = track_source_blocks(outcomes)
            if state.tripped:
                # skip retry for this city
                pass
            elif page_is_blocked:
                outcomes.append("BLOCKED")
            else:
                outcomes.append("OK")

    Matches ``trackSourceBlocks(outcomes)`` in the TypeScript reference.
    """
    # Walk backwards to count the trailing run of BLOCKED entries.
    consecutive_blocked_count = 0
    for i in range(len(outcomes) - 1, -1, -1):
        if outcomes[i] == "BLOCKED":
            consecutive_blocked_count += 1
        else:
            break

    # The breaker trips (and stays tripped) once the threshold is reached.
    # We also scan the full sequence for any earlier trip so the state remains
    # correct even if outcomes continues to be appended after tripping.
    tripped = _was_ever_tripped(outcomes)

    return CircuitBreakerState(
        tripped=tripped,
        consecutive_blocked_count=consecutive_blocked_count,
    )


def _was_ever_tripped(outcomes: list[CityOutcome]) -> bool:
    """Scan the full outcomes list for any point at which the breaker would
    have tripped.

    This ensures ``tripped`` stays ``True`` even if an OK entry was appended
    after the threshold was reached.  Mirrors ``_wasEverTripped`` in the
    TypeScript reference.
    """
    run = 0
    for outcome in outcomes:
        if outcome == "BLOCKED":
            run += 1
            if run >= CONSECUTIVE_BLOCK_TRIP_COUNT:
                return True
        else:
            run = 0
    return False
