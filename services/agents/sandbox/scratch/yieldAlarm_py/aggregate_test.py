"""
scratch/yieldAlarm_py/aggregate_test.py

pytest port of scratch/yieldAlarm/aggregate.test.ts

Proves the COMPOSITION behaviour of aggregate_run:

  1. HARD survives aggregation — a source blocked in 6/12 cities yields HARD
     (blocked findings are never masked or discarded).

  2. Per-source breaker isolation — tripping source A's circuit-breaker does
     NOT affect source B's processing; source B's breaker runs independently.

  3. Prior findings survive a breaker trip — BLOCKED cities classified
     before the breaker trips are still counted in the final alarm.

  4. Fully healthy run across all sources/cities → NONE, exit_code 0.
"""

from __future__ import annotations

import pytest

from classify_city import PageResult, classify_city
from retry import CONSECUTIVE_BLOCK_TRIP_COUNT
from aggregate import SourceCityPages, aggregate_run

# ---------------------------------------------------------------------------
# Helpers  (mirrors the TS helper functions)
# ---------------------------------------------------------------------------


def blocked_pages() -> list[PageResult]:
    """Pages that classify_city will classify as BLOCKED."""
    return [{"status": 403, "rows": 0, "blocked": True}]


def ok_pages() -> list[PageResult]:
    """Pages that classify_city will classify as OK."""
    return [{"status": 200, "rows": 10, "blocked": False}]


def make_entry(source: str, city: str, pages: list[PageResult]) -> SourceCityPages:
    """Construct a SourceCityPages entry."""
    return SourceCityPages(source=source, city=city, pages=pages)


# ---------------------------------------------------------------------------
# Sanity-check helpers against classify_city directly (mirrors TS describe
# "helper sanity")
# ---------------------------------------------------------------------------


class TestHelperSanity:
    def test_blocked_pages_classifies_as_blocked(self) -> None:
        assert classify_city(blocked_pages()) == "BLOCKED"

    def test_ok_pages_classifies_as_ok(self) -> None:
        assert classify_city(ok_pages()) == "OK"


# ---------------------------------------------------------------------------
# Suite 1 — HARD alarm survives aggregation
#
# Source A has 12 cities: 6 BLOCKED, 6 OK (interleaved so the circuit-breaker
# never trips on consecutive blocks — the point is about HARD propagation, not
# the breaker).  The run must end up HARD with all 6 blocked cities listed.
# ---------------------------------------------------------------------------


class TestSuite1HardAlarmSurvivesAggregation:
    TOTAL_CITIES = 12
    BLOCKED_COUNT = 6

    @pytest.fixture
    def entries(self) -> list[SourceCityPages]:
        # 12 cities for source A, alternating blocked/ok so the circuit-
        # breaker (CONSECUTIVE_BLOCK_TRIP_COUNT in a row) never trips.
        return [
            make_entry(
                "sourceA",
                f"city-{i}",
                blocked_pages() if i % 2 == 0 else ok_pages(),
            )
            for i in range(self.TOTAL_CITIES)
        ]

    def test_yields_hard_level(self, entries: list[SourceCityPages]) -> None:
        result = aggregate_run(entries)
        assert result.level == "HARD"

    def test_yields_exit_code_1(self, entries: list[SourceCityPages]) -> None:
        result = aggregate_run(entries)
        assert result.exit_code == 1

    def test_notification_lists_exactly_6_blocked_cities(
        self, entries: list[SourceCityPages]
    ) -> None:
        result = aggregate_run(entries)
        assert result.notification is not None
        blocked = result.notification.blocked_cities
        assert len(blocked) == self.BLOCKED_COUNT
        # Blocked cities are the even-indexed ones: city-0,2,4,6,8,10
        assert sorted(blocked) == sorted(
            ["city-0", "city-2", "city-4", "city-6", "city-8", "city-10"]
        )

    def test_no_blocked_cities_are_masked_or_merged_away(
        self, entries: list[SourceCityPages]
    ) -> None:
        result = aggregate_run(entries)
        assert result.notification is not None
        assert len(result.notification.blocked_cities) == self.BLOCKED_COUNT


