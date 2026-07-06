"""
Unit and functionality tests for the Realtor.ca on-demand scraper.

External httpx calls are mocked so tests run offline without hitting the API.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from scrapers.realtor_scraper import (
    _extract_property_id,
    _detect_province,
    _normalise_property_type,
    _parse_listing,
    _safe_int,
    _safe_float,
    scrape_listing,
)
from models.scraper_schemas import ScrapedListing


# ── Unit tests — pure helper functions ────────────────────────────────────────


class TestExtractPropertyId:
    """Tests for _extract_property_id()."""

    def test_standard_url(self) -> None:
        url = (
            "https://www.realtor.ca/real-estate/27154381/5702-5-buttermill-ave-vaughan"
        )
        assert _extract_property_id(url) == "27154381"

    def test_url_with_trailing_slash(self) -> None:
        url = "https://www.realtor.ca/real-estate/12345678/some-property/"
        assert _extract_property_id(url) == "12345678"

    def test_short_url(self) -> None:
        url = "https://www.realtor.ca/real-estate/99999999/property"
        assert _extract_property_id(url) == "99999999"

    def test_invalid_url_returns_none(self) -> None:
        assert _extract_property_id("https://www.zillow.ca/listing/foo") is None

    def test_empty_string_returns_none(self) -> None:
        assert _extract_property_id("") is None

    def test_url_without_id_returns_none(self) -> None:
        assert _extract_property_id("https://www.realtor.ca/") is None


class TestDetectProvince:
    """Tests for _detect_province()."""

    def test_ontario_l_prefix(self) -> None:
        assert _detect_province("L4K5W4") == "ON"

    def test_ontario_m_prefix(self) -> None:
        assert _detect_province("M5V2T6") == "ON"

    def test_ontario_k_prefix(self) -> None:
        assert _detect_province("K1A 0A6") == "ON"

    def test_ontario_n_prefix(self) -> None:
        assert _detect_province("N2G4K1") == "ON"

    def test_ontario_p_prefix(self) -> None:
        assert _detect_province("P3A1B2") == "ON"

    def test_bc_v_prefix(self) -> None:
        assert _detect_province("V6B1A1") == "BC"

    def test_alberta_t_prefix(self) -> None:
        assert _detect_province("T2P3C3") == "AB"

    def test_quebec_h_prefix(self) -> None:
        assert _detect_province("H3A1A1") == "QC"

    def test_empty_postal_code(self) -> None:
        result = _detect_province("")
        assert result == "UNKNOWN"

    def test_lowercase_postal_code(self) -> None:
        assert _detect_province("l4k5w4") == "ON"


class TestNormalisePropertyType:
    """Tests for _normalise_property_type()."""

    def test_apartment_maps_to_condo(self) -> None:
        assert _normalise_property_type("Apartment") == "condo"

    def test_condo_maps_to_condo(self) -> None:
        assert _normalise_property_type("Condo") == "condo"

    def test_detached_maps_to_house(self) -> None:
        assert _normalise_property_type("Detached") == "house"

    def test_semi_detached_maps_to_semi(self) -> None:
        assert _normalise_property_type("Semi-Detached") == "semi"

    def test_townhouse_maps_to_townhouse(self) -> None:
        assert _normalise_property_type("Townhouse") == "townhouse"

    def test_row_townhouse_maps_to_townhouse(self) -> None:
        assert _normalise_property_type("Row / Townhouse") == "townhouse"

    def test_unknown_defaults_to_house(self) -> None:
        assert _normalise_property_type("Commercial Retail") == "house"


class TestSafeInt:
    """Tests for _safe_int()."""

    def test_plain_int(self) -> None:
        assert _safe_int(3326) == 3326

    def test_string_with_commas(self) -> None:
        assert _safe_int("3,326") == 3326

    def test_float_string(self) -> None:
        assert _safe_int("729900.0") == 729900

    def test_dollar_sign_removed_externally(self) -> None:
        # The caller removes $ before passing
        assert _safe_int("729900") == 729900

    def test_invalid_returns_default(self) -> None:
        assert _safe_int("N/A") == 0

    def test_none_returns_default(self) -> None:
        assert _safe_int(None) == 0

    def test_custom_default(self) -> None:
        assert _safe_int("bad", default=99) == 99


class TestSafeFloat:
    """Tests for _safe_float()."""

    def test_plain_float(self) -> None:
        assert _safe_float(2.5) == 2.5

    def test_integer_string(self) -> None:
        assert _safe_float("2") == 2.0

    def test_invalid_returns_default(self) -> None:
        assert _safe_float("N/A") == 0.0


# ── Unit test — _parse_listing() ─────────────────────────────────────────────


class TestParseListing:
    """Tests for _parse_listing() with synthetic API response payloads."""

    def _condo_payload(self) -> dict:
        """Minimal realistic Realtor.ca API response for a condo."""
        return {
            "Property": {
                "Price": "729900",
                "Type": "Apartment",
                "Address": {
                    "AddressText": "5702-5 Buttermill Ave|Vaughan ON  L4K5W4",
                    "PostalCode": "L4K5W4",
                },
            },
            "Building": {
                "BedroomsTotal": "3",
                "BathroomTotal": "2",
                "SizeInterior": "950 sqft",
                "Age": "2019",
            },
            "Tax": {
                "AnnualAmount": "3326",
            },
            "MaintenanceFee": "761",
        }

    def test_condo_address_parsed(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert "Buttermill" in listing.address

    def test_condo_price_parsed(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.price == 729900

    def test_condo_taxes_parsed(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.annual_taxes == 3326
        assert listing.tax_known is True

    def test_condo_fee_parsed(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.condo_fee_monthly == 761
        assert listing.condo_fee_known is True

    def test_beds_parsed(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.beds == 3

    def test_baths_parsed(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.baths == 2.0

    def test_sqft_parsed(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.sqft == 950
        assert listing.sqft_known is True

    def test_year_built_parsed(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.year_built == 2019
        assert listing.year_built_known is True

    def test_property_type_condo(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.property_type == "condo"

    def test_province_ontario(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.province == "ON"

    def test_is_toronto_false_for_vaughan(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.is_toronto is False

    def test_listing_type_for_sale(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.listing_type == "for_sale"

    def test_postal_code_included_in_result(self) -> None:
        listing = _parse_listing(self._condo_payload())
        assert listing.postal_code == "L4K5W4"

    def test_postal_code_empty_when_missing(self) -> None:
        payload = self._condo_payload()
        payload["Property"]["Address"]["PostalCode"] = ""
        payload["Property"]["Address"][
            "AddressText"
        ] = "5702-5 Buttermill Ave|Vaughan ON"
        listing = _parse_listing(payload)
        assert listing.postal_code == ""

    def test_toronto_postal_code_sets_is_toronto(self) -> None:
        payload = self._condo_payload()
        payload["Property"]["Address"]["PostalCode"] = "M5V2T6"
        payload["Property"]["Address"][
            "AddressText"
        ] = "100 King St W|Toronto ON  M5V2T6"
        listing = _parse_listing(payload)
        assert listing.is_toronto is True

    def test_missing_condo_fee_sets_not_known(self) -> None:
        payload = self._condo_payload()
        payload.pop("MaintenanceFee")
        payload["Building"].pop("MaintenanceFee", None)
        listing = _parse_listing(payload)
        assert listing.condo_fee_monthly is None
        assert listing.condo_fee_known is False

    def test_missing_tax_sets_not_known(self) -> None:
        payload = self._condo_payload()
        payload.pop("Tax")
        listing = _parse_listing(payload)
        assert listing.tax_known is False

    def test_missing_sqft_sets_not_known(self) -> None:
        payload = self._condo_payload()
        payload["Building"].pop("SizeInterior")
        listing = _parse_listing(payload)
        assert listing.sqft is None
        assert listing.sqft_known is False

    def test_missing_year_sets_not_known(self) -> None:
        payload = self._condo_payload()
        payload["Building"].pop("Age")
        listing = _parse_listing(payload)
        assert listing.year_built is None
        assert listing.year_built_known is False

    def test_bc_postal_code_detects_province(self) -> None:
        payload = self._condo_payload()
        payload["Property"]["Address"]["PostalCode"] = "V6B1A1"
        listing = _parse_listing(payload)
        assert listing.province == "BC"

    def test_sqm_converted_to_sqft(self) -> None:
        payload = self._condo_payload()
        payload["Building"]["SizeInterior"] = "88 m2"
        listing = _parse_listing(payload)
        # 88 sqm × 10.764 ≈ 947 sqft
        assert listing.sqft is not None
        assert 930 <= listing.sqft <= 960


# ── Functionality tests — scrape_listing() with mocked httpx ─────────────────


class TestScrapeListing:
    """End-to-end tests for scrape_listing() with httpx mocked."""

    def _sample_payload(self) -> dict:
        return {
            "Property": {
                "Price": "729900",
                "Type": "Apartment",
                "Address": {
                    "AddressText": "5702-5 Buttermill Ave|Vaughan ON  L4K5W4",
                    "PostalCode": "L4K5W4",
                },
            },
            "Building": {
                "BedroomsTotal": "3",
                "BathroomTotal": "2",
                "SizeInterior": "950 sqft",
                "Age": "2019",
            },
            "Tax": {"AnnualAmount": "3326"},
            "MaintenanceFee": "761",
        }

    @pytest.mark.asyncio
    async def test_successful_scrape_returns_listing(self) -> None:
        mock_response = MagicMock()
        mock_response.json.return_value = self._sample_payload()
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch(
            "scrapers.realtor_scraper.httpx.AsyncClient", return_value=mock_client
        ):
            result = await scrape_listing(
                "https://www.realtor.ca/real-estate/27154381/5702-5-buttermill-ave-vaughan"
            )

        assert result is not None
        assert isinstance(result, ScrapedListing)
        assert result.price == 729900
        assert result.beds == 3
        assert result.province == "ON"
        assert result.postal_code == "L4K5W4"

    @pytest.mark.asyncio
    async def test_invalid_url_returns_none(self) -> None:
        result = await scrape_listing("https://www.zillow.ca/not-realtor")
        assert result is None

    @pytest.mark.asyncio
    async def test_http_error_returns_none(self) -> None:
        import httpx

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        mock_request = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 403
        mock_client.get = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                "403 Forbidden", request=mock_request, response=mock_response
            )
        )

        with patch(
            "scrapers.realtor_scraper.httpx.AsyncClient", return_value=mock_client
        ):
            result = await scrape_listing(
                "https://www.realtor.ca/real-estate/12345678/some-property"
            )

        assert result is None

    @pytest.mark.asyncio
    async def test_network_error_returns_none(self) -> None:
        import httpx

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        with patch(
            "scrapers.realtor_scraper.httpx.AsyncClient", return_value=mock_client
        ):
            result = await scrape_listing(
                "https://www.realtor.ca/real-estate/12345678/some-property"
            )

        assert result is None

    @pytest.mark.asyncio
    async def test_bc_listing_still_parsed(self) -> None:
        """Scraper returns the listing even for non-Ontario — province gate is in the router."""
        payload = self._sample_payload()
        payload["Property"]["Address"]["PostalCode"] = "V6B1A1"

        mock_response = MagicMock()
        mock_response.json.return_value = payload
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch(
            "scrapers.realtor_scraper.httpx.AsyncClient", return_value=mock_client
        ):
            result = await scrape_listing(
                "https://www.realtor.ca/real-estate/12345678/vancouver-property"
            )

        assert result is not None
        assert result.province == "BC"

    @pytest.mark.asyncio
    async def test_correct_property_id_sent_to_api(self) -> None:
        """Verify the extracted property ID is passed in the API params."""
        captured_params: dict = {}

        mock_response = MagicMock()
        mock_response.json.return_value = self._sample_payload()
        mock_response.raise_for_status = MagicMock()

        async def fake_get(url: str, **kwargs: object) -> MagicMock:
            captured_params.update(kwargs.get("params", {}))
            return mock_response

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = fake_get

        with patch(
            "scrapers.realtor_scraper.httpx.AsyncClient", return_value=mock_client
        ):
            await scrape_listing(
                "https://www.realtor.ca/real-estate/27154381/5702-5-buttermill-ave-vaughan"
            )

        assert captured_params.get("PropertyID") == "27154381"
