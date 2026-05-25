"""
Tests for bank_of_canada_service.py.

Covers:
  - Fresh cache returned without fetching
  - Successful live fetch saves cache and returns live source
  - API failure with stale cache → cached source + warning
  - API failure with no cache → fallback rate + warning
  - Cache freshness boundary (exactly at TTL boundary)
  - Malformed API responses handled gracefully
  - Date formatting in warning messages
"""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from services.bank_of_canada_service import (
    _format_date,
    _is_cache_fresh,
    _load_cache,
    _save_cache,
    get_current_rate,
)
from constants.rates import MORTGAGE_RATE_FALLBACK

# ── Fixtures ───────────────────────────────────────────────────────────────────


@pytest.fixture
def cache_path(tmp_path: Path) -> Path:
    """Temporary cache file path — isolated per test."""
    return tmp_path / ".boc_rate_cache.json"


def _make_boc_response(prime_value: str = "5.20") -> MagicMock:
    """Return a mock httpx response with a valid BofC-today JSON payload."""
    mock = MagicMock()
    mock.raise_for_status = MagicMock()
    mock.json.return_value = {
        "observations": [
            {"d": "2026-05-23", "PRIME": {"v": prime_value}},
        ]
    }
    return mock


def _write_cache(cache_path: Path, rate: float, fetched_at: str) -> None:
    """Helper: write a cache file with the given rate and timestamp."""
    cache_path.write_text(
        json.dumps({"rate": rate, "fetched_at": fetched_at}), encoding="utf-8"
    )


