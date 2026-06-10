"""
Functionality tests for the full nightly rental comps pipeline.

External dependencies (Playwright sources, Supabase, Mapbox) are mocked;
the internal pipeline — normalise → dedupe → geocode → store — runs fully.
"""

from unittest.mock import AsyncMock, patch

import pytest

import rental_comps_scraper
from normalization import RawRentalListing


def _raw(
    address: str = "5 Buttermill Ave, Vaughan, ON L4K 5W4",
    rent_raw: str = "$2,150/mo",
    beds_raw: str = "2 Beds",
    source: str = "rentals_ca",
) -> RawRentalListing:
    return RawRentalListing(
        source=source,
        source_url="https://example.com/x",
        address=address,
        rent_raw=rent_raw,
        beds_raw=beds_raw,
    )


@pytest.fixture
def mock_pipeline():
    """Patch sources, storage, and geocoding around run_nightly_scrape."""
    with (
        patch.object(rental_comps_scraper, "scrape_all_sources", new_callable=AsyncMock) as sources,
        patch.object(rental_comps_scraper.supabase_service, "fetch_recent_dedupe_keys") as fetch_keys,
        patch.object(rental_comps_scraper.supabase_service, "insert_rental_listings") as insert,
        patch.object(rental_comps_scraper.mapbox_service, "geocode_address", new_callable=AsyncMock) as geocode,
    ):
        fetch_keys.return_value = []
        insert.side_effect = lambda listings: len(listings)
        geocode.return_value = (43.79, -79.53)
        yield sources, fetch_keys, insert, geocode


@pytest.mark.asyncio
async def test_clean_listing_flows_through_to_insert(mock_pipeline):
    sources, _, insert, _ = mock_pipeline
    sources.return_value = [_raw()]

    inserted = await rental_comps_scraper.run_nightly_scrape()

    assert inserted == 1
    stored = insert.call_args[0][0]
    assert stored[0].rent_monthly == 2150
    assert stored[0].beds == 2
    assert stored[0].postal_code == "L4K5W4"


@pytest.mark.asyncio
async def test_geocoding_attaches_coordinates(mock_pipeline):
    sources, _, insert, geocode = mock_pipeline
    sources.return_value = [_raw()]

    await rental_comps_scraper.run_nightly_scrape()

    stored = insert.call_args[0][0]
    assert stored[0].lat == 43.79
    assert stored[0].lng == -79.53
    geocode.assert_awaited_once()


@pytest.mark.asyncio
async def test_weekly_rent_converted_before_storage(mock_pipeline):
    sources, _, insert, _ = mock_pipeline
    sources.return_value = [_raw(rent_raw="550 / week", source="kijiji")]

    await rental_comps_scraper.run_nightly_scrape()

    stored = insert.call_args[0][0]
    assert stored[0].rent_monthly == 2382  # 550 × 4.33 rounded


@pytest.mark.asyncio
async def test_garbage_listings_discarded(mock_pipeline):
    sources, _, insert, _ = mock_pipeline
    sources.return_value = [
        _raw(rent_raw="contact us"),                                   # unparseable rent
        _raw(address="123 Robson St, Vancouver BC V6B 1A1"),           # non-Ontario
        _raw(address="   "),                                           # blank address
        _raw(rent_raw="$95/day"),                                      # daily rate
    ]

    inserted = await rental_comps_scraper.run_nightly_scrape()

    assert inserted == 0
    assert insert.call_args[0][0] == []


@pytest.mark.asyncio
async def test_cross_source_duplicate_stored_once(mock_pipeline):
    sources, _, insert, _ = mock_pipeline
    sources.return_value = [
        _raw(source="rentals_ca"),
        _raw(source="kijiji"),          # same unit found on second source
    ]

    inserted = await rental_comps_scraper.run_nightly_scrape()

    assert inserted == 1


@pytest.mark.asyncio
async def test_second_run_same_day_inserts_nothing(mock_pipeline):
    # TESTING.md Test 8 — running twice must not double the row count
    sources, fetch_keys, insert, _ = mock_pipeline
    sources.return_value = [_raw()]
    fetch_keys.return_value = [("5 Buttermill Ave, Vaughan, ON L4K 5W4", 2150, 2)]

    inserted = await rental_comps_scraper.run_nightly_scrape()

    assert inserted == 0


@pytest.mark.asyncio
async def test_geocode_failure_is_non_fatal(mock_pipeline):
    sources, _, insert, geocode = mock_pipeline
    sources.return_value = [_raw()]
    geocode.return_value = None

    inserted = await rental_comps_scraper.run_nightly_scrape()

    assert inserted == 1
    stored = insert.call_args[0][0]
    assert stored[0].lat is None and stored[0].lng is None


@pytest.mark.asyncio
async def test_failed_source_never_kills_run():
    """A source module that raises contributes nothing but the run continues."""
    failing = AsyncMock(side_effect=RuntimeError("blocked"))
    working = AsyncMock(return_value=[_raw()])

    fake_failing = type("S", (), {"SOURCE": "kijiji", "fetch_listings": failing})
    fake_working = type("S", (), {"SOURCE": "rentals_ca", "fetch_listings": working})

    class FakeBrowserCtx:
        async def __aenter__(self):
            return object()

        async def __aexit__(self, *args: object):
            return False

    with (
        patch.object(rental_comps_scraper, "_SOURCES", (fake_failing, fake_working)),
        patch.object(rental_comps_scraper, "launch_browser", return_value=FakeBrowserCtx()),
    ):
        raw = await rental_comps_scraper.scrape_all_sources()

    assert len(raw) == 1
