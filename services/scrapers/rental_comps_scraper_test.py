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


def _result(
    listings: list[RawRentalListing],
    yields: list | None = None,
) -> "rental_comps_scraper.ScrapeResult":
    """Build a ScrapeResult; derive per-source yields from the listings if absent."""
    if yields is None:
        counts: dict[str, int] = {}
        for item in listings:
            counts[item.source] = counts.get(item.source, 0) + 1
        yields = [
            rental_comps_scraper.SourceYield(name, counts.get(name, 0))
            for name in ("rentals_ca", "kijiji", "padmapper")
        ]
    return rental_comps_scraper.ScrapeResult(listings, yields)


@pytest.fixture
def mock_pipeline():
    """Patch sources, storage, and geocoding around run_nightly_scrape."""
    with (
        patch.object(
            rental_comps_scraper, "scrape_all_sources", new_callable=AsyncMock
        ) as sources,
        patch.object(
            rental_comps_scraper.supabase_service, "fetch_recent_dedupe_keys"
        ) as fetch_keys,
        patch.object(
            rental_comps_scraper.supabase_service, "insert_rental_listings"
        ) as insert,
        patch.object(
            rental_comps_scraper.mapbox_service,
            "geocode_address",
            new_callable=AsyncMock,
        ) as geocode,
    ):
        fetch_keys.return_value = []
        insert.side_effect = lambda listings: len(listings)
        geocode.return_value = (43.79, -79.53)
        yield sources, fetch_keys, insert, geocode


@pytest.mark.asyncio
async def test_clean_listing_flows_through_to_insert(mock_pipeline):
    sources, _, insert, _ = mock_pipeline
    sources.return_value = _result([_raw()])

    outcome = await rental_comps_scraper.run_nightly_scrape()
    inserted = outcome.inserted

    assert inserted == 1
    stored = insert.call_args[0][0]
    assert stored[0].rent_monthly == 2150
    assert stored[0].beds == 2
    assert stored[0].postal_code == "L4K5W4"


@pytest.mark.asyncio
async def test_geocoding_attaches_coordinates(mock_pipeline):
    sources, _, insert, geocode = mock_pipeline
    sources.return_value = _result([_raw()])

    await rental_comps_scraper.run_nightly_scrape()

    stored = insert.call_args[0][0]
    assert stored[0].lat == 43.79
    assert stored[0].lng == -79.53
    geocode.assert_awaited_once()


@pytest.mark.asyncio
async def test_weekly_rent_converted_before_storage(mock_pipeline):
    sources, _, insert, _ = mock_pipeline
    sources.return_value = _result([_raw(rent_raw="550 / week", source="kijiji")])

    await rental_comps_scraper.run_nightly_scrape()

    stored = insert.call_args[0][0]
    assert stored[0].rent_monthly == 2382  # 550 × 4.33 rounded


@pytest.mark.asyncio
async def test_garbage_listings_discarded(mock_pipeline):
    sources, _, insert, _ = mock_pipeline
    sources.return_value = _result(
        [
            _raw(rent_raw="contact us"),  # unparseable rent
            _raw(address="123 Robson St, Vancouver BC V6B 1A1"),  # non-Ontario
            _raw(address="   "),  # blank address
            _raw(rent_raw="$95/day"),  # daily rate
        ]
    )

    outcome = await rental_comps_scraper.run_nightly_scrape()
    inserted = outcome.inserted

    assert inserted == 0
    assert insert.call_args[0][0] == []


@pytest.mark.asyncio
async def test_cross_source_duplicate_stored_once(mock_pipeline):
    sources, _, insert, _ = mock_pipeline
    sources.return_value = _result(
        [
            _raw(source="rentals_ca"),
            _raw(source="kijiji"),  # same unit found on second source
        ]
    )

    outcome = await rental_comps_scraper.run_nightly_scrape()
    inserted = outcome.inserted

    assert inserted == 1


@pytest.mark.asyncio
async def test_second_run_same_day_inserts_nothing(mock_pipeline):
    # TESTING.md Test 8 — running twice must not double the row count
    sources, fetch_keys, insert, _ = mock_pipeline
    sources.return_value = _result([_raw()])
    fetch_keys.return_value = [("5 Buttermill Ave, Vaughan, ON L4K 5W4", 2150, 2)]

    outcome = await rental_comps_scraper.run_nightly_scrape()
    inserted = outcome.inserted

    assert inserted == 0


@pytest.mark.asyncio
async def test_geocode_failure_is_non_fatal(mock_pipeline):
    sources, _, insert, geocode = mock_pipeline
    sources.return_value = _result([_raw()])
    geocode.return_value = None

    outcome = await rental_comps_scraper.run_nightly_scrape()
    inserted = outcome.inserted

    assert inserted == 1
    stored = insert.call_args[0][0]
    assert stored[0].lat is None and stored[0].lng is None


