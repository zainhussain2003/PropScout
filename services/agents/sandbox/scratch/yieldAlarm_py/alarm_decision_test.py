"""
alarm_decision_test.py

pytest suite for decide_alarm.

Ports ALL assertions from
  services/agents/sandbox/scratch/yieldAlarm/alarmDecision.test.ts

Covers every case mandated by the spec:
 1. Any BLOCKED city  → HARD, non-zero exit code
 2. NEEDS_REVIEW without BLOCKED → SOFT, exit 0
 3. All OK / TRANSIENT → NONE, exit 0, no notification
 4. 6 BLOCKED + 6 OK cities → HARD  (healthy cities never mask blocked ones)
 5. Summary correctly lists blocked and needs-review cities
"""

import pytest
from alarm_decision import AlarmDecision, AlarmSummary, CityResult, decide_alarm

# ---------------------------------------------------------------------------
# Helper — mirrors the `city()` helper in the TS test
# ---------------------------------------------------------------------------


def city(
    city_slug: str,
    classification: str,
    source: str = "test-source",
) -> CityResult:
    return CityResult(source=source, city=city_slug, classification=classification)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# 1. Any BLOCKED → HARD, non-zero exit code
# ---------------------------------------------------------------------------


class TestAnyBlockedIsHard:
    def test_single_blocked_city_produces_hard_with_exit_code_1(self) -> None:
        result = decide_alarm([city("austin-tx", "BLOCKED")])

        assert result.level == "HARD"
        assert result.exit_code != 0
        assert result.exit_code == 1
        assert result.notification is not None

    def test_blocked_mixed_with_ok_still_produces_hard_with_exit_code_1(self) -> None:
        results = [
            city("austin-tx", "BLOCKED"),
            city("dallas-tx", "OK"),
            city("houston-tx", "TRANSIENT"),
        ]
        result = decide_alarm(results)

        assert result.level == "HARD"
        assert result.exit_code != 0
        assert result.exit_code == 1

    def test_blocked_mixed_with_needs_review_still_produces_hard(self) -> None:
        results = [
            city("austin-tx", "BLOCKED"),
            city("seattle-wa", "NEEDS_REVIEW"),
        ]
        result = decide_alarm(results)

        assert result.level == "HARD"
        assert result.exit_code != 0


# ---------------------------------------------------------------------------
# 2. NEEDS_REVIEW without BLOCKED → SOFT, exit 0
# ---------------------------------------------------------------------------


class TestNeedsReviewWithoutBlockedIsSoft:
    def test_single_needs_review_city_produces_soft_with_exit_code_0(self) -> None:
        result = decide_alarm([city("portland-or", "NEEDS_REVIEW")])

        assert result.level == "SOFT"
        assert result.exit_code == 0
        assert result.notification is not None

    def test_needs_review_mixed_with_ok_and_transient_still_produces_soft(self) -> None:
        results = [
            city("portland-or", "NEEDS_REVIEW"),
            city("denver-co", "OK"),
            city("miami-fl", "TRANSIENT"),
        ]
        result = decide_alarm(results)

        assert result.level == "SOFT"
        assert result.exit_code == 0
        assert result.notification is not None

    def test_multiple_needs_review_cities_produce_soft_with_exit_code_0(self) -> None:
        results = [
            city("city-a", "NEEDS_REVIEW"),
            city("city-b", "NEEDS_REVIEW"),
        ]
        result = decide_alarm(results)

        assert result.level == "SOFT"
        assert result.exit_code == 0


# ---------------------------------------------------------------------------
# 3. All OK / TRANSIENT → NONE, exit 0, no notification
# ---------------------------------------------------------------------------


class TestAllOkOrTransientIsNone:
    def test_all_ok_cities_produce_none_with_exit_code_0_and_no_notification(
        self,
    ) -> None:
        results = [
            city("chicago-il", "OK"),
            city("boston-ma", "OK"),
        ]
        result = decide_alarm(results)

        assert result.level == "NONE"
        assert result.exit_code == 0
        assert result.notification is None

    def test_all_transient_cities_produce_none_with_exit_code_0_and_no_notification(
        self,
    ) -> None:
        result = decide_alarm([city("phoenix-az", "TRANSIENT")])

        assert result.level == "NONE"
        assert result.exit_code == 0
        assert result.notification is None

    def test_mixed_ok_and_transient_produce_none(self) -> None:
        results = [
            city("chicago-il", "OK"),
            city("phoenix-az", "TRANSIENT"),
            city("boston-ma", "OK"),
        ]
        result = decide_alarm(results)

        assert result.level == "NONE"
        assert result.exit_code == 0
        assert result.notification is None

    def test_empty_result_set_produces_none(self) -> None:
        result = decide_alarm([])

        assert result.level == "NONE"
        assert result.exit_code == 0
        assert result.notification is None