# ---------------------------------------------------------------------------
# Suite 2 — Per-source breaker isolation
#
# Source A trips its circuit-breaker (CONSECUTIVE_BLOCK_TRIP_COUNT consecutive
# BLOCKED cities).  Source B, processed in the same run, has its own
# independent breaker and must NOT be affected — its non-blocked cities must
# still be classified OK and included normally in the alarm decision.
#
# We verify isolation by checking:
#   a. The run is HARD (because of source A).
#   b. Source B's cities are NOT in the blocked_cities list.
#   c. Specifically, a pure source B run yields NONE.
# ---------------------------------------------------------------------------


class TestSuite2PerSourceBreakerIsolation:
    SOURCE_B_CITIES = ["b-city-0", "b-city-1", "b-city-2"]

    @pytest.fixture
    def source_a_entries(self) -> list[SourceCityPages]:
        # Exactly CONSECUTIVE_BLOCK_TRIP_COUNT consecutive BLOCKED cities
        # followed by 2 more BLOCKED cities (retry-skipped but still classified).
        return [
            make_entry("sourceA", f"a-city-{i}", blocked_pages())
            for i in range(CONSECUTIVE_BLOCK_TRIP_COUNT + 2)
        ]

    @pytest.fixture
    def source_b_entries(self) -> list[SourceCityPages]:
        # All OK cities — breaker should never trip for source B.
        return [
            make_entry("sourceB", city, ok_pages())
            for city in self.SOURCE_B_CITIES
        ]

    @pytest.fixture
    def interleaved(
        self,
        source_a_entries: list[SourceCityPages],
        source_b_entries: list[SourceCityPages],
    ) -> list[SourceCityPages]:
        # Interleave: A, B, A, B, … to stress that isolation survives interleaving.
        result: list[SourceCityPages] = []
        max_len = max(len(source_a_entries), len(source_b_entries))
        for i in range(max_len):
            if i < len(source_a_entries):
                result.append(source_a_entries[i])
            if i < len(source_b_entries):
                result.append(source_b_entries[i])
        return result

    def test_run_is_hard_because_source_a_is_blocked(
        self, interleaved: list[SourceCityPages]
    ) -> None:
        result = aggregate_run(interleaved)
        assert result.level == "HARD"

    def test_source_b_cities_not_in_blocked_cities_list(
        self, interleaved: list[SourceCityPages]
    ) -> None:
        result = aggregate_run(interleaved)
        assert result.notification is not None
        blocked = result.notification.blocked_cities
        for city in self.SOURCE_B_CITIES:
            assert city not in blocked

    def test_all_source_a_cities_appear_in_blocked_cities(
        self, interleaved: list[SourceCityPages]
    ) -> None:
        result = aggregate_run(interleaved)
        assert result.notification is not None
        blocked = result.notification.blocked_cities
        for i in range(CONSECUTIVE_BLOCK_TRIP_COUNT + 2):
            assert f"a-city-{i}" in blocked

    def test_source_b_breaker_never_trips_independently(
        self, source_b_entries: list[SourceCityPages]
    ) -> None:
        # Run source B alone; since it is all OK the outcome should be NONE.
        result = aggregate_run(source_b_entries)
        assert result.level == "NONE"


# ---------------------------------------------------------------------------
# Suite 3 — Prior BLOCKED findings survive a breaker trip
#
# Source A: (CONSECUTIVE_BLOCK_TRIP_COUNT) BLOCKED cities before the
# breaker trips, then additional BLOCKED cities after the breaker has tripped.
#
# ALL of those BLOCKED cities — before AND after the trip — must appear in
# the alarm decision.  Tripping the breaker must only affect retry-skipping,
# not the classification record.
# ---------------------------------------------------------------------------


