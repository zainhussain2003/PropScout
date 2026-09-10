"""
Pytest port of classifyCity.test.ts.

Every assertion from the TS test suite is reproduced here, including the two
spec-called-out edge cases:
  - a blocked page's row count is ignored (status 403/429 with rows > 0 → BLOCKED)
  - all-200-zero-rows is NEEDS_REVIEW, not OK and not BLOCKED

Convention: co-located *_test.py file, mirrors the TS describe/it structure
            via plain pytest functions grouped with comments.
"""

import pytest
from classify_city import classify_city, PageResult

# ---------------------------------------------------------------------------
# Helpers — mirrors the TS fixture helpers exactly
# ---------------------------------------------------------------------------

def producing(rows: int) -> PageResult:
    """A clean 200 page with rows."""
    return PageResult(status=200, rows=rows, blocked=False)


empty200: PageResult = PageResult(status=200, rows=0, blocked=False)
blocked403: PageResult = PageResult(status=403, rows=0, blocked=False)
blocked429: PageResult = PageResult(status=429, rows=0, blocked=False)
soft_blocked: PageResult = PageResult(status=200, rows=0, blocked=True)


# ---------------------------------------------------------------------------
# Core four states — OK
# ---------------------------------------------------------------------------

def test_ok_single_page_with_rows_not_blocked() -> None:
    """single page with rows > 0 and not blocked → OK"""
    assert classify_city([producing(5)]) == "OK"


def test_ok_multiple_pages_all_producing_none_blocked() -> None:
    """multiple pages all producing, none blocked → OK"""
    assert classify_city([producing(10), producing(3), producing(1)]) == "OK"


def test_ok_mix_of_producing_and_empty200_none_blocked() -> None:
    """mix of producing and empty-200 pages, none blocked → OK"""
    # Last page returned no rows but is not blocked; city still has yield.
    assert classify_city([producing(7), empty200, producing(2)]) == "OK"


# ---------------------------------------------------------------------------
# Core four states — BLOCKED
# ---------------------------------------------------------------------------

def test_blocked_single_403() -> None:
    """single 403 page → BLOCKED"""
    assert classify_city([blocked403]) == "BLOCKED"


def test_blocked_single_429() -> None:
    """single 429 page → BLOCKED"""
    assert classify_city([blocked429]) == "BLOCKED"


def test_blocked_single_soft_blocked() -> None:
    """single soft-blocked page (blocked flag) → BLOCKED"""
    assert classify_city([soft_blocked]) == "BLOCKED"


def test_blocked_multiple_all_403() -> None:
    """multiple pages, all 403 → BLOCKED"""
    assert classify_city([blocked403, blocked403, blocked403]) == "BLOCKED"


def test_blocked_mix_403_and_429() -> None:
    """mix of 403 and 429 pages → BLOCKED"""
    assert classify_city([blocked403, blocked429]) == "BLOCKED"


def test_blocked_mix_hard_and_soft_blocked() -> None:
    """mix of hard-blocked and soft-blocked pages → BLOCKED"""
    assert classify_city([blocked403, soft_blocked]) == "BLOCKED"


# ---------------------------------------------------------------------------
# Core four states — TRANSIENT
# ---------------------------------------------------------------------------

def test_transient_one_blocked_one_producing() -> None:
    """one blocked page and one producing page → TRANSIENT"""
    assert classify_city([blocked403, producing(4)]) == "TRANSIENT"


def test_transient_one_429_among_producing() -> None:
    """one 429 page among several producing pages → TRANSIENT"""
    assert classify_city([producing(10), blocked429, producing(6)]) == "TRANSIENT"


def test_transient_soft_blocked_alongside_producing() -> None:
    """soft-blocked page alongside producing page → TRANSIENT"""
    assert classify_city([soft_blocked, producing(3)]) == "TRANSIENT"


def test_transient_multiple_blocked_one_producing() -> None:
    """multiple blocked pages with one producing page → TRANSIENT"""
    assert classify_city([blocked403, blocked429, soft_blocked, producing(1)]) == "TRANSIENT"


# ---------------------------------------------------------------------------
# Core four states — NEEDS_REVIEW
# ---------------------------------------------------------------------------

def test_needs_review_single_empty200() -> None:
    """single 200/rows=0/unblocked page → NEEDS_REVIEW"""
    assert classify_city([empty200]) == "NEEDS_REVIEW"


def test_needs_review_all_empty200() -> None:
    """all pages are 200/rows=0/unblocked → NEEDS_REVIEW"""
    assert classify_city([empty200, empty200, empty200]) == "NEEDS_REVIEW"


# ---------------------------------------------------------------------------
# Spec edge cases (explicitly called out in the spec)
# ---------------------------------------------------------------------------

def test_edge_single_blocked_among_producing_is_transient_not_blocked() -> None:
    """
    A SINGLE blocked page among producing pages classifies TRANSIENT, not BLOCKED.
    The blocked page is outnumbered; city still has yield on other pages.
    """
    pages: list[PageResult] = [
        producing(8),
        producing(12),
        blocked403,       # ← the single blocked interloper
        producing(3),
    ]
    result = classify_city(pages)
    assert result == "TRANSIENT"
    assert result != "BLOCKED"


def test_edge_all_200_zero_rows_is_needs_review_not_ok() -> None:
    """all-200-zero-rows classifies NEEDS_REVIEW, not OK"""
    pages: list[PageResult] = [empty200, empty200]
    result = classify_city(pages)
    assert result == "NEEDS_REVIEW"
    assert result != "OK"


def test_edge_all_200_zero_rows_is_needs_review_not_blocked() -> None:
    """all-200-zero-rows classifies NEEDS_REVIEW, not BLOCKED"""
    pages: list[PageResult] = [empty200, empty200]
    result = classify_city(pages)
    assert result == "NEEDS_REVIEW"
    assert result != "BLOCKED"


# ---------------------------------------------------------------------------
# Status-code boundary checks
# ---------------------------------------------------------------------------

def test_boundary_200_with_rows_not_blocked_is_ok() -> None:
    """status 200 with rows > 0 and not blocked → OK (not mistaken for block)"""
    assert classify_city([PageResult(status=200, rows=5, blocked=False)]) == "OK"


def test_boundary_403_with_rows_is_blocked_rows_ignored() -> None:
    """status 403 with rows > 0 is still counted as blocked → BLOCKED (rows ignored)"""
    # Adversarial: rows field is non-zero but the page is blocked.
    assert classify_city([PageResult(status=403, rows=99, blocked=False)]) == "BLOCKED"


def test_boundary_429_with_rows_is_blocked_rows_ignored() -> None:
    """status 429 with rows > 0 is still counted as blocked → BLOCKED (rows ignored)"""
    assert classify_city([PageResult(status=429, rows=99, blocked=False)]) == "BLOCKED"


def test_boundary_soft_blocked_with_rows_drives_transient_with_other_producer() -> None:
    """soft-blocked with rows > 0 drives TRANSIENT when another page also produces"""
    # Two pages: one soft-blocked-but-has-rows and one clean producing page.
    assert classify_city([
        PageResult(status=200, rows=5, blocked=True),
        producing(10),
    ]) == "TRANSIENT"


# ---------------------------------------------------------------------------
# Empty-input guard
# ---------------------------------------------------------------------------

def test_empty_input_returns_needs_review() -> None:
    """empty pages array → NEEDS_REVIEW (conservative fallback)"""
    assert classify_city([]) == "NEEDS_REVIEW"