@pytest.mark.asyncio
async def test_empty_scrape_inserts_nothing(mock_pipeline):
    sources, _, insert, _ = mock_pipeline
    sources.return_value = _result([])

    outcome = await rental_comps_scraper.run_nightly_scrape()
    inserted = outcome.inserted

    assert inserted == 0
    assert insert.call_args[0][0] == []


@pytest.mark.asyncio
async def test_geocode_called_once_per_new_listing(mock_pipeline):
    sources, _, _, geocode = mock_pipeline
    sources.return_value = _result(
        [
            _raw(address="5 Buttermill Ave, Vaughan, ON L4K 5W4"),
            _raw(address="10 Main St, Toronto, ON M5V 1J1", source="kijiji"),
        ]
    )

    await rental_comps_scraper.run_nightly_scrape()

    assert geocode.await_count == 2


@pytest.mark.asyncio
async def test_partial_geocode_failure_all_listings_still_inserted(mock_pipeline):
    sources, _, insert, geocode = mock_pipeline
    sources.return_value = _result(
        [
            _raw(address="5 Buttermill Ave, Vaughan, ON L4K 5W4"),
            _raw(address="10 Main St, Toronto, ON M5V 1J1", source="kijiji"),
        ]
    )
    geocode.side_effect = [(43.79, -79.53), None]

    outcome = await rental_comps_scraper.run_nightly_scrape()
    inserted = outcome.inserted

    assert inserted == 2
    stored = insert.call_args[0][0]
    assert stored[0].lat == 43.79 and stored[0].lng == -79.53
    assert stored[1].lat is None and stored[1].lng is None


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
        patch.object(
            rental_comps_scraper, "launch_browser", return_value=FakeBrowserCtx()
        ),
    ):
        result = await rental_comps_scraper.scrape_all_sources()

    # The working source's row survives; the failing source is recorded as a
    # zero yield (not omitted) so a crashed source surfaces as a dead source.
    assert len(result.listings) == 1
    yields = {y.source: y.raw_count for y in result.yields}
    assert yields == {"kijiji": 0, "rentals_ca": 1}


# ── Per-source yield alarm (the "scraper ran" ≠ "scraper extracted rows" check) ──

from rental_comps_scraper import SourceYield, find_underperforming_sources  # noqa: E402


def test_find_underperforming_sources_all_healthy() -> None:
    yields = [
        SourceYield("rentals_ca", 50),
        SourceYield("kijiji", 12),
        SourceYield("padmapper", 8),
    ]
    assert find_underperforming_sources(yields, min_rows=5) == []


def test_find_underperforming_sources_flags_zero_and_near_zero() -> None:
    yields = [
        SourceYield("rentals_ca", 50),  # healthy
        SourceYield("kijiji", 0),  # dead — broken selector
        SourceYield("padmapper", 2),  # near-zero — partial breakage
    ]
    flagged = find_underperforming_sources(yields, min_rows=5)
    assert [y.source for y in flagged] == ["kijiji", "padmapper"]


@pytest.mark.asyncio
async def test_dead_source_still_stores_healthy_rows_then_flags(mock_pipeline):
    """A broken selector (zero rows) must not discard the working sources' data,
    and must surface as an underperforming source — not a silent green run."""
    sources, _, insert, _ = mock_pipeline
    # rentals_ca healthy (6 rows ≥ floor of 5); kijiji + padmapper dead (0 rows).
    healthy = [
        _raw(address=f"{n} King St, Toronto, ON M5V 1J{n}", source="rentals_ca")
        for n in range(6)
    ]
    sources.return_value = _result(
        healthy,
        yields=[
            SourceYield("rentals_ca", 6),
            SourceYield("kijiji", 0),
            SourceYield("padmapper", 0),
        ],
    )

    outcome = await rental_comps_scraper.run_nightly_scrape()

    # Healthy rows were stored — the dead sources cost us nothing.
    assert outcome.inserted == 6
    assert insert.call_args[0][0]  # non-empty insert happened
    # The dead sources are flagged loudly for the caller to exit non-zero on.
    assert {y.source for y in outcome.underperforming} == {"kijiji", "padmapper"}


@pytest.mark.asyncio
async def test_all_sources_healthy_flags_nothing(mock_pipeline):
    sources, _, _, _ = mock_pipeline
    sources.return_value = _result(
        [_raw(source="rentals_ca")],
        yields=[
            SourceYield("rentals_ca", 40),
            SourceYield("kijiji", 15),
            SourceYield("padmapper", 9),
        ],
    )

    outcome = await rental_comps_scraper.run_nightly_scrape()

    assert outcome.underperforming == []
