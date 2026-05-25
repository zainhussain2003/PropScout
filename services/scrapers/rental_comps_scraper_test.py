"""
Tests for rental_comps_scraper.py.

Uses fixtures and hardcoded data — does not launch a real browser
or make network calls.

Tests cover:
  - make_dedup_hash: stable MD5 generation, uniqueness
  - parse_beds: studio, bachelor, plus-den, plain numbers
  - normalise_rent: monthly passthrough, weekly conversion
  - strip_pii: email and phone removal
  - calculate_percentiles: correct P25/P50/P75 from a known dataset
  - normalise_rental_listing: geocoding is mocked via monkeypatching
"""

import pytest
from unittest.mock import AsyncMock, patch

from rental_comps_scraper import (
    calculate_percentiles,
    make_dedup_hash,
    normalise_rent,
    normalise_rental_listing,
    parse_beds,
    strip_pii,
)

# ── make_dedup_hash ────────────────────────────────────────────────────────────


class TestMakeDedupHash:
    def test_returns_32_char_hex(self) -> None:
        h = make_dedup_hash("123 Main St", 2500.0, 2)
        assert len(h) == 32
        assert all(c in "0123456789abcdef" for c in h)

    def test_same_inputs_same_hash(self) -> None:
        h1 = make_dedup_hash("123 Main St", 2500.0, 2)
        h2 = make_dedup_hash("123 Main St", 2500.0, 2)
        assert h1 == h2

    def test_different_rent_different_hash(self) -> None:
        h1 = make_dedup_hash("123 Main St", 2500.0, 2)
        h2 = make_dedup_hash("123 Main St", 2600.0, 2)
        assert h1 != h2

    def test_different_beds_different_hash(self) -> None:
        h1 = make_dedup_hash("123 Main St", 2500.0, 2)
        h2 = make_dedup_hash("123 Main St", 2500.0, 3)
        assert h1 != h2

    def test_case_insensitive_address(self) -> None:
        """Address is lowercased before hashing — case doesn't affect dedup."""
        h1 = make_dedup_hash("123 MAIN ST", 2500.0, 2)
        h2 = make_dedup_hash("123 main st", 2500.0, 2)
        assert h1 == h2

    def test_none_address_handled(self) -> None:
        """None address should not raise."""
        h = make_dedup_hash(None, 2500.0, 2)
        assert len(h) == 32

    def test_none_beds_handled(self) -> None:
        h = make_dedup_hash("123 Main St", 2500.0, None)
        assert len(h) == 32


# ── parse_beds ─────────────────────────────────────────────────────────────────


class TestParseBeds:
    @pytest.mark.parametrize(
        "raw,expected",
        [
            ("2", 2),
            ("3 bedrooms", 3),
            ("1 bed", 1),
            ("Studio", 0),
            ("studio apt", 0),
            ("Bachelor", 0),
            ("1+1", 1),  # Den is not a bedroom
            ("2 bdrm", 2),
            ("4 Beds", 4),
        ],
    )
    def test_known_formats(self, raw: str, expected: int) -> None:
        assert parse_beds(raw) == expected

    def test_none_returns_none(self) -> None:
        assert parse_beds(None) is None

    def test_empty_returns_none(self) -> None:
        assert parse_beds("") is None

    def test_unparseable_returns_none(self) -> None:
        assert parse_beds("N/A") is None


# ── normalise_rent ─────────────────────────────────────────────────────────────


class TestNormaliseRent:
    def test_monthly_passthrough(self) -> None:
        assert normalise_rent(2500.0, "monthly") == 2500.0

    def test_weekly_converted_to_monthly(self) -> None:
        # $600/week × 52 / 12 = $2,600
        result = normalise_rent(600.0, "weekly")
        assert result is not None
        assert abs(result - 2600.0) < 1.0

    def test_none_returns_none(self) -> None:
        assert normalise_rent(None) is None

    def test_default_period_is_monthly(self) -> None:
        assert normalise_rent(3000.0) == 3000.0


# ── strip_pii ──────────────────────────────────────────────────────────────────


class TestStripPii:
    def test_email_removed(self) -> None:
        text = "Contact landlord@gmail.com for more info."
        result = strip_pii(text)
        assert result is not None
        assert "landlord@gmail.com" not in result
        assert "[email removed]" in result

    def test_phone_north_american_removed(self) -> None:
        text = "Call 647-555-0199 to book a showing."
        result = strip_pii(text)
        assert result is not None
        assert "647-555-0199" not in result
        assert "[phone removed]" in result

    def test_clean_text_unchanged(self) -> None:
        text = "Spacious 2-bed unit with in-suite laundry and parking."
        assert strip_pii(text) == text

    def test_none_returns_none(self) -> None:
        assert strip_pii(None) is None


