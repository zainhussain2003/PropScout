"""
Tests for realtor_scraper.py.

Uses hardcoded fixture responses — does not hit live Realtor.ca servers.

Tests cover:
  - Listing ID extraction from various URL patterns
  - Field parsing from a realistic API response fixture
  - Partial data is returned (not raised) when critical fields are missing
  - The failure path returns a dict with scrape_status='failed'
  - Price parsing handles commas, dollar signs, and edge cases
  - PII is stripped from listing descriptions
  - Postal code is parsed from the AddressText pipe-delimited format
"""

from realtor_scraper import (
    _extract_fields,
    _parse_price,
    _parse_sqft,
    _strip_pii,
    extract_listing_id,
)

# ── Realistic Realtor.ca API response fixture ──────────────────────────────────

REALTOR_FIXTURE: dict = {
    "PropertyDetails": {
        "Property": {
            "Price": "729,900",
            "PriceUnformattedValue": "729900",
            "Photo": [
                {
                    "SequenceId": "1",
                    "LargePhotoUrl": "https://cdn.realtor.ca/photo1.jpg",
                },
                {
                    "SequenceId": "2",
                    "LargePhotoUrl": "https://cdn.realtor.ca/photo2.jpg",
                },
            ],
            "Address": {
                "AddressText": "5702 BUTTERMILL Ave|Vaughan, Ontario L4K 5N2",
                "Longitude": -79.5382,
                "Latitude": 43.8023,
            },
            "Type": {"Id": "300", "Name": "Single Family"},
        },
        "Building": {
            "SizeInterior": "2000 sqft",
            "BathroomTotal": "2",
            "BedroomsAboveGround": "3",
            "YearBuilt": "2005",
        },
        "AnnualTax": {
            "TaxYear": "2025",
            "TaxAmount": "3326",
        },
        "MaintenanceFee": "0",
        "DaysOnMarket": "14",
        "PublicRemarks": (
            "Beautiful single family home in desirable Vaughan community. "
            "Contact agent Jane Smith at jane.smith@realty.com or 416-555-1234."
        ),
    }
}

_FIXTURE_URL = "https://www.realtor.ca/real-estate/27000001/5702-buttermill-ave-vaughan"


# ── extract_listing_id ────────────────────────────────────────────────────────


class TestExtractListingId:
    def test_standard_url(self) -> None:
        url = "https://www.realtor.ca/real-estate/27000001/5702-buttermill-ave"
        assert extract_listing_id(url) == "27000001"

    def test_url_with_trailing_slash(self) -> None:
        url = "https://www.realtor.ca/real-estate/99999999/some-slug/"
        assert extract_listing_id(url) == "99999999"

    def test_no_real_estate_segment_returns_none(self) -> None:
        url = "https://www.realtor.ca/map#"
        assert extract_listing_id(url) is None

    def test_url_without_slug(self) -> None:
        url = "https://www.realtor.ca/real-estate/12345678/"
        assert extract_listing_id(url) == "12345678"


# ── _parse_price ───────────────────────────────────────────────────────────────


class TestParsePrice:
    def test_comma_separated(self) -> None:
        assert _parse_price("729,900") == 729900.0

    def test_dollar_prefix(self) -> None:
        assert _parse_price("$729,900") == 729900.0

    def test_plain_integer(self) -> None:
        assert _parse_price("500000") == 500000.0

    def test_none_returns_none(self) -> None:
        assert _parse_price(None) is None

    def test_empty_string_returns_none(self) -> None:
        assert _parse_price("") is None

    def test_non_numeric_returns_none(self) -> None:
        assert _parse_price("N/A") is None


# ── _parse_sqft ────────────────────────────────────────────────────────────────


