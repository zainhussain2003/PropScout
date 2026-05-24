"""
pytest configuration for the calc-engine service.

Adds the calc-engine directory to sys.path so that absolute imports
(e.g. `from constants.rates import ...`) work in all test files,
regardless of how pytest discovers and imports them.
"""

import sys
import os

# Ensure the calc-engine root is always on sys.path when pytest runs.
# This allows test files inside packages (calculations/, extraction/, etc.)
# to use absolute imports like `from constants.rates import ...` instead of
# cross-package relative imports like `from ..constants.rates import ...`.
sys.path.insert(0, os.path.dirname(__file__))
