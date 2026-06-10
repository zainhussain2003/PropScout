"""
Unit and functionality tests for the Haiku extraction pipeline.

The Anthropic API is mocked so tests run offline and are deterministic.
"""

import json
import pytest
from unittest.mock import MagicMock, patch

from extraction.haiku_extraction import (
    _empty_flags,
    _strip_markdown,
    _FLAG_IDS,
    extract_flags_with_haiku,
)


# ── Unit tests — pure helpers ─────────────────────────────────────────────────


class TestEmptyFlags:
    """Tests for _empty_flags()."""

    def test_returns_all_flag_ids(self) -> None:
        flags = _empty_flags()
        for flag_id in _FLAG_IDS:
            assert flag_id in flags

    def test_all_values_false(self) -> None:
        flags = _empty_flags()
        for flag_id, data in flags.items():
            assert isinstance(data, dict)
            assert data["value"] is False
            assert data["confidence"] == 0


class TestStripMarkdown:
    """Tests for _strip_markdown()."""

    def test_plain_json_unchanged(self) -> None:
        raw = '{"key": "value"}'
        assert _strip_markdown(raw) == raw

    def test_strips_json_fence(self) -> None:
        raw = "```json\n{\"key\": \"value\"}\n```"
        result = _strip_markdown(raw)
        assert result == '{"key": "value"}'

    def test_strips_plain_fence(self) -> None:
        raw = "```\n{\"key\": \"value\"}\n```"
        result = _strip_markdown(raw)
        assert result == '{"key": "value"}'

    def test_no_fence_passthrough(self) -> None:
        raw = '  {"a": 1}  '
        result = _strip_markdown(raw)
        assert result == '{"a": 1}'


# ── Functionality tests — extract_flags_with_haiku() with mocked Anthropic ───


def _make_mock_client(response_text: str) -> MagicMock:
    """Build a mock Anthropic client that returns response_text."""
    mock_content = MagicMock()
    mock_content.text = response_text

    mock_response = MagicMock()
    mock_response.content = [mock_content]

    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_response
    return mock_client


def _minimal_haiku_response(overrides: dict | None = None) -> str:
    """Build a minimal valid Haiku JSON response with all flags set to false."""
    base = {
        flag_id: {"value": False, "confidence": 0, "evidence": ""}
        for flag_id in _FLAG_IDS
    }
    if overrides:
        base.update(overrides)
    return json.dumps(base)


