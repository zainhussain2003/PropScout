"""
Bank of Canada prime rate service.

Fetches the prime business loan rate weekly from the Bank of Canada Valet API.
The result is cached in a local JSON file for BOC_CACHE_TTL_DAYS days.

Fallback chain (in order):
  1. Fresh cache (within TTL)    → source: "live",     warning: None
  2. Successful live fetch       → source: "live",     warning: None
  3. Stale cache (beyond TTL)    → source: "cached",   warning: (with date)
  4. No cache at all             → source: "fallback", warning: (generic)

The returned rate is always a decimal (e.g. 0.052 = 5.20%).
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import httpx

from constants.rates import (
    BOC_CACHE_TTL_DAYS,
    BOC_PRIME_SERIES,
    BOC_VALET_URL,
    MORTGAGE_RATE_FALLBACK,
)

# ── Types ──────────────────────────────────────────────────────────────────────

RateSource = Literal["live", "cached", "fallback"]

# Default cache file — sits in the calc-engine root next to main.py.
# Tests override this via the cache_file parameter.
_DEFAULT_CACHE_FILE = Path(__file__).parent.parent / ".boc_rate_cache.json"


# ── Internal helpers ───────────────────────────────────────────────────────────


def _load_cache(cache_file: Path) -> dict | None:
    """
    Load the cached rate from disk.

    Returns:
        Dict with 'rate' (float) and 'fetched_at' (ISO string),
        or None if the file doesn't exist or is corrupt.
    """
    try:
        if cache_file.exists():
            data = json.loads(cache_file.read_text(encoding="utf-8"))
            if isinstance(data.get("rate"), (int, float)) and isinstance(
                data.get("fetched_at"), str
            ):
                return data
    except (json.JSONDecodeError, OSError, KeyError):
        pass
    return None


def _save_cache(rate: float, fetched_at: str, cache_file: Path) -> None:
    """
    Persist the fetched rate to disk. Non-fatal on write errors.

    Args:
        rate: Rate as a decimal (e.g. 0.052).
        fetched_at: ISO 8601 timestamp string.
        cache_file: Path to the cache JSON file.
    """
    try:
        cache_file.write_text(
            json.dumps({"rate": rate, "fetched_at": fetched_at}, indent=2),
            encoding="utf-8",
        )
    except OSError:
        pass  # Cache write failure is non-fatal — we still return the rate


def _is_cache_fresh(cache: dict) -> bool:
    """
    Return True if the cached rate is within BOC_CACHE_TTL_DAYS.

    Args:
        cache: Dict with 'fetched_at' ISO string.

    Returns:
        True if the cache is still within the TTL, False otherwise.
    """
    try:
        fetched_at = datetime.fromisoformat(cache["fetched_at"])
        # Ensure offset-aware comparison
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - fetched_at
        return age.days < BOC_CACHE_TTL_DAYS
    except (KeyError, ValueError, TypeError):
        return False


def _fetch_live_rate() -> float | None:
    """
    Fetch the current prime rate from the Bank of Canada Valet API.

    Returns:
        Rate as a decimal (e.g. 0.052 for 5.20%), or None on any failure.
        The BofC API returns percentage as a string: "5.20" → 0.052.
    """
    try:
        response = httpx.get(BOC_VALET_URL, timeout=10.0)
        response.raise_for_status()
        data = response.json()

        observations = data.get("observations", [])
        if not observations:
            return None

        # Most recent observation is the last entry
        latest = observations[-1]
        prime_entry = latest.get(BOC_PRIME_SERIES)
        if not prime_entry:
            return None

        raw_value = prime_entry.get("v")
        if raw_value is None:
            return None

        return float(raw_value) / 100.0  # "5.20" → 0.052
    except Exception:
        return None


def _format_date(iso_string: str) -> str:
    """
    Format an ISO date string as a human-readable date (cross-platform).

    Args:
        iso_string: ISO 8601 datetime string (e.g. "2026-05-17T12:00:00+00:00").

    Returns:
        Formatted string like "May 17, 2026".
    """
    try:
        dt = datetime.fromisoformat(iso_string)
        month = dt.strftime("%B")
        return f"{month} {dt.day}, {dt.year}"
    except ValueError:
        return "unknown date"


# ── Public API ─────────────────────────────────────────────────────────────────


def get_current_rate(cache_file: Path = _DEFAULT_CACHE_FILE) -> dict:
    """
    Get the current Bank of Canada prime rate, with caching and fallback.

    Checks the local cache first. If the cache is fresh (within 7 days) it
    is returned immediately. Otherwise a live fetch is attempted. On failure
    the stale cache is returned with a warning, or the hardcoded fallback
    if no cache exists.

    Args:
        cache_file: Path to the cache JSON file. Defaults to the calc-engine
                    root. Tests pass a temp-directory path to avoid side effects.

    Returns:
        Dict with:
            rate (float): Prime rate as a decimal (e.g. 0.052 = 5.20%).
            source (str): "live", "cached", or "fallback".
            fetched_at (str | None): ISO 8601 timestamp of the last successful fetch.
            warning (str | None): User-facing banner text; None when source is "live".
    """
    cache = _load_cache(cache_file)

    # ── 1. Fresh cache ─────────────────────────────────────────────────────────
    if cache and _is_cache_fresh(cache):
        return {
            "rate": cache["rate"],
            "source": "live",
            "fetched_at": cache["fetched_at"],
            "warning": None,
        }

    # ── 2. Live fetch ──────────────────────────────────────────────────────────
    live_rate = _fetch_live_rate()
    if live_rate is not None:
        now = datetime.now(timezone.utc).isoformat()
        _save_cache(live_rate, now, cache_file)
        return {
            "rate": live_rate,
            "source": "live",
            "fetched_at": now,
            "warning": None,
        }

    # ── 3. Stale cache ─────────────────────────────────────────────────────────
    if cache:
        date_str = _format_date(cache.get("fetched_at", ""))
        return {
            "rate": cache["rate"],
            "source": "cached",
            "fetched_at": cache.get("fetched_at"),
            "warning": (f"Using cached rate from {date_str} — live rate unavailable."),
        }

    # ── 4. Hardcoded fallback ──────────────────────────────────────────────────
    return {
        "rate": MORTGAGE_RATE_FALLBACK,
        "source": "fallback",
        "fetched_at": None,
        "warning": "Live rate unavailable — using default rate. Check your connection.",
    }
