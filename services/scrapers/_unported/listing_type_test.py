"""
Tests for listing_type.py.

Tests cover:
  - URL-first detection (for_rent, for_sale, unknown)
  - Price string fallback
  - Realtor.ca / Zillow.ca / US Zillow URL detection helpers
"""

from listing_type import (
    parse_listing_type,
    is_realtor_ca_url,
    is_zillow_ca_url,
    is_us_zillow_url,
)

# ── parse_listing_type ─────────────────────────────────────────────────────────


class TestParseListingType:
    def test_for_rent_keyword_in_url(self) -> None:
        url = "https://www.realtor.ca/property-for-rent/123/unit-101-main-st"
        assert parse_listing_type(url) == "for_rent"

    def test_rental_keyword_in_url(self) -> None:
        url = "https://www.zillow.ca/rental/456789"
        assert parse_listing_type(url) == "for_rent"

    def test_for_sale_keyword_in_url(self) -> None:
        url = "https://www.realtor.ca/real-estate/27000001/unit-101-main-st-toronto"
        assert parse_listing_type(url) == "for_sale"

    def test_url_priority_over_price_string(self) -> None:
        """A for-sale URL wins even if the price string looks like rent."""
        url = "https://www.realtor.ca/real-estate/27000001/main-st"
        assert parse_listing_type(url, price_string="$2,500/mo") == "for_sale"

    def test_price_fallback_per_month(self) -> None:
        """Ambiguous URL with /mo price → for_rent."""
        url = "https://example.com/listing/12345"
        assert parse_listing_type(url, price_string="$2,500/mo") == "for_rent"

    def test_price_fallback_per_month_long_form(self) -> None:
        url = "https://example.com/listing/12345"
        assert parse_listing_type(url, price_string="$3,200 per month") == "for_rent"

    def test_price_fallback_monthly(self) -> None:
        url = "https://example.com/listing/12345"
        assert parse_listing_type(url, price_string="$1,900 monthly") == "for_rent"

    def test_unknown_when_ambiguous_url_no_price(self) -> None:
        url = "https://example.com/listing/99999"
        assert parse_listing_type(url) == "unknown"

    def test_unknown_when_ambiguous_url_purchase_price(self) -> None:
        """A flat dollar price with no /mo suffix → unknown (URL was ambiguous)."""
        url = "https://example.com/listing/99999"
        assert parse_listing_type(url, price_string="$729,900") == "unknown"

    def test_french_locatif_keyword(self) -> None:
        url = "https://www.realtor.ca/locatif/27000002"
        assert parse_listing_type(url) == "for_rent"

    def test_french_a_louer_keyword(self) -> None:
        url = "https://example.com/a-louer/montreal-qc"
        assert parse_listing_type(url) == "for_rent"

    def test_case_insensitive_url(self) -> None:
        url = "https://www.realtor.ca/Real-Estate/27000003/main-st"
        assert parse_listing_type(url) == "for_sale"

    def test_empty_price_string(self) -> None:
        url = "https://example.com/listing/99999"
        assert parse_listing_type(url, price_string="") == "unknown"


# ── URL helper predicates ──────────────────────────────────────────────────────


class TestUrlHelpers:
    def test_is_realtor_ca(self) -> None:
        assert (
            is_realtor_ca_url("https://www.realtor.ca/real-estate/123/main-st") is True
        )

    def test_is_realtor_ca_without_www(self) -> None:
        assert is_realtor_ca_url("https://realtor.ca/real-estate/123/main-st") is True

    def test_is_not_realtor_ca(self) -> None:
        assert is_realtor_ca_url("https://www.zillow.ca/homedetails/123") is False

    def test_is_zillow_ca(self) -> None:
        assert is_zillow_ca_url("https://www.zillow.ca/homedetails/456") is True

    def test_is_zillow_ca_without_www(self) -> None:
        assert is_zillow_ca_url("https://zillow.ca/homedetails/456") is True

    def test_is_not_zillow_ca(self) -> None:
        assert is_zillow_ca_url("https://www.realtor.ca/real-estate/123") is False

    def test_is_us_zillow(self) -> None:
        assert is_us_zillow_url("https://www.zillow.com/homedetails/789") is True

    def test_zillow_ca_is_not_us(self) -> None:
        assert is_us_zillow_url("https://www.zillow.ca/homedetails/456") is False