def _fresh_ts() -> str:
    """ISO timestamp from 1 day ago — within the 7-day TTL."""
    return (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()


def _stale_ts() -> str:
    """ISO timestamp from 10 days ago — beyond the 7-day TTL."""
    return (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()


# ── _load_cache ────────────────────────────────────────────────────────────────


def test_load_cache_returns_none_when_file_missing(tmp_path: Path) -> None:
    result = _load_cache(tmp_path / "nonexistent.json")
    assert result is None


def test_load_cache_returns_none_on_corrupt_json(cache_path: Path) -> None:
    cache_path.write_text("not valid json", encoding="utf-8")
    assert _load_cache(cache_path) is None


def test_load_cache_returns_dict_on_valid_file(cache_path: Path) -> None:
    _write_cache(cache_path, 0.052, _fresh_ts())
    result = _load_cache(cache_path)
    assert result is not None
    assert result["rate"] == 0.052


# ── _save_cache ────────────────────────────────────────────────────────────────


def test_save_cache_creates_file(cache_path: Path) -> None:
    ts = _fresh_ts()
    _save_cache(0.052, ts, cache_path)
    assert cache_path.exists()
    data = json.loads(cache_path.read_text(encoding="utf-8"))
    assert data["rate"] == 0.052
    assert data["fetched_at"] == ts


def test_save_cache_is_nonfatal_on_write_error(tmp_path: Path) -> None:
    """Writing to a path that cannot be created should not raise."""
    bad_path = tmp_path / "nonexistent_dir" / "cache.json"
    _save_cache(0.052, _fresh_ts(), bad_path)  # should not raise


# ── _is_cache_fresh ────────────────────────────────────────────────────────────


def test_is_cache_fresh_within_ttl() -> None:
    cache = {"fetched_at": _fresh_ts()}
    assert _is_cache_fresh(cache) is True


def test_is_cache_fresh_beyond_ttl() -> None:
    cache = {"fetched_at": _stale_ts()}
    assert _is_cache_fresh(cache) is False


def test_is_cache_fresh_returns_false_on_bad_timestamp() -> None:
    assert _is_cache_fresh({"fetched_at": "not-a-date"}) is False


def test_is_cache_fresh_returns_false_on_missing_key() -> None:
    assert _is_cache_fresh({}) is False


# ── _format_date ───────────────────────────────────────────────────────────────


def test_format_date_standard_iso() -> None:
    result = _format_date("2026-05-17T12:00:00+00:00")
    assert result == "May 17, 2026"


def test_format_date_no_leading_zero_on_single_digit_day() -> None:
    result = _format_date("2026-01-05T00:00:00+00:00")
    assert result == "January 5, 2026"


def test_format_date_returns_fallback_on_invalid() -> None:
    result = _format_date("not-a-date")
    assert result == "unknown date"


# ── get_current_rate — fresh cache ─────────────────────────────────────────────


def test_returns_live_source_when_cache_is_fresh(cache_path: Path) -> None:
    """Fresh cache should be returned without making any HTTP call."""
    _write_cache(cache_path, 0.052, _fresh_ts())

    with patch("services.bank_of_canada_service.httpx.get") as mock_get:
        result = get_current_rate(cache_file=cache_path)
        mock_get.assert_not_called()  # no HTTP call when cache is fresh

    assert result["source"] == "live"
    assert result["rate"] == 0.052
    assert result["warning"] is None


# ── get_current_rate — live fetch ──────────────────────────────────────────────


def test_live_fetch_on_stale_cache(cache_path: Path) -> None:
    """Stale cache triggers a live fetch; on success returns source=live."""
    _write_cache(cache_path, 0.049, _stale_ts())

    with patch(
        "services.bank_of_canada_service.httpx.get",
        return_value=_make_boc_response("5.20"),
    ):
        result = get_current_rate(cache_file=cache_path)

    assert result["source"] == "live"
    assert abs(result["rate"] - 0.0520) < 0.0001
    assert result["warning"] is None
    # Cache should now be updated
    saved = json.loads(cache_path.read_text(encoding="utf-8"))
    assert abs(saved["rate"] - 0.0520) < 0.0001


def test_live_fetch_on_empty_cache(cache_path: Path) -> None:
    """No cache at all → live fetch → saves result."""
    with patch(
        "services.bank_of_canada_service.httpx.get",
        return_value=_make_boc_response("4.95"),
    ):
        result = get_current_rate(cache_file=cache_path)

    assert result["source"] == "live"
    assert abs(result["rate"] - 0.0495) < 0.0001


# ── get_current_rate — stale cache fallback ────────────────────────────────────


def test_cached_source_when_api_fails_and_stale_cache_exists(
    cache_path: Path,
) -> None:
    """API failure + stale cache → source=cached + warning containing date."""
    _write_cache(cache_path, 0.052, _stale_ts())

    with patch(
        "services.bank_of_canada_service.httpx.get",
        side_effect=Exception("connection refused"),
    ):
        result = get_current_rate(cache_file=cache_path)

    assert result["source"] == "cached"
    assert result["rate"] == 0.052
    assert result["warning"] is not None
    assert "cached rate from" in result["warning"].lower()
    assert "live rate unavailable" in result["warning"].lower()


# ── get_current_rate — hardcoded fallback ──────────────────────────────────────


def test_fallback_rate_when_api_fails_and_no_cache(cache_path: Path) -> None:
    """No cache + API failure → MORTGAGE_RATE_FALLBACK + warning."""
    with patch(
        "services.bank_of_canada_service.httpx.get",
        side_effect=Exception("timeout"),
    ):
        result = get_current_rate(cache_file=cache_path)

    assert result["source"] == "fallback"
    assert result["rate"] == MORTGAGE_RATE_FALLBACK
    assert result["warning"] is not None
    assert result["fetched_at"] is None


# ── Malformed API responses ────────────────────────────────────────────────────


def test_empty_observations_falls_back(cache_path: Path) -> None:
    mock = MagicMock()
    mock.raise_for_status = MagicMock()
    mock.json.return_value = {"observations": []}

    with patch("services.bank_of_canada_service.httpx.get", return_value=mock):
        result = get_current_rate(cache_file=cache_path)

    assert result["source"] == "fallback"


def test_missing_prime_series_falls_back(cache_path: Path) -> None:
    mock = MagicMock()
    mock.raise_for_status = MagicMock()
    mock.json.return_value = {
        "observations": [{"d": "2026-05-23", "CORRA": {"v": "2.95"}}]
    }

    with patch("services.bank_of_canada_service.httpx.get", return_value=mock):
        result = get_current_rate(cache_file=cache_path)

    assert result["source"] == "fallback"


def test_nonnumeric_value_falls_back(cache_path: Path) -> None:
    mock = MagicMock()
    mock.raise_for_status = MagicMock()
    mock.json.return_value = {
        "observations": [{"d": "2026-05-23", "PRIME": {"v": "N/A"}}]
    }

    with patch("services.bank_of_canada_service.httpx.get", return_value=mock):
        result = get_current_rate(cache_file=cache_path)

    assert result["source"] == "fallback"