# ---------------------------------------------------------------------------
# 4. Critical masking case: 6 BLOCKED + 6 OK cities → HARD, not masked
# ---------------------------------------------------------------------------

BLOCKED_SLUGS = [
    "blocked-city-1",
    "blocked-city-2",
    "blocked-city-3",
    "blocked-city-4",
    "blocked-city-5",
    "blocked-city-6",
]

OK_SLUGS = [
    "ok-city-1",
    "ok-city-2",
    "ok-city-3",
    "ok-city-4",
    "ok-city-5",
    "ok-city-6",
]

_MASKING_RESULTS = [
    *[city(s, "BLOCKED") for s in BLOCKED_SLUGS],
    *[city(s, "OK") for s in OK_SLUGS],
]


class TestMaskingCase:
    """6 BLOCKED + 6 OK cities must still yield HARD — no masking."""

    def test_level_is_hard(self) -> None:
        assert decide_alarm(_MASKING_RESULTS).level == "HARD"

    def test_exit_code_is_non_zero_and_equals_1(self) -> None:
        result = decide_alarm(_MASKING_RESULTS)
        assert result.exit_code != 0
        assert result.exit_code == 1

    def test_notification_is_present(self) -> None:
        assert decide_alarm(_MASKING_RESULTS).notification is not None

    def test_all_6_blocked_cities_appear_in_notification(self) -> None:
        notification = decide_alarm(_MASKING_RESULTS).notification
        assert notification is not None
        assert len(notification.blocked_cities) == 6
        for slug in BLOCKED_SLUGS:
            assert slug in notification.blocked_cities

    def test_no_ok_city_bleeds_into_blocked_or_needs_review(self) -> None:
        notification = decide_alarm(_MASKING_RESULTS).notification
        assert notification is not None
        for slug in OK_SLUGS:
            assert slug not in notification.blocked_cities
            assert slug not in notification.needs_review_cities


# ---------------------------------------------------------------------------
# 5. Summary contents — blocked and needs-review cities listed correctly
# ---------------------------------------------------------------------------


class TestNotificationSummaryContents:
    def test_hard_summary_lists_blocked_cities_and_omits_ok_transient(self) -> None:
        results = [
            city("austin-tx", "BLOCKED"),
            city("seattle-wa", "BLOCKED"),
            city("denver-co", "OK"),
            city("miami-fl", "TRANSIENT"),
        ]
        notification = decide_alarm(results).notification

        assert notification is not None
        assert notification.blocked_cities == ["austin-tx", "seattle-wa"]
        assert notification.needs_review_cities == []

    def test_hard_summary_includes_needs_review_alongside_blocked(self) -> None:
        results = [
            city("austin-tx", "BLOCKED"),
            city("portland-or", "NEEDS_REVIEW"),
            city("denver-co", "OK"),
        ]
        notification = decide_alarm(results).notification

        assert notification is not None
        assert notification.blocked_cities == ["austin-tx"]
        assert notification.needs_review_cities == ["portland-or"]

    def test_soft_summary_has_empty_blocked_and_lists_needs_review(self) -> None:
        results = [
            city("portland-or", "NEEDS_REVIEW"),
            city("nashville-tn", "NEEDS_REVIEW"),
            city("denver-co", "OK"),
        ]
        notification = decide_alarm(results).notification

        assert notification is not None
        assert notification.blocked_cities == []
        # sorted alphabetically
        assert notification.needs_review_cities == ["nashville-tn", "portland-or"]

    def test_blocked_cities_list_is_sorted_alphabetically(self) -> None:
        results = [
            city("z-city", "BLOCKED"),
            city("a-city", "BLOCKED"),
            city("m-city", "BLOCKED"),
        ]
        notification = decide_alarm(results).notification

        assert notification is not None
        assert notification.blocked_cities == ["a-city", "m-city", "z-city"]

    def test_needs_review_cities_list_is_sorted_alphabetically(self) -> None:
        results = [
            city("z-review", "NEEDS_REVIEW"),
            city("a-review", "NEEDS_REVIEW"),
        ]
        notification = decide_alarm(results).notification

        assert notification is not None
        assert notification.needs_review_cities == ["a-review", "z-review"]

    def test_same_city_blocked_across_multiple_sources_appears_once(self) -> None:
        """De-duplication is by city slug, not by (source, city) pair."""
        results = [
            CityResult(source="zillow", city="austin-tx", classification="BLOCKED"),
            CityResult(source="redfin", city="austin-tx", classification="BLOCKED"),
        ]
        notification = decide_alarm(results).notification

        assert notification is not None
        assert notification.blocked_cities == ["austin-tx"]
        assert len(notification.blocked_cities) == 1
