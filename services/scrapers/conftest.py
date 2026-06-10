"""Pytest configuration — makes scraper modules importable when pytest runs
from the repo root or from services/scrapers."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
