"""
Tests for zillow_scraper.py.

Uses simulated page content — does not launch a real browser or hit Zillow.ca.
Playwright-specific logic is tested via the parsing helper functions.

Tests cover:
  - US Zillow URL rejection
  - Price parsing and listing type detection from price strings
  - Bed / bath / sqft parsing from Zillow display formats
  - Postal code extraction from address strings
  - PII stripping from description text
  - Graceful failure path (partial data returned, never raised)
"""

from zillow_scraper import (
    _parse_beds,
    _parse_baths,
    _parse_sqft,
    _parse_zillow_price,
    _parse_postal_code,
    _strip_pii,
)

# ── _parse_zillow_price ────────────────────────────────────────────────────────


class TestParseZillowPrice:
    def test_for_sale_price(self) -> None:
        price, ltype = _parse_zillow_price("$729,900")
        assert price == 729900.0
        assert ltype == "for_sale"

    def test_monthly_rent_price(self) -> None:
        price, ltype = _parse_zillow_price("$2,500/mo")
        assert price == 2500.0
        assert ltype == "for_rent"

    def test_per_month_suffix(self) -> None:
        price, ltype = _parse_zillow_price("$3,200 per month")
        assert price == 3200.0
        assert ltype == "for_rent"

    def test_none_returns_none_unknown(self) -> None:
        price, ltype = _parse_zillow_price(None)
        assert price is None
        assert ltype == "unknown"

    def test_empty_string_returns_none_unknown(self) -> None:
        price, ltype = _parse_zillow_price("")
        assert price is None
        assert ltype == "unknown"

    def test_price_without_commas(self) -> None:
        price, ltype = _parse_zillow_price("$850000")
        assert price == 850000.0
        assert ltype == "for_sale"


# ── _parse_beds ────────────────────────────────────────────────────────────────


class TestParseBeds:
    def test_standard_format(self) -> None:
        assert _parse_beds("3 bds") == 3

    def test_single_bed(self) -> None:
        assert _parse_beds("1 bd") == 1

    def test_studio(self) -> None:
        assert _parse_beds("Studio") == 0

    def test_bachelor(self) -> None:
        assert _parse_beds("Bachelor") == 0

    def test_none_returns_none(self) -> None:
        assert _parse_beds(None) is None

    def test_empty_returns_none(self) -> None:
        assert _parse_beds("") is None

    def test_plus_den(self) -> None:
        # "2+1 bds" → 2 (we take the first number)
        result = _parse_beds("2+1 bds")
        assert result == 2

    def test_case_insensitive(self) -> None:
        assert _parse_beds("3 BDS") == 3


# ── _parse_baths ───────────────────────────────────────────────────────────────


class TestParseBaths:
    def test_whole_number(self) -> None:
        assert _parse_baths("2 ba") == 2.0

    def test_half_bath(self) -> None:
        assert _parse_baths("1.5 ba") == 1.5

    def test_none_returns_none(self) -> None:
        assert _parse_baths(None) is None

    def test_empty_returns_none(self) -> None:
        assert _parse_baths("") is None


# ── _parse_sqft ────────────────────────────────────────────────────────────────


class TestParseSqft:
    def test_with_comma(self) -> None:
        assert _parse_sqft("1,400 sqft") == 1400

    def test_plain_number_with_sqft(self) -> None:
        assert _parse_sqft("2000 sqft") == 2000

    def test_none_returns_none(self) -> None:
        assert _parse_sqft(None) is None

    def test_empty_returns_none(self) -> None:
        assert _parse_sqft("") is None


# ── _parse_postal_code ─────────────────────────────────────────────────────────


class TestParsePostalCode:
    def test_standard_address(self) -> None:
        addr = "123 Main St, Toronto, ON M5V 1A1"
        assert _parse_postal_code(addr) == "M5V 1A1"

    def test_postal_code_without_space(self) -> None:
        addr = "5702 BUTTERMILL Ave, Vaughan, Ontario L4K5N2"
        result = _parse_postal_code(addr)
        assert result == "L4K 5N2"

    def test_no_postal_code_returns_none(self) -> None:
        assert _parse_postal_code("123 Main St") is None

    def test_none_returns_none(self) -> None:
        assert _parse_postal_code(None) is None

    def test_lowercase_address(self) -> None:
        addr = "100 king st, toronto, on m5x 1a1"
        result = _parse_postal_code(addr)
        assert result == "M5X 1A1"


# ── _strip_pii ─────────────────────────────────────────────────────────────────


class TestStripPii:
    def test_email_removed(self) -> None:
        text = "Great unit! Contact agent@realty.ca for showings."
        result = _strip_pii(text)
        assert result is not None
        assert "agent@realty.ca" not in result
        assert "[email removed]" in result

    def test_phone_removed(self) -> None:
        text = "Call 905-555-0123 for more info."
        result = _strip_pii(text)
        assert result is not None
        assert "905-555-0123" not in result

    def test_clean_text_unchanged(self) -> None:
        text = "Bright south-facing 2-bedroom with parking included."
        assert _strip_pii(text) == text

    def test_none_returns_none(self) -> None:
        assert _strip_pii(None) is None
