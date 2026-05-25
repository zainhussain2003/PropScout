"""
Tests for zillow_scraper.py.

Uses simulated page content — does not launch a real browser or hit Zillow.com.
Playwright-specific logic is tested via the parsing helper functions.
scrape_listing() behaviour (postal code gate) is tested by patching
_extract_page_data and the Playwright context so no real browser is launched.

Tests cover:
  - Price parsing and listing type detection from price strings
  - Bed / bath / sqft parsing from Zillow display formats
  - Postal code extraction from address strings
  - PII stripping from description text
  - Ontario postal code detected → scrape_listing proceeds without error
  - No Canadian postal code (US address) → returns Ontario error, no DB write
  - Non-Ontario Canadian postal code → scraper writes normally, route handles gate
  - Graceful failure path (partial data returned, never raised)
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio  # noqa: F401 — registers the asyncio mode

from zillow_scraper import (
    SOURCE,
    _parse_beds,
    _parse_baths,
    _parse_postal_code,
    _parse_sqft,
    _parse_zillow_price,
    _strip_pii,
    scrape_listing,
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

    def test_us_address_no_postal_code(self) -> None:
        addr = "2909 23rd Ave S, Minneapolis, MN 55406"
        assert _parse_postal_code(addr) is None

    def test_oakville_ontario(self) -> None:
        addr = "332 Ellen Davidson Dr, Oakville, ON L6M 0Y6"
        assert _parse_postal_code(addr) == "L6M 0Y6"

    def test_non_ontario_canadian_postal_code(self) -> None:
        # BC postal code — V prefix
        addr = "1234 Oak St, Vancouver, BC V6J 1N5"
        assert _parse_postal_code(addr) == "V6J 1N5"


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


# ── scrape_listing — postal code gate ─────────────────────────────────────────
#
# These tests patch the Playwright browser stack and _extract_page_data so
# that no real network request is made. They test only the postal code gate
# logic inside scrape_listing().


def _make_playwright_mock() -> MagicMock:
    """Return a MagicMock that satisfies the async_playwright() context manager."""
    page = AsyncMock()
    page.goto = AsyncMock(return_value=MagicMock(status=200))
    page.wait_for_selector = AsyncMock()
    page.content = AsyncMock(return_value="<html></html>")

    context = AsyncMock()
    context.new_page = AsyncMock(return_value=page)

    browser = AsyncMock()
    browser.new_context = AsyncMock(return_value=context)
    browser.close = AsyncMock()

    chromium = MagicMock()
    chromium.launch = AsyncMock(return_value=browser)

    pw = MagicMock()
    pw.chromium = chromium

    # async_playwright() returns an async context manager
    pw_cm = AsyncMock()
    pw_cm.__aenter__ = AsyncMock(return_value=pw)
    pw_cm.__aexit__ = AsyncMock(return_value=False)
    return pw_cm


# ── Ontario postal code — scraper proceeds ────────────────────────────────────


class TestScrapeListing:
    """Test scrape_listing() postal-code gate without hitting a real browser."""

    @pytest.mark.asyncio
    async def test_ontario_postal_code_proceeds(self) -> None:
        """
        When _extract_page_data returns an Ontario postal code, scrape_listing
        should NOT return an Ontario-error result — it should proceed to the
        DB write path and return a record with source == SOURCE.
        """
        _on_url = (
            "https://www.zillow.com/homedetails/"
            "332-Ellen-Davidson-Dr-Oakville-ON-L6M-0Y6/462657380_zpid/"
        )
        on_fields = {
            "source_url": _on_url,
            "source": SOURCE,
            "listing_type": "for_sale",
            "address": "332 Ellen Davidson Dr",
            "postal_code": "L6M 0Y6",
            "province": "ON",
            "price": 1200000.0,
            "beds": 4,
            "baths": 3.0,
            "sqft": 2400,
            "property_type": "Single Family",
            "annual_taxes": None,
            "taxes_known": False,
            "condo_fee": None,
            "condo_fee_known": False,
            "year_built": None,
            "year_built_known": False,
            "days_on_market": None,
            "listing_description": None,
            "photo_urls": [],
        }
        on_missing: list[str] = ["annual_taxes", "listing_description"]

        _mock_extract = AsyncMock(return_value=(on_fields, on_missing))
        with (
            patch(
                "zillow_scraper.async_playwright", return_value=_make_playwright_mock()
            ),
            patch("zillow_scraper._extract_page_data", new=_mock_extract),
            patch("zillow_scraper.wait_for_rate_limit", new=AsyncMock()),
            patch("zillow_scraper.upsert_listing", new=AsyncMock(return_value=None)),
            patch("zillow_scraper.log_scrape", new=AsyncMock()),
        ):
            result = await scrape_listing(_on_url)

        # Should NOT be the Ontario-error result
        assert result.get("error") != "Property does not appear to be in Ontario."
        # Should carry the postal code through
        assert result.get("postal_code") == "L6M 0Y6"
        assert result.get("source") == SOURCE

    @pytest.mark.asyncio
    async def test_no_postal_code_returns_ontario_error(self) -> None:
        """
        When _extract_page_data returns no postal_code (e.g. a US address),
        scrape_listing should return scrape_status='failed' with the Ontario
        error message and must NOT call upsert_listing.
        """
        _us_url = (
            "https://www.zillow.com/homedetails/"
            "2909-23rd-Ave-S-Minneapolis-MN-55406/49113185_zpid/"
        )
        us_fields = {
            "source_url": _us_url,
            "source": SOURCE,
            "listing_type": "for_sale",
            "address": "2909 23rd Ave S",
            "postal_code": None,  # ← no Canadian postal code
            "province": None,
            "price": 350000.0,
            "beds": 3,
            "baths": 2.0,
            "sqft": 1400,
            "property_type": "Single Family",
            "annual_taxes": None,
            "taxes_known": False,
            "condo_fee": None,
            "condo_fee_known": False,
            "year_built": None,
            "year_built_known": False,
            "days_on_market": None,
            "listing_description": None,
            "photo_urls": [],
        }
        us_missing: list[str] = ["postal_code", "listing_description"]

        mock_upsert = AsyncMock()

        _mock_extract_us = AsyncMock(return_value=(us_fields, us_missing))
        with (
            patch(
                "zillow_scraper.async_playwright", return_value=_make_playwright_mock()
            ),
            patch("zillow_scraper._extract_page_data", new=_mock_extract_us),
            patch("zillow_scraper.wait_for_rate_limit", new=AsyncMock()),
            patch("zillow_scraper.upsert_listing", new=mock_upsert),
            patch("zillow_scraper.log_scrape", new=AsyncMock()),
        ):
            result = await scrape_listing(_us_url)

        assert result["scrape_status"] == "failed"
        assert result["error"] == "Property does not appear to be in Ontario."
        # No DB write should occur
        mock_upsert.assert_not_called()

    @pytest.mark.asyncio
    async def test_non_ontario_postal_code_passes_scraper(self) -> None:
        """
        When _extract_page_data returns a non-Ontario Canadian postal code
        (e.g. BC, QC), scrape_listing itself should proceed normally and write
        to the DB. The province gate in scraper_routes.py handles the waitlist
        redirect — that is NOT the scraper's responsibility.
        """
        _bc_url = (
            "https://www.zillow.com/homedetails/"
            "1234-Oak-St-Vancouver-BC-V6J-1N5/12345678_zpid/"
        )
        bc_fields = {
            "source_url": _bc_url,
            "source": SOURCE,
            "listing_type": "for_sale",
            "address": "1234 Oak St",
            "postal_code": "V6J 1N5",
            "province": "BC",
            "price": 1800000.0,
            "beds": 3,
            "baths": 2.0,
            "sqft": 1800,
            "property_type": "Single Family",
            "annual_taxes": None,
            "taxes_known": False,
            "condo_fee": None,
            "condo_fee_known": False,
            "year_built": None,
            "year_built_known": False,
            "days_on_market": None,
            "listing_description": None,
            "photo_urls": [],
        }
        bc_missing: list[str] = ["annual_taxes", "listing_description"]

        mock_upsert = AsyncMock(return_value=None)

        _mock_extract_bc = AsyncMock(return_value=(bc_fields, bc_missing))
        with (
            patch(
                "zillow_scraper.async_playwright", return_value=_make_playwright_mock()
            ),
            patch("zillow_scraper._extract_page_data", new=_mock_extract_bc),
            patch("zillow_scraper.wait_for_rate_limit", new=AsyncMock()),
            patch("zillow_scraper.upsert_listing", new=mock_upsert),
            patch("zillow_scraper.log_scrape", new=AsyncMock()),
        ):
            result = await scrape_listing(_bc_url)

        # Scraper must NOT return the Ontario error — that is the route's job
        assert result.get("error") != "Property does not appear to be in Ontario."
        assert result.get("postal_code") == "V6J 1N5"
        # DB write must have been attempted
        mock_upsert.assert_called_once()

    @pytest.mark.asyncio
    async def test_playwright_exception_returns_failed_status(self) -> None:
        """
        When Playwright raises an exception (e.g. timeout), scrape_listing must
        return scrape_status='failed' with a user-facing message and never raise.
        """
        broken_cm = AsyncMock()
        broken_cm.__aenter__ = AsyncMock(side_effect=Exception("connection refused"))
        broken_cm.__aexit__ = AsyncMock(return_value=False)

        with (
            patch("zillow_scraper.async_playwright", return_value=broken_cm),
            patch("zillow_scraper.wait_for_rate_limit", new=AsyncMock()),
            patch("zillow_scraper.log_scrape", new=AsyncMock()),
        ):
            result = await scrape_listing(
                "https://www.zillow.com/homedetails/anything/"
            )

        assert result["scrape_status"] == "failed"
        assert "error" in result
        # Must not raise — the function catches all exceptions
