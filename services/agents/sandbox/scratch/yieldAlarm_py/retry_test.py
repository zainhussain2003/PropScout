"""
scratch/yieldAlarm_py/retry_test.py

pytest port of scratch/yieldAlarm/retry.test.ts

Covers every behaviour called out in the spec:
  • A single blocked page triggers exactly one retry.
  • A non-blocked page triggers no retry.
  • The circuit-breaker does NOT trip at N-1 consecutive blocked cities.
  • The circuit-breaker DOES trip at N consecutive blocked cities.
  • Once tripped, a subsequent city skips retry.
  • A producing (non-blocked) city in the middle RESETS the consecutive count.
"""

from __future__ import annotations

from typing import cast

import pytest

from retry import (
    CONSECUTIVE_BLOCK_TRIP_COUNT,
    CircuitBreakerState,
    CityOutcome,
    should_retry_page,
    track_source_blocks,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def blocked(n: int) -> list[CityOutcome]:
    """Return a list of *n* ``"BLOCKED"`` outcomes."""
    return cast(list[CityOutcome], ["BLOCKED"] * n)


# ---------------------------------------------------------------------------
# should_retry_page
# ---------------------------------------------------------------------------


class TestShouldRetryPage:
    # ── Blocked pages — should be retried ──────────────────────────────────

    def test_status_403_returns_true(self) -> None:
        """returns true for status 403 (explicit IP/geo block)"""
        assert should_retry_page(403, False) is True

    def test_status_429_returns_true(self) -> None:
        """returns true for status 429 (rate-limited)"""
        assert should_retry_page(429, False) is True

    def test_blocked_flag_true_returns_true_regardless_of_status(self) -> None:
        """returns true when the blocked flag is true, regardless of status —
        scraper flagged a block even though the HTTP layer returned 200"""
        assert should_retry_page(200, True) is True

    def test_status_403_and_blocked_flag_true(self) -> None:
        """returns true when both status is 403 AND blocked flag is true"""
        assert should_retry_page(403, True) is True

    def test_status_429_and_blocked_flag_true(self) -> None:
        """returns true when both status is 429 AND blocked flag is true"""
        assert should_retry_page(429, True) is True

    # ── Non-blocked pages — should NOT be retried ──────────────────────────

    def test_status_200_returns_false(self) -> None:
        """✦ SPEC: a non-blocked page triggers no retry — successful 200"""
        assert should_retry_page(200, False) is False

    def test_status_404_returns_false(self) -> None:
        """returns false for a 404 (page missing, not a block)"""
        assert should_retry_page(404, False) is False

    def test_status_500_returns_false(self) -> None:
        """returns false for a 500 server error (not a block)"""
        assert should_retry_page(500, False) is False

    def test_status_301_returns_false(self) -> None:
        """returns false for a 301 redirect response"""
        assert should_retry_page(301, False) is False


# ---------------------------------------------------------------------------
# track_source_blocks — circuit-breaker
# ---------------------------------------------------------------------------

N = CONSECUTIVE_BLOCK_TRIP_COUNT  # 3 by default


class TestTrackSourceBlocks:
    # ── Empty / no blocks ──────────────────────────────────────────────────

    def test_empty_outcomes_not_tripped(self) -> None:
        """does not trip when the outcomes list is empty"""
        state = track_source_blocks([])
        assert state.tripped is False
        assert state.consecutive_blocked_count == 0

    def test_only_ok_outcomes_not_tripped(self) -> None:
        """does not trip with only OK outcomes"""
        state = track_source_blocks(["OK", "OK", "OK", "OK"])
        assert state.tripped is False
        assert state.consecutive_blocked_count == 0

    # ── Single blocked page triggers exactly one retry ─────────────────────
    #
    # The circuit-breaker contract is: tripped == False → caller MAY retry.
    # tripped == True → caller MUST skip retry.
    # So one BLOCKED outcome must leave tripped False (retry allowed).

    def test_single_blocked_leaves_breaker_untripped(self) -> None:
        """✦ SPEC: a single BLOCKED outcome leaves the breaker un-tripped
        (one retry allowed)"""
        state = track_source_blocks(["BLOCKED"])
        assert state.tripped is False
        assert state.consecutive_blocked_count == 1

    # ── Breaker does NOT trip at N-1 consecutive blocks ────────────────────

    def test_n_minus_1_consecutive_blocks_not_tripped(self) -> None:
        f"""✦ SPEC: breaker does NOT trip at {N - 1} consecutive BLOCKED cities"""
        outcomes = blocked(N - 1)  # e.g. 2 when N=3
        state = track_source_blocks(outcomes)
        assert state.tripped is False
        assert state.consecutive_blocked_count == N - 1

    def test_n_minus_1_blocks_separated_by_ok_not_tripped(self) -> None:
        """does not trip when N-1 blocks are separated by an OK —
        ✦ RESET: a producing city resets the consecutive-block count"""
        # Pattern: N-1 blocks, then OK, then N-1 blocks — never N in a row
        outcomes: list[CityOutcome] = blocked(N - 1) + ["OK"] + blocked(N - 1)
        state = track_source_blocks(outcomes)
        assert state.tripped is False

    # ── Breaker DOES trip at exactly N consecutive blocks ──────────────────

    def test_exactly_n_consecutive_blocks_trips_breaker(self) -> None:
        f"""✦ SPEC: breaker DOES trip at exactly {N} consecutive BLOCKED cities"""
        outcomes = blocked(N)  # e.g. 3 when N=3
        state = track_source_blocks(outcomes)
        assert state.tripped is True
        assert state.consecutive_blocked_count == N

    def test_n_consecutive_blocks_after_ok_cities_trips_breaker(self) -> None:
        """trips when N consecutive blocks appear after some OK cities"""
        outcomes: list[CityOutcome] = ["OK", "OK"] + blocked(N)
        state = track_source_blocks(outcomes)
        assert state.tripped is True

    def test_n_plus_1_consecutive_blocks_trips_breaker(self) -> None:
        """trips when N+1 consecutive blocks are present"""
        outcomes = blocked(N + 1)
        state = track_source_blocks(outcomes)
        assert state.tripped is True
        assert state.consecutive_blocked_count == N + 1

    # ── Once tripped, subsequent city skips retry ──────────────────────────
    #
    # Simulate a caller that checks the breaker state BEFORE appending the
    # current city's outcome.  After N blocks the breaker trips; the caller
    # should see tripped == True on the very next check and skip the retry.

    def test_once_tripped_subsequent_city_sees_tripped_true(self) -> None:
        """✦ SPEC: once tripped, a subsequent city (checked before appending)
        sees tripped=True and skips retry"""
        # After N-1 cities the breaker is still open.
        outcomes: list[CityOutcome] = blocked(N - 1)
        assert track_source_blocks(outcomes).tripped is False  # safe to retry

        # N-th city comes back blocked — push it.
        outcomes.append("BLOCKED")
        assert track_source_blocks(outcomes).tripped is True  # breaker just tripped

        # (N+1)-th city: caller checks BEFORE deciding whether to retry.
        # The outcomes slice does NOT yet contain this city's result.
        # The breaker is already tripped → skip retry.
        state_before_next_city = track_source_blocks(outcomes)
        assert state_before_next_city.tripped is True  # ✦ skip retry

    def test_breaker_stays_tripped_if_ok_appended_after_tripping(self) -> None:
        """breaker stays tripped even if an OK is appended after tripping —
        defensive: caller shouldn't keep appending after trip, but if they do
        the state must remain tripped (we never un-trip within a run)"""
        outcomes: list[CityOutcome] = blocked(N) + ["OK"]
        state = track_source_blocks(outcomes)
        assert state.tripped is True

    # ── consecutive_blocked_count accuracy ────────────────────────────────

    def test_consecutive_blocked_count_is_0_when_last_city_was_ok(self) -> None:
        """reports consecutive_blocked_count as 0 when the last city was OK"""
        outcomes: list[CityOutcome] = blocked(N - 1) + ["OK"]
        state = track_source_blocks(outcomes)
        assert state.consecutive_blocked_count == 0

    def test_consecutive_blocked_count_is_2_when_two_blocks_follow_ok(self) -> None:
        """reports consecutive_blocked_count as 2 when two blocks follow an OK —
        ✦ RESET: the OK resets the count; only the trailing run is counted"""
        outcomes: list[CityOutcome] = ["OK", "BLOCKED", "BLOCKED"]
        state = track_source_blocks(outcomes)
        assert state.consecutive_blocked_count == 2

    # ── Reset case (extra coverage beyond the TS test) ────────────────────

    def test_ok_in_the_middle_resets_consecutive_count_before_new_run(self) -> None:
        """✦ RESET: a producing (non-blocked) city in the middle resets the
        consecutive-block count — N-1 blocks, then OK, then fresh N-1 tail
        means consecutiveBlockedCount reflects only the *trailing* run"""
        outcomes: list[CityOutcome] = blocked(N - 1) + ["OK"] + blocked(N - 1)
        state = track_source_blocks(outcomes)
        # Tail run is N-1 (reset by the OK in the middle)
        assert state.consecutive_blocked_count == N - 1
        # And the breaker has NOT tripped because neither run reached N
        assert state.tripped is False

    def test_ok_resets_then_n_new_blocks_trips(self) -> None:
        """A producing city resets the count; N new consecutive blocks after
        it still trips the breaker"""
        outcomes: list[CityOutcome] = blocked(N - 1) + ["OK"] + blocked(N)
        state = track_source_blocks(outcomes)
        assert state.tripped is True
        assert state.consecutive_blocked_count == N
