"""
Claude Haiku extraction service — called from the extraction pipeline.
Separate from the Fastify API's anthropicService.ts (which handles narrative).
"""

# This module wraps extraction/haiku_extraction.py for use by routers.
from ..extraction.haiku_extraction import extract_flags_with_haiku

__all__ = ['extract_flags_with_haiku']