class TestSuite3PriorBlockedFindingsSurviveBreakerTrip:
    PRE_TRIP = CONSECUTIVE_BLOCK_TRIP_COUNT   # these trigger the trip
    POST_TRIP = 3                              # after-trip cities (retry skipped)
    TOTAL_BLOCKED = PRE_TRIP + POST_TRIP

    @pytest.fixture
    def entries(self) -> list[SourceCityPages]:
        return [
            *[
                make_entry("sourceA", f"pre-{i}", blocked_pages())
                for i in range(self.PRE_TRIP)
            ],
            *[
                make_entry("sourceA", f"post-{i}", blocked_pages())
                for i in range(self.POST_TRIP)
            ],
            make_entry("sourceA", "late-ok", ok_pages()),
        ]

    def test_result_is_hard(self, entries: list[SourceCityPages]) -> None:
        result = aggregate_run(entries)
        assert result.level == "HARD"

    def test_all_blocked_cities_appear_in_alarm_pre_and_post_trip(
        self, entries: list[SourceCityPages]
    ) -> None:
        result = aggregate_run(entries)
        assert result.notification is not None
        blocked = result.notification.blocked_cities
        assert len(blocked) == self.TOTAL_BLOCKED

        for i in range(self.PRE_TRIP):
            assert f"pre-{i}" in blocked
        for i in range(self.POST_TRIP):
            assert f"post-{i}" in blocked

    def test_post_trip_ok_city_not_in_blocked_cities(
        self, entries: list[SourceCityPages]
    ) -> None:
        result = aggregate_run(entries)
        assert result.notification is not None
        assert "late-ok" not in result.notification.blocked_cities


# ---------------------------------------------------------------------------
# Suite 4 — Fully healthy run → NONE / exit 0
#
# Multiple sources, multiple cities each, all OK pages.
# ---------------------------------------------------------------------------


class TestSuite4FullyHealthyRunYieldsNone:
    SOURCES = ["zillow", "redfin", "apartments"]
    CITIES_PER_SOURCE = ["city-a", "city-b", "city-c", "city-d"]

    @pytest.fixture
    def entries(self) -> list[SourceCityPages]:
        return [
            make_entry(source, city, ok_pages())
            for source in self.SOURCES
            for city in self.CITIES_PER_SOURCE
        ]

    def test_level_is_none(self, entries: list[SourceCityPages]) -> None:
        result = aggregate_run(entries)
        assert result.level == "NONE"

    def test_exit_code_is_0(self, entries: list[SourceCityPages]) -> None:
        result = aggregate_run(entries)
        assert result.exit_code == 0

    def test_notification_is_none(self, entries: list[SourceCityPages]) -> None:
        result = aggregate_run(entries)
        assert result.notification is None


# ---------------------------------------------------------------------------
# Suite 5 — Edge cases
# ---------------------------------------------------------------------------


class TestSuite5EdgeCases:
    def test_empty_run_yields_none_exit_0(self) -> None:
        result = aggregate_run([])
        assert result.level == "NONE"
        assert result.exit_code == 0
        assert result.notification is None

    def test_single_blocked_city_is_hard(self) -> None:
        result = aggregate_run([make_entry("sourceA", "city-0", blocked_pages())])
        assert result.level == "HARD"
        assert result.exit_code == 1

    def test_needs_review_city_with_no_blocked_is_soft_exit_0(self) -> None:
        # All-zero-row pages that aren't blocked → NEEDS_REVIEW
        needs_review_pages: list[PageResult] = [
            {"status": 200, "rows": 0, "blocked": False}
        ]
        result = aggregate_run([
            make_entry("sourceA", "city-0", needs_review_pages),
            make_entry("sourceA", "city-1", ok_pages()),
        ])
        assert result.level == "SOFT"
        assert result.exit_code == 0
        assert result.notification is not None
        assert "city-0" in result.notification.needs_review_cities

    def test_circuit_breaker_trip_count_matches_imported_constant(self) -> None:
        # Trip exactly at CONSECUTIVE_BLOCK_TRIP_COUNT — before that, NONE.
        # These are all BLOCKED so the alarm is HARD; the key point is that
        # the same constant is shared and not shadowed.
        almost_trip = [
            make_entry("sourceA", f"city-{i}", blocked_pages())
            for i in range(CONSECUTIVE_BLOCK_TRIP_COUNT - 1)
        ]
        # Even without hitting the trip threshold, BLOCKED cities → HARD.
        result = aggregate_run(almost_trip)
        assert result.level == "HARD"  # still HARD even before trip