# ── calculate_percentiles ──────────────────────────────────────────────────────


class TestCalculatePercentiles:
    def test_known_dataset(self) -> None:
        """
        10 rental values — verify P25/P50/P75 are computed correctly.

        Dataset: [2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900]
        P25 = 2225, P50 = 2450, P75 = 2675
        """
        rents = [2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900]
        result = calculate_percentiles(rents)
        assert result["count"] == 10
        assert result["low"] == 2225  # P25
        assert result["mid"] == 2450  # P50
        assert result["high"] == 2675  # P75

    def test_single_value(self) -> None:
        result = calculate_percentiles([2500])
        assert result["low"] == 2500
        assert result["mid"] == 2500
        assert result["high"] == 2500
        assert result["count"] == 1

    def test_empty_list(self) -> None:
        result = calculate_percentiles([])
        assert result["low"] == 0
        assert result["mid"] == 0
        assert result["high"] == 0
        assert result["count"] == 0

    def test_sorted_order_does_not_matter(self) -> None:
        """Unordered input should produce same result as ordered."""
        rents_ordered = [2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900]
        rents_shuffled = [2400, 2900, 2100, 2500, 2200, 2800, 2300, 2700, 2000, 2600]
        assert calculate_percentiles(rents_ordered) == calculate_percentiles(
            rents_shuffled
        )

    def test_count_matches_input_length(self) -> None:
        rents = [1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500]
        result = calculate_percentiles(rents)
        assert result["count"] == 8

    def test_high_greater_or_equal_to_mid_greater_or_equal_to_low(self) -> None:
        rents = [2500, 2700, 2600, 2800, 2400, 3000, 2300, 2900]
        result = calculate_percentiles(rents)
        assert result["low"] <= result["mid"] <= result["high"]


# ── normalise_rental_listing (geocoding mocked) ────────────────────────────────


class TestNormaliseRentalListing:
    @pytest.mark.asyncio
    async def test_basic_normalisation(self) -> None:
        """Full normalisation with geocoding mocked to a known lat/lng."""
        raw = {
            "address": "101 Bay St",
            "rent_monthly": "2500",
            "beds": "2 bedrooms",
            "baths": "1",
            "sqft": "800 sqft",
            "listed_at": "2026-05-01",
            "rent_period": "monthly",
        }
        with patch(
            "rental_comps_scraper.geocode_address",
            new=AsyncMock(return_value=(43.6452, -79.3806)),
        ):
            result = await normalise_rental_listing(raw, "rentals_ca", "Toronto")

        assert result["source"] == "rentals_ca"
        assert result["rent_monthly"] == 2500.0
        assert result["beds"] == 2
        assert result["lat"] == 43.6452
        assert result["lng"] == -79.3806
        assert result["sqft"] == 800
        assert len(result["dedup_hash"]) == 32

    @pytest.mark.asyncio
    async def test_weekly_rent_converted(self) -> None:
        raw = {
            "address": "200 King St",
            "rent_monthly": "600",
            "beds": "1",
            "rent_period": "weekly",
        }
        with patch(
            "rental_comps_scraper.geocode_address",
            new=AsyncMock(return_value=(43.6, -79.4)),
        ):
            result = await normalise_rental_listing(raw, "kijiji", "Toronto")

        # $600/week × 52 / 12 ≈ $2,600/month
        assert result["rent_monthly"] is not None
        assert abs(result["rent_monthly"] - 2600.0) < 1.0

    @pytest.mark.asyncio
    async def test_missing_rent_returns_empty_dict(self) -> None:
        """Listings without rent should be silently skipped (empty dict)."""
        raw = {"address": "300 Queen St", "beds": "2"}
        with patch(
            "rental_comps_scraper.geocode_address",
            new=AsyncMock(return_value=(None, None)),
        ):
            result = await normalise_rental_listing(raw, "rentals_ca", "Toronto")

        assert result == {}

    @pytest.mark.asyncio
    async def test_geocoding_failure_lat_lng_none(self) -> None:
        """Geocoding failure should produce None lat/lng — listing still saves."""
        raw = {
            "address": "Some Unknown Address",
            "rent_monthly": "1800",
            "beds": "Studio",
            "rent_period": "monthly",
        }
        with patch(
            "rental_comps_scraper.geocode_address",
            new=AsyncMock(return_value=(None, None)),
        ):
            result = await normalise_rental_listing(raw, "rentals_ca", "Hamilton")

        assert result["lat"] is None
        assert result["lng"] is None
        assert result["rent_monthly"] == 1800.0
        assert result["beds"] == 0  # Studio → 0
