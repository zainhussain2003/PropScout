"""
Claude Haiku listing description extraction — spec Section 19 (TEMPLATE CODE).
Haiku extracts structured flags that regex cannot reliably detect.

The extraction prompt and confidence thresholds will evolve as more
listing data is analysed. Update the spec when the prompt changes.

Architecture:
  raw description → this module → dict[flag_id, {confidence, evidence}]
  → logic_gate.merge_flags() → validated MergedFlag list
  → calc engine (deal score deductions)

Never pass raw output from this module directly to the deal score.
Always go through logic_gate.merge_flags() first.
"""

import json
import logging
import os

from anthropic import Anthropic

logger = logging.getLogger(__name__)

# Lazy-initialised so tests can mock before the client is created.
_client: Anthropic | None = None

EXTRACTION_MODEL = "claude-haiku-4-5-20251001"

# Max tokens is kept low — we expect a small JSON object back.
_MAX_TOKENS = 600

# ── Flag definitions ───────────────────────────────────────────────────────────
# These are the flag IDs Haiku is asked to detect.
# Keep in sync with spec Section 19 and constants/thresholds.py.

_FLAG_IDS: list[str] = [
    "unverified_bedroom",  # Den / office counted as bedroom
    "glass_door_bedroom",  # Bedroom separated only by glass/barn door
    "is_basement_unit",  # Unit is below-grade
    "parking_unclear",  # Parking status ambiguous
    "illegal_unit_risk",  # Signs of unpermitted secondary suite
    "special_assessment_risk",  # Reserve fund issues or upcoming major works
    "no_exterior_window",  # Unit or room may have no exterior window
    "basement_unit",  # Explicit basement suite (broader than is_basement_unit)
    "pets_allowed",  # Pets explicitly permitted
    "utilities_included",  # Heat/hydro included in rent
    "parking_included",  # Parking spot included
    "furnished",  # Unit is furnished
    "den_present",  # Den present (not counted as bedroom)
    "no_smoking",  # No smoking policy
    "short_term_ok",  # Short-term rental allowed
    "renovation_needed",  # Description signals TLC / needs work
    "new_construction",  # Newly built unit
]

# The prompt is TEMPLATE CODE — iterate on wording based on output quality.
_EXTRACTION_PROMPT = """\
Analyze this real estate listing description and extract structured flags.
Output ONLY valid JSON. No explanation. No preamble. No markdown formatting.

For each field: if ambiguous or not clearly stated, default to false.
Include a confidence score 0-100 (integer) and a short evidence quote (≤ 15 words) for each flag.
Confidence 0 means no evidence; confidence 100 means explicit, unambiguous statement.

Return exactly this structure:
{{
  "unverified_bedroom":      {{"value": bool, "confidence": int, "evidence": str}},
  "glass_door_bedroom":      {{"value": bool, "confidence": int, "evidence": str}},
  "is_basement_unit":        {{"value": bool, "confidence": int, "evidence": str}},
  "parking_unclear":         {{"value": bool, "confidence": int, "evidence": str}},
  "illegal_unit_risk":       {{"value": bool, "confidence": int, "evidence": str}},
  "special_assessment_risk": {{"value": bool, "confidence": int, "evidence": str}},
  "no_exterior_window":      {{"value": bool, "confidence": int, "evidence": str}},
  "basement_unit":           {{"value": bool, "confidence": int, "evidence": str}},
  "pets_allowed":            {{"value": bool, "confidence": int, "evidence": str}},
  "utilities_included":      {{"value": bool, "confidence": int, "evidence": str}},
  "parking_included":        {{"value": bool, "confidence": int, "evidence": str}},
  "furnished":               {{"value": bool, "confidence": int, "evidence": str}},
  "den_present":             {{"value": bool, "confidence": int, "evidence": str}},
  "no_smoking":              {{"value": bool, "confidence": int, "evidence": str}},
  "short_term_ok":           {{"value": bool, "confidence": int, "evidence": str}},
  "renovation_needed":       {{"value": bool, "confidence": int, "evidence": str}},
  "new_construction":        {{"value": bool, "confidence": int, "evidence": str}},
  "grow_op_history":         {{"value": bool, "confidence": int, "evidence": str}},
  "flooding_history":        {{"value": bool, "confidence": int, "evidence": str}}
}}

Examples of language that should trigger flags:
- "versatile second room" or "perfect home office" -> unverified_bedroom: true, confidence 75
- "glass partition" or "barn door bedroom" -> glass_door_bedroom: true, confidence 85
- "finished lower level" or "basement suite" -> is_basement_unit: true, confidence 90
- "parking available upon request / inquire with management" -> parking_unclear: true, confidence 88
- "separate entrance" on a lower-level unit -> illegal_unit_risk: true, confidence 70
- "reserve fund study" or "special assessment" -> special_assessment_risk: true, confidence 92
- "pets welcome" or "pet friendly" -> pets_allowed: true, confidence 95
- "all utilities included" -> utilities_included: true, confidence 95
- "sold as-is" or "needs TLC" or "handyman special" -> renovation_needed: true, confidence 90
- "brand new" or "newly built" or "new construction" -> new_construction: true, confidence 90
- "no smoking" or "smoke free" -> no_smoking: true, confidence 95
- "short-term rental permitted" or "Airbnb friendly" -> short_term_ok: true, confidence 88

These two are SEVERE and are described in euphemism — sellers rarely state them plainly.
Read for oblique language, not just the obvious word, but stay conservative (set false
when genuinely ambiguous; the confidence score carries your uncertainty):
- "former grow-op", "previously used for cultivation", "remediation completed / Health
  Canada clearance", "stigmatized property" -> grow_op_history: true, confidence 70-95
- "flood zone", "floodplain", "past water damage", "below-grade moisture", "restoration
  after water", "conservation authority regulated" -> flooding_history: true, confidence 70-95
- Do NOT flag "sunlight floods the room" (grow_op/flooding both false) or "grow your family".

Listing description:
{description}"""


