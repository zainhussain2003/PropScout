"""
Golden dataset extraction accuracy gate — must pass 95%+ before merging to main.

Tests the regex extraction pipeline against known labelled listing descriptions.
Add new cases to golden_cases.json as more listing types are encountered.
"""

import json
import hashlib
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# noqa: E402 — the sys.path insert above must run before this import resolves.
from extraction.regex_rules import extract_regex_flags  # noqa: E402

GOLDEN_CASES_PATH = os.path.join(os.path.dirname(__file__), "golden_cases.json")


def load_golden_cases() -> list[dict]:
    with open(GOLDEN_CASES_PATH, encoding="utf-8") as f:
        return json.load(f)


def test_golden_dataset_accuracy() -> None:
    """
    Run all golden cases and assert >= 95% flag accuracy.
    Each flag in expected_flags is scored as correct or incorrect.
    """
    cases = load_golden_cases()
    total_flags = 0
    correct_flags = 0

    for case in cases:
        description = case["description"]
        expected = case["expected_flags"]
        detected_ids = {flag.flag_id for flag in extract_regex_flags(description)}

        for flag_id, should_be_present in expected.items():
            total_flags += 1
            is_present = flag_id in detected_ids
            if is_present == should_be_present:
                correct_flags += 1
            else:
                print(
                    f"MISMATCH [{case['id']}] {flag_id}: "
                    f"expected={should_be_present}, got={is_present}"
                )

    accuracy = correct_flags / total_flags if total_flags > 0 else 0
    print(f"\nGolden dataset accuracy: {accuracy:.1%} ({correct_flags}/{total_flags})")
    assert accuracy >= 0.95, f"Accuracy {accuracy:.1%} is below the 95% gate"


def test_every_flag_has_a_positive_and_a_negative_case() -> None:
    """
    The 95% gate is only meaningful if the dataset exercises the whole rule set.

    Without this, the suite passes at 100% while covering three flags — which is
    what it did before 2026-09-06, and why a contradiction (a "no pets permitted"
    listing also firing pets_allowed) survived unnoticed. A flag with only
    positive cases is worse than untested: it rewards a pattern that matches
    everything.
    """
    from extraction.regex_rules import FLAG_PATTERNS

    cases = load_golden_cases()
    positives: set[str] = set()
    negatives: set[str] = set()
    for case in cases:
        for flag_id, expected in case["expected_flags"].items():
            (positives if expected else negatives).add(flag_id)

    all_flags = {flag_id for flag_id, _pattern, _conf in FLAG_PATTERNS}

    missing_positive = sorted(all_flags - positives)
    missing_negative = sorted(all_flags - negatives)

    assert (
        not missing_positive
    ), f"No golden case asserts these flags SHOULD fire: {missing_positive}"
    assert not missing_negative, (
        "No golden case asserts these flags should NOT fire, so a pattern that "
        f"matches everything would still pass: {missing_negative}"
    )


def test_case_ids_are_unique() -> None:
    """Duplicate ids make a mismatch report ambiguous about which case failed."""
    ids = [case["id"] for case in load_golden_cases()]
    duplicates = sorted({i for i in ids if ids.count(i) > 1})
    assert not duplicates, f"Duplicate golden case ids: {duplicates}"


def test_synthetic_and_real_derived_regressions_stay_exact() -> None:
    """Wider patterns must not sacrifice any assertion in the original 58 cases."""
    for case in load_golden_cases():
        if case.get("source_kind") == "real_full_description":
            continue
        actual = {flag.flag_id for flag in extract_regex_flags(case["description"])}
        for flag, expected in case["expected_flags"].items():
            assert (flag in actual) == expected, f"{case['id']}: {flag}"


def test_real_description_precision_and_recall() -> None:
    """Unmentioned flags cannot swamp missed positives in the aggregate gate."""
    true_positive = false_positive = false_negative = 0
    for case in load_golden_cases():
        if case.get("source_kind") != "real_full_description":
            continue
        actual = {flag.flag_id for flag in extract_regex_flags(case["description"])}
        for flag, expected in case["expected_flags"].items():
            true_positive += int(expected and flag in actual)
            false_positive += int(not expected and flag in actual)
            false_negative += int(expected and flag not in actual)
    assert true_positive + false_negative > 0, "Real corpus has no positive labels"
    precision = true_positive / max(1, true_positive + false_positive)
    recall = true_positive / (true_positive + false_negative)
    assert precision >= 0.95, f"Real precision {precision:.1%} below 95%"
    assert recall >= 0.95, f"Real recall {recall:.1%} below 95%"


def test_real_descriptions_have_traceable_unmodified_sources() -> None:
    """Full cases retain their source, acquisition date, and original prose hash."""
    real = [
        c
        for c in load_golden_cases()
        if c.get("source_kind") == "real_full_description"
    ]
    assert real, "No full real descriptions in golden corpus"
    urls = [case["source_url"] for case in real]
    assert len(urls) == len(set(urls)), "Duplicate listings inflate corpus size"
    for case in real:
        assert case["source_url"].startswith("https://www.realtor.ca/real-estate/")
        assert "Ontario" in case["source_address"]
        assert case["scraped_at"]
        assert case["acquisition"] in {"database_archive", "fresh_scrape"}
        assert (
            hashlib.sha256(case["description"].encode("utf-8")).hexdigest()
            == case["description_sha256"]
        )