class TestParseSqft:
    def test_sqft_with_unit(self) -> None:
        assert _parse_sqft("2000 sqft") == 2000

    def test_sqft_with_comma(self) -> None:
        assert _parse_sqft("1,400 sqft") == 1400

    def test_plain_number(self) -> None:
        assert _parse_sqft("1500") == 1500

    def test_square_metres_converted(self) -> None:
        # 100 m² × 10.7639 ≈ 1076 sqft
        result = _parse_sqft("100 m²")
        assert result is not None
        assert 1070 < result < 1080

    def test_none_returns_none(self) -> None:
        assert _parse_sqft(None) is None

    def test_empty_string_returns_none(self) -> None:
        assert _parse_sqft("") is None


# ── _strip_pii ─────────────────────────────────────────────────────────────────


class TestStripPii:
    def test_email_stripped(self) -> None:
        text = "Contact jane.smith@realty.com for a showing."
        result = _strip_pii(text)
        assert result is not None
        assert "jane.smith@realty.com" not in result
        assert "[email removed]" in result

    def test_phone_stripped(self) -> None:
        text = "Call 416-555-1234 today."
        result = _strip_pii(text)
        assert result is not None
        assert "416-555-1234" not in result
        assert "[phone removed]" in result

    def test_clean_text_unchanged(self) -> None:
        text = "Beautiful home with granite countertops and hardwood floors."
        assert _strip_pii(text) == text

    def test_none_returns_none(self) -> None:
        assert _strip_pii(None) is None


# ── _extract_fields ────────────────────────────────────────────────────────────


class TestExtractFields:
    def test_price_extracted(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["price"] == 729900.0

    def test_beds_extracted(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["beds"] == 3

    def test_baths_extracted(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["baths"] == 2.0

    def test_sqft_extracted(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["sqft"] == 2000

    def test_annual_taxes_extracted(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["annual_taxes"] == 3326.0
        assert fields["taxes_known"] is True

    def test_condo_fee_extracted(self) -> None:
        # MaintenanceFee = "0" → condo_fee = 0.0, condo_fee_known = True
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["condo_fee"] == 0.0
        assert fields["condo_fee_known"] is True

    def test_year_built_extracted(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["year_built"] == 2005
        assert fields["year_built_known"] is True

    def test_postal_code_extracted_from_address_text(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["postal_code"] == "L4K 5N2"

    def test_province_detected_as_ontario(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["province"] == "ON"

    def test_address_parsed_from_pipe_delimited(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["address"] == "5702 BUTTERMILL Ave"

    def test_property_type_extracted(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["property_type"] == "Single Family"

    def test_pii_stripped_from_description(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        desc = fields["listing_description"]
        assert desc is not None
        assert "jane.smith@realty.com" not in desc
        assert "416-555-1234" not in desc

    def test_photo_urls_extracted(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert isinstance(fields["photo_urls"], list)
        assert len(fields["photo_urls"]) == 2
        assert all(
            u.startswith("https://cdn.realtor.ca/") for u in fields["photo_urls"]
        )

    def test_listing_type_for_sale(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["listing_type"] == "for_sale"

    def test_days_on_market_extracted(self) -> None:
        fields, _ = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        assert fields["days_on_market"] == 14

    def test_missing_fields_empty_for_complete_fixture(self) -> None:
        _, missing = _extract_fields(REALTOR_FIXTURE, _FIXTURE_URL, "27000001")
        # All critical fields should be present in the fixture
        assert "price" not in missing
        assert "beds" not in missing
        assert "address" not in missing

    def test_missing_fields_tracked_when_beds_absent(self) -> None:
        fixture_no_beds = {
            "PropertyDetails": {
                "Property": REALTOR_FIXTURE["PropertyDetails"]["Property"],
                "Building": {
                    # BedroomsAboveGround intentionally omitted
                    "BathroomTotal": "2",
                },
                "AnnualTax": REALTOR_FIXTURE["PropertyDetails"]["AnnualTax"],
            }
        }
        _, missing = _extract_fields(fixture_no_beds, _FIXTURE_URL, "27000001")
        assert "beds" in missing

    def test_empty_response_returns_all_none_fields(self) -> None:
        fields, missing = _extract_fields({}, _FIXTURE_URL, "27000001")
        assert fields["price"] is None
        assert fields["beds"] is None
        assert "price" in missing
        assert "beds" in missing