class TestExtractFlagsWithHaiku:
    """Tests for extract_flags_with_haiku() with the Anthropic client mocked."""

    @pytest.mark.asyncio
    async def test_returns_all_flag_ids(self) -> None:
        response_json = _minimal_haiku_response()
        mock_client = _make_mock_client(response_json)

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            result = await extract_flags_with_haiku("A standard listing description.")

        for flag_id in _FLAG_IDS:
            assert flag_id in result

    @pytest.mark.asyncio
    async def test_high_confidence_basement_flag(self) -> None:
        response_json = _minimal_haiku_response({
            "is_basement_unit": {"value": True, "confidence": 92, "evidence": "finished lower level"},
            "basement_unit": {"value": True, "confidence": 90, "evidence": "basement suite"},
        })
        mock_client = _make_mock_client(response_json)

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            result = await extract_flags_with_haiku("Finished lower level — basement suite.")

        basement = result["is_basement_unit"]
        assert isinstance(basement, dict)
        assert basement["value"] is True
        assert basement["confidence"] == 92
        assert "lower level" in basement["evidence"]

    @pytest.mark.asyncio
    async def test_pets_allowed_flag(self) -> None:
        response_json = _minimal_haiku_response({
            "pets_allowed": {"value": True, "confidence": 95, "evidence": "pets welcome"},
        })
        mock_client = _make_mock_client(response_json)

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            result = await extract_flags_with_haiku("Pets welcome in this bright condo.")

        pets = result["pets_allowed"]
        assert isinstance(pets, dict)
        assert pets["value"] is True
        assert pets["confidence"] == 95

    @pytest.mark.asyncio
    async def test_api_failure_returns_empty_flags(self) -> None:
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API unreachable")

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            result = await extract_flags_with_haiku("Some listing description.")

        # On failure, all flags should be false with confidence 0
        for flag_id in _FLAG_IDS:
            assert flag_id in result
            flag = result[flag_id]
            assert isinstance(flag, dict)
            assert flag["value"] is False
            assert flag["confidence"] == 0

    @pytest.mark.asyncio
    async def test_invalid_json_response_returns_empty_flags(self) -> None:
        mock_client = _make_mock_client("This is not valid JSON at all!")

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            result = await extract_flags_with_haiku("Some listing description.")

        for flag_id in _FLAG_IDS:
            assert result[flag_id]["confidence"] == 0
            assert result[flag_id]["value"] is False

    @pytest.mark.asyncio
    async def test_markdown_fenced_response_parsed(self) -> None:
        inner = _minimal_haiku_response({
            "renovation_needed": {"value": True, "confidence": 88, "evidence": "sold as-is"},
        })
        fenced = f"```json\n{inner}\n```"
        mock_client = _make_mock_client(fenced)

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            result = await extract_flags_with_haiku("Sold as-is, great bones.")

        assert result["renovation_needed"]["value"] is True
        assert result["renovation_needed"]["confidence"] == 88

    @pytest.mark.asyncio
    async def test_empty_description_returns_empty_flags(self) -> None:
        """Empty description should short-circuit before calling the API."""
        mock_client = MagicMock()

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            result = await extract_flags_with_haiku("")

        mock_client.messages.create.assert_not_called()
        for flag_id in _FLAG_IDS:
            assert result[flag_id]["value"] is False

    @pytest.mark.asyncio
    async def test_whitespace_only_description_returns_empty_flags(self) -> None:
        mock_client = MagicMock()

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            result = await extract_flags_with_haiku("   \n\t  ")

        mock_client.messages.create.assert_not_called()
        for flag_id in _FLAG_IDS:
            assert result[flag_id]["value"] is False

    @pytest.mark.asyncio
    async def test_partial_response_normalised(self) -> None:
        """If Haiku returns fewer flags than expected, missing ones default to false."""
        partial = json.dumps({
            "is_basement_unit": {"value": True, "confidence": 85, "evidence": "lower level"},
        })
        mock_client = _make_mock_client(partial)

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            result = await extract_flags_with_haiku("Lower level unit.")

        # The one returned flag should be present
        assert result["is_basement_unit"]["value"] is True
        # All other expected flags should also be present with defaults
        for flag_id in _FLAG_IDS:
            assert flag_id in result
            assert isinstance(result[flag_id], dict)

    @pytest.mark.asyncio
    async def test_haiku_called_with_correct_model(self) -> None:
        """Verify the correct Haiku model ID is used."""
        from extraction.haiku_extraction import EXTRACTION_MODEL

        response_json = _minimal_haiku_response()
        mock_client = _make_mock_client(response_json)

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            await extract_flags_with_haiku("A listing description.")

        call_kwargs = mock_client.messages.create.call_args
        assert call_kwargs.kwargs.get("model") == EXTRACTION_MODEL or (
            call_kwargs.args and call_kwargs.args[0] == EXTRACTION_MODEL
        )

    @pytest.mark.asyncio
    async def test_temperature_zero(self) -> None:
        """Extraction must use temperature=0 for deterministic output."""
        response_json = _minimal_haiku_response()
        mock_client = _make_mock_client(response_json)

        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            await extract_flags_with_haiku("A listing description.")

        call_kwargs = mock_client.messages.create.call_args
        assert call_kwargs.kwargs.get("temperature") == 0

    @pytest.mark.asyncio
    async def test_multiple_flags_detected(self) -> None:
        """All flags in a rich description are extracted correctly."""
        response_json = _minimal_haiku_response({
            "pets_allowed": {"value": True, "confidence": 95, "evidence": "pets welcome"},
            "parking_included": {"value": True, "confidence": 90, "evidence": "underground parking"},
            "utilities_included": {"value": True, "confidence": 92, "evidence": "all utilities included"},
        })
        mock_client = _make_mock_client(response_json)

        description = (
            "Pets welcome! Underground parking included. All utilities included. "
            "Bright 2-bedroom condo in Vaughan."
        )
        with patch("extraction.haiku_extraction._get_client", return_value=mock_client):
            result = await extract_flags_with_haiku(description)

        assert result["pets_allowed"]["value"] is True
        assert result["parking_included"]["value"] is True
        assert result["utilities_included"]["value"] is True
