"""
File-based rate limiter for scraper requests.

Enforces a minimum delay between requests to any given source to avoid
hammering third-party servers. State is stored in a JSON file so the
limit persists across invocations of the same worker process.

Design: one timestamp entry per source. Before each request, the caller
checks the limiter and awaits the returned sleep duration.
"""

import asyncio
import json
import os
import time
from pathlib import Path

# Default minimum seconds between requests per source
DEFAULT_MIN_DELAY: float = 4.0

# State file path — stored in /tmp so it persists within a Railway run
_STATE_FILE: Path = Path(
    os.environ.get("RATE_LIMITER_STATE", "/tmp/propscout_rate_state.json")
)


def _load_state() -> dict[str, float]:
    """
    Load the last-request timestamps from the state file.

    Returns:
        Dict mapping source name → unix timestamp of last request.
        Returns empty dict if the file does not exist or is corrupt.
    """
    try:
        if _STATE_FILE.exists():
            with _STATE_FILE.open() as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return {k: float(v) for k, v in data.items()}
    except (json.JSONDecodeError, OSError, ValueError):
        pass
    return {}


def _save_state(state: dict[str, float]) -> None:
    """
    Write the last-request timestamp state to disk.

    Args:
        state: Dict mapping source name → unix timestamp.
    """
    try:
        _STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with _STATE_FILE.open("w") as f:
            json.dump(state, f)
    except OSError:
        pass  # Best-effort — do not crash the scraper over a state write failure


async def wait_for_rate_limit(
    source: str, min_delay: float = DEFAULT_MIN_DELAY
) -> None:
    """
    Block until the minimum delay since the last request to `source` has elapsed.

    Records the current time after the delay so subsequent calls for the same
    source wait the correct duration.

    Call this immediately before making any HTTP request to a third-party source.

    Args:
        source: Identifier for the target source (e.g. "realtor_ca").
        min_delay: Minimum seconds between requests. Defaults to 4.0 seconds.
    """
    state = _load_state()
    last = state.get(source, 0.0)
    now = time.monotonic()
    elapsed = now - last
    if elapsed < min_delay:
        await asyncio.sleep(min_delay - elapsed)

    # Record the time we are about to make the request
    state[source] = time.monotonic()
    _save_state(state)


def record_request(source: str) -> None:
    """
    Record that a request was just made to `source`.

    Use this when you need to record a request without awaiting the rate limiter
    (e.g. after a request has already been made).

    Args:
        source: Identifier for the target source (e.g. "realtor_ca").
    """
    state = _load_state()
    state[source] = time.monotonic()
    _save_state(state)
