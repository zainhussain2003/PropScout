"""
Tests for province.py.

Tests cover:
  - All Ontario FSA prefixes (K, L, M, N, P)
  - Several non-Ontario provinces
  - Edge cases: empty string, None, unknown prefix
  - province_gate_error structure
"""

import pytest
from province import detect_province, is_ontario, province_gate_error

# ── detect_province ────────────────────────────────────────────────────────────


class TestDetectProvince:
    @pytest.mark.parametrize(
        "postal_code,expected",
        [
            ("L4J 7K1", "ON"),  # Vaughan (L prefix)
            ("M5V 1A1", "ON"),  # Toronto (M prefix)
            ("K1A 0A6", "ON"),  # Ottawa (K prefix)
            ("N2L 3G1", "ON"),  # Waterloo (N prefix)
            ("P3A 1A1", "ON"),  # Sudbury (P prefix)
            ("V6B 1A1", "BC"),  # Vancouver
            ("T2P 1A1", "AB"),  # Calgary
            ("S7K 1A1", "SK"),  # Saskatoon
            ("R3C 1A1", "MB"),  # Winnipeg
            ("H2Y 1C6", "QC"),  # Montreal (H prefix)
            ("G1R 1A1", "QC"),  # Quebec City (G prefix)
            ("J4H 1A1", "QC"),  # Longueuil (J prefix)
            ("B3H 1A1", "NS"),  # Halifax
            ("E1C 1A1", "NB"),  # Moncton
            ("C1A 1A1", "PE"),  # Charlottetown
            ("A1C 1A1", "NL"),  # St. John's
            ("Y1A 1A1", "YT"),  # Whitehorse
        ],
    )
    def test_known_provinces(self, postal_code: str, expected: str) -> None:
        assert detect_province(postal_code) == expected

    def test_lowercase_postal_code(self) -> None:
        assert detect_province("m5v 1a1") == "ON"

    def test_no_space_in_postal_code(self) -> None:
        assert detect_province("L4J7K1") == "ON"

    def test_empty_string_returns_none(self) -> None:
        assert detect_province("") is None

    def test_whitespace_only_returns_none(self) -> None:
        assert detect_province("   ") is None

    def test_unknown_prefix_returns_none(self) -> None:
        # 'Z' is not a valid Canadian FSA prefix
        assert detect_province("Z9Z 9Z9") is None

    def test_single_letter_postal_code(self) -> None:
        """Single-char input — treated as just the FSA prefix."""
        assert detect_province("M") == "ON"

    def test_leading_space_stripped(self) -> None:
        assert detect_province("  L4J 7K1") == "ON"


# ── is_ontario ────────────────────────────────────────────────────────────────


class TestIsOntario:
    @pytest.mark.parametrize(
        "postal_code",
        [
            "L4J 7K1",
            "M5V 1A1",
            "K1A 0A6",
            "N2L 3G1",
            "P3A 1A1",
        ],
    )
    def test_ontario_postal_codes_return_true(self, postal_code: str) -> None:
        assert is_ontario(postal_code) is True

    @pytest.mark.parametrize(
        "postal_code",
        [
            "V6B 1A1",
            "T2P 1A1",
            "S7K 1A1",
            "H2Y 1C6",
            "B3H 1A1",
        ],
    )
    def test_non_ontario_postal_codes_return_false(self, postal_code: str) -> None:
        assert is_ontario(postal_code) is False

    def test_empty_string_returns_false(self) -> None:
        assert is_ontario("") is False


# ── province_gate_error ────────────────────────────────────────────────────────


class TestProvinceGateError:
    def test_error_structure_with_known_province(self) -> None:
        result = province_gate_error("BC")
        assert result["error"] == "true"
        assert result["code"] == "PROVINCE_NOT_SUPPORTED"
        assert result["province"] == "BC"
        assert "BC" in result["message"]
        assert "Ontario" in result["message"]

    def test_error_structure_with_none_province(self) -> None:
        result = province_gate_error(None)
        assert result["error"] == "true"
        assert result["province"] == ""
        assert "Unknown province" in result["message"]

    def test_waitlist_mentioned_in_message(self) -> None:
        result = province_gate_error("AB")
        assert "waitlist" in result["message"].lower()
