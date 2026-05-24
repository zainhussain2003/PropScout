"""
Golden dataset extraction accuracy gate — must pass 95%+ before merging to main.

Tests the regex extraction pipeline against known labelled listing descriptions.
Add new cases to golden_cases.json as more listing types are encountered.
"""

import json
import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from extraction.regex_rules import extract_regex_flags


GOLDEN_CASES_PATH = os.path.join(os.path.dirname(__file__), 'golden_cases.json')


def load_golden_cases() -> list[dict]:
    with open(GOLDEN_CASES_PATH) as f:
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
        description = case['description']
        expected = case['expected_flags']
        detected_ids = {flag.flag_id for flag in extract_regex_flags(description)}

        for flag_id, should_be_present in expected.items():
            total_flags += 1
            is_present = flag_id in detected_ids
            if is_present == should_be_present:
                correct_flags += 1
            else:
                print(f"MISMATCH [{case['id']}] {flag_id}: expected={should_be_present}, got={is_present}")

    accuracy = correct_flags / total_flags if total_flags > 0 else 0
    print(f"\nGolden dataset accuracy: {accuracy:.1%} ({correct_flags}/{total_flags})")
    assert accuracy >= 0.95, f"Accuracy {accuracy:.1%} is below the 95% gate"
