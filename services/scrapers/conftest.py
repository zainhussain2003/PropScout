"""Pytest configuration — makes scraper modules importable when pytest runs
from the repo root or from services/scrapers."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

# `_unported/` holds salvaged, deliberately un-wired code (see its README). Its
# tests import modules that no longer exist on master, so collecting them would
# break the suite. Delete this line when that code is ported.
collect_ignore_glob = ["_unported/*"]