# ── Internal helpers ───────────────────────────────────────────────────────────


def _get_client() -> Anthropic:
    """Return (or lazily create) the shared Anthropic client."""
    global _client  # noqa: PLW0603
    if _client is None:
        _client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    return _client


def _empty_flags() -> dict[str, object]:
    """Return a safe empty-flag dict when extraction fails."""
    return {
        flag_id: {"value": False, "confidence": 0, "evidence": ""}
        for flag_id in _FLAG_IDS
    }


def _strip_markdown(text: str) -> str:
    """Remove accidental markdown code fences from model output."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Drop opening fence (```json or ```) and closing fence
        lines = lines[1:] if lines[0].startswith("```") else lines
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


# ── Public API ─────────────────────────────────────────────────────────────────


async def extract_flags_with_haiku(description: str) -> dict[str, object]:
    """
    Extract structured flags from a listing description using Claude Haiku.

    Calls the Anthropic API synchronously (wrapped in async signature for
    compatibility with the FastAPI router). Returns a dict of flag_id →
    {value, confidence, evidence} for all flags, regardless of confidence.

    Only flags with confidence >= 60 should be surfaced to the user.
    Always pass the output through logic_gate.merge_flags() before using it
    in the deal score — never use raw output directly.

    On any error (network, JSON parse, API rate limit), returns an all-false
    dict with confidence 0 so the pipeline degrades gracefully.

    Args:
        description: Raw listing description text.

    Returns:
        Dict mapping each flag_id to its extracted result dict.
    """
    if not description or not description.strip():
        return _empty_flags()

    prompt = _EXTRACTION_PROMPT.format(description=description)

    try:
        client = _get_client()
        response = client.messages.create(
            model=EXTRACTION_MODEL,
            max_tokens=_MAX_TOKENS,
            temperature=0,  # deterministic output
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text
    except Exception as exc:  # noqa: BLE001 — non-fatal; degrade gracefully
        logger.error("Haiku extraction API call failed: %s", exc)
        return _empty_flags()

    raw = _strip_markdown(raw)

    try:
        parsed: dict[str, object] = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error(
            "Haiku extraction JSON parse failed: %s\nRaw response: %.200s",
            exc,
            raw,
        )
        return _empty_flags()

    # Normalise — ensure all expected flag IDs are present with correct shape
    result: dict[str, object] = {}
    for flag_id in _FLAG_IDS:
        flag_data = parsed.get(flag_id, {})
        if not isinstance(flag_data, dict):
            flag_data = {}
        result[flag_id] = {
            "value": bool(flag_data.get("value", False)),
            "confidence": int(flag_data.get("confidence", 0)),
            "evidence": str(flag_data.get("evidence", "") or ""),
        }

    return result
