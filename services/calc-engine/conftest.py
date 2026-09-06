"""
pytest configuration for the calc-engine service.

Adds the calc-engine directory to sys.path so that absolute imports
(e.g. `from constants.rates import ...`) work in all test files,
regardless of how pytest discovers and imports them.
"""

import os
import sys

import pytest

# Ensure the calc-engine root is always on sys.path when pytest runs.
# This allows test files inside packages (calculations/, extraction/, etc.)
# to use absolute imports like `from constants.rates import ...` instead of
# cross-package relative imports like `from ..constants.rates import ...`.
sys.path.insert(0, os.path.dirname(__file__))


@pytest.fixture(autouse=True)
def _no_network_obstruction(monkeypatch):
    """
    Keep the OpenStreetMap lookup out of the test suite.

    POST /analysis/ assesses building obstruction (spec §17 Phase 2), which calls
    the Overpass API. Left alone, every router test made a real HTTP request:
    the suite went from ~6s to over a minute and failed intermittently when
    Overpass — a free, rate-limited community endpoint — throttled us. A test
    that fails because someone else's server is busy teaches nothing.

    Returns an "unavailable" profile, which is exactly how production behaves
    during an Overpass outage, so the tested path is a real one. Tests that want
    obstruction pass buildings straight into `build_profile`, which this does not
    touch — see sunscout/obstruction_test.py.
    """
    from sunscout.obstruction import ObstructionProfile

    def _offline(*_args, **kwargs):
        return ObstructionProfile(available=False, observer_height_m=0.0)

    monkeypatch.setattr("routers.analysis.build_profile", _offline, raising=False)
    monkeypatch.setattr("sunscout.sun_path.build_profile", _offline, raising=False)
