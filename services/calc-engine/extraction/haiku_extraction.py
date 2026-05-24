"""
Claude Haiku listing description extraction — spec Section 19 (TEMPLATE CODE).
Haiku extracts structured flags that regex cannot reliably detect.

The extraction prompt and confidence thresholds will evolve as more
listing data is analysed. Update the spec when the prompt changes.
"""

import json
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))

EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'


async def extract_flags_with_haiku(description: str) -> dict[str, object]:
    """
    Extract structured flags from a listing description using Claude Haiku.

    Returns a dict of flag_id → {confidence: int, evidence: str | None}.
    Only flags with confidence >= 60% are returned.

    Never feed the raw output of this function directly into the deal score.
    Always pass through logic_gate.merge_flags() first.

    Args:
        description: Raw listing description text.

    Returns:
        Dict of extracted flag data.
    """
    # TODO: implement extraction prompt — see spec Section 19 for flag list
    # The prompt must ask Haiku to return valid JSON only.
    raise NotImplementedError("Haiku extraction: implement prompt from spec Section 19")
