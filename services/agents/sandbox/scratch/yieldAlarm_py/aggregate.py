"""
scratch/yieldAlarm_py/aggregate.py

Aggregation layer for the scraper yield alarm.

Composes classify_city, retry (track_source_blocks circuit-breaker), and
decide_alarm into a single run-level result.

Responsibilities:
  1. For every (source, city), classify its pages via classify_city.
  2. Maintain a per-source circuit-breaker via track_source_blocks.
     Once a source's breaker trips (>= CONSECUTIVE_BLOCK_TRIP_COUNT
     consecutive BLOCKED cities), all subsequent cities for THAT source
     skip the retry path.  The breaker state is isolated per-source and
     does not affect other sources.
  3. Collect every per-(source, city) CityResult — tripping the breaker
     does NOT erase already-classified cities, so all BLOCKED findings
     reach decide_alarm intact.
  4. Hand the full CityResult set to decide_alarm and return the run-level
     AlarmDecision.

Out-of-scope: actual I/O, backoff timers, process.exit.

Port of: scratch/yieldAlarm/aggregate.ts
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from classify_city import PageResult, classify_city
from retry import CityOutcome, track_source_blocks
from alarm_decision import AlarmDecision, CityResult, decide_alarm

# ---------------------------------------------------------------------------
# Input types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SourceCityPages:
    """All page-fetch results for a single (source, city) pair."""

    source: str
    """Scrape-source identifier, e.g. 'zillow'."""
    city: str
    """City slug, e.g. 'austin-tx'."""
    pages: list[PageResult]
    """Per-page fetch results for this (source, city)."""


# ---------------------------------------------------------------------------
# aggregate_run
# ---------------------------------------------------------------------------


def aggregate_run(entries: Sequence[SourceCityPages]) -> AlarmDecision:
    """
    Aggregate all per-(source, city) page-fetch results into a run-level
    alarm decision.

    Processing order is the same as the order of ``entries``.  The circuit
    breaker for each source is driven by the sequential order of cities as they
    appear in ``entries`` — cities for a given source that appear after the
    breaker trips are marked as retry-skipped (informational only); their
    pages are still classified and their CityResult is still included in the
    final alarm decision.

    Parameters
    ----------
    entries:
        Ordered list of per-(source, city) page results for this run.

    Returns
    -------
    AlarmDecision
        Run-level decision from decide_alarm.
    """
    # Per-source circuit-breaker state: map from source -> running list[CityOutcome]
    source_breaker_outcomes: dict[str, list[CityOutcome]] = {}

    # Collected classifications — grows monotonically; nothing is ever removed.
    city_results: list[CityResult] = []

    for entry in entries:
        source = entry.source
        city = entry.city
        pages = entry.pages

        # --- Step 1: ensure per-source breaker outcomes list exists ---
        if source not in source_breaker_outcomes:
            source_breaker_outcomes[source] = []
        outcomes = source_breaker_outcomes[source]

        # --- Step 2: check circuit-breaker BEFORE classifying (retry path) ---
        breaker_state = track_source_blocks(outcomes)
        retry_skipped = breaker_state.tripped

        # --- Step 3: classify the city's pages regardless of breaker state ---
        #   The breaker only governs whether a retry attempt is issued; it never
        #   suppresses the classification result from the alarm decision.
        classification = classify_city(pages)

        # --- Step 4: record the CityResult for decide_alarm ---
        city_results.append(CityResult(source=source, city=city, classification=classification))

        # --- Step 5: feed the breaker outcome (only when retry was available) ---
        #   If the breaker already tripped we don't keep appending to outcomes —
        #   the state is already permanently tripped and there is no retry to gate.
        #   (track_source_blocks is safe either way, but we honour the documented
        #   usage pattern from retry.py and avoid noise in the outcomes array.)
        if not retry_skipped:
            outcome: CityOutcome = "BLOCKED" if classification == "BLOCKED" else "OK"
            outcomes.append(outcome)

    # --- Step 6: hand the full set to decide_alarm ---
    return decide_alarm(city_results)
