"""
Unit + functionality tests for geocoding (D-119) — the neighbourhood table,
reading a Kijiji row, and the placement rules with Mapbox mocked.
"""

from unittest.mock import AsyncMock, patch

import pytest

import geocoding
from geocoding import (
    Placement,
    kijiji_location,
    match_toronto_neighbourhood,
    place_kijiji,
    place_listing,
    street_address_in,
)
from normalization import CleanRentalListing
from services.mapbox_service import GeocodeResult

KIJIJI = "https://www.kijiji.ca/v-apartments-condos/city-of-toronto/x/1"


def _row(
    address: str,
    *,
    source: str = "kijiji",
    postal_code: str | None = None,
    raw_json: dict | None = None,
) -> CleanRentalListing:
    return CleanRentalListing(
        source=source,
        source_url=KIJIJI if source == "kijiji" else "https://rentals.ca/x",
        address=address,
        postal_code=postal_code,
        beds=2,
        baths=None,
        rent_monthly=2500,
        sqft=None,
        listed_at=None,
        raw_json=raw_json,
    )


# ── The table ─────────────────────────────────────────────────────────────────


class TestMatchTorontoNeighbourhood:
    def test_exact_names_from_both_revisions(self) -> None:
        assert match_toronto_neighbourhood(
            "Bendale-Glen Andrew"
        ).postal_code.startswith("M1")
        assert match_toronto_neighbourhood(
            "Mount Pleasant West"
        ).postal_code.startswith("M4")
        assert (
            match_toronto_neighbourhood("Forest Hill North").name == "Forest Hill North"
        )

    def test_normalises_the_and_ampersand_and_case(self) -> None:
        assert match_toronto_neighbourhood("The Annex").name == "Annex"
        assert (
            match_toronto_neighbourhood("Church & Wellesley").name == "Church-Wellesley"
        )
        assert match_toronto_neighbourhood("yonge-st.clair").name == "Yonge-St.Clair"
        assert match_toronto_neighbourhood("Fort York - Liberty Village").name == (
            "Fort York-Liberty Village"
        )

    def test_unique_containment(self) -> None:
        assert match_toronto_neighbourhood("Clairlea").name == "Clairlea-Birchmount"
        assert match_toronto_neighbourhood("Beaumond Heights").name == (
            "Thistletown-Beaumond Heights"
        )

    def test_ambiguous_or_unknown_is_none(self) -> None:
        # "Willowdale" is in Willowdale East and Willowdale West.
        assert match_toronto_neighbourhood("Willowdale") is None
        assert match_toronto_neighbourhood("South Cedarbrae") is None
        assert match_toronto_neighbourhood("Golfdale Gardens") is None
        assert match_toronto_neighbourhood("") is None

    def test_every_row_has_a_toronto_postal_code(self) -> None:
        for point in geocoding._EXACT.values():
            assert point.postal_code is not None and point.postal_code.startswith("M")
            assert 43.5 < point.lat < 43.9 and -79.7 < point.lng < -79.1


# ── Reading a Kijiji row ──────────────────────────────────────────────────────


class TestKijijiLocation:
    def test_from_raw_json_location(self) -> None:
        row = _row(
            "Nice 3 bed, Bendale-Glen Andrew, City of Toronto",
            raw_json={
                "title": "Nice 3 bed",
                "location": "Bendale-Glen Andrew, City of Toronto",
            },
        )
        assert kijiji_location(row) == ("Bendale-Glen Andrew", "City of Toronto")

    def test_from_address_tail_on_an_older_row(self) -> None:
        row = _row(
            "House for rent in Scarborough from September 1, 2026, South Cedarbrae, Toronto"
        )
        assert kijiji_location(row) == ("South Cedarbrae", "Toronto")

    def test_truncated_ontario_is_not_a_neighbourhood(self) -> None:
        row = _row(
            "414 - 51 EAST LIBERTY STREET Toronto (Niagara), Ontari, City of Toronto"
        )
        assert kijiji_location(row) == (None, "City of Toronto")
        row = _row("2 bed condo, Ontario, City of Toronto")
        assert kijiji_location(row) == (None, "City of Toronto")

    def test_ad_copy_before_the_city_is_not_a_neighbourhood(self) -> None:
        row = _row("3 Bedroom Apartment for Rent - 2757 Kipling Avenue, Toronto")
        assert kijiji_location(row) == (None, "Toronto")

    def test_non_toronto_city_label(self) -> None:
        row = _row("Nice 2 bed, Brownridge, Vaughan")
        assert kijiji_location(row) == (None, "Vaughan")


class TestStreetAddressIn:
    def test_finds_a_street_in_a_title(self) -> None:
        assert street_address_in(
            "1 Bedroom Apartment for Rent - 155 Wellesley Street East"
        ) == ("155 Wellesley Street East")
        assert (
            street_address_in("Bachelor at 425 Avenue Rd near subway")
            == "425 Avenue Rd"
        )
        assert street_address_in("510 - 2946 DUNDAS STREET WEST STREET W Toronto") == (
            "2946 DUNDAS STREET WEST STREET W"
        )

    def test_no_street_no_match(self) -> None:
        assert (
            street_address_in("Nice 3 Bedrooms House For Rent, Bendale-Glen Andrew")
            is None
        )
        assert street_address_in("2 bed 2 bath, Willowdale East") is None


# ── Placement ─────────────────────────────────────────────────────────────────


def _geo(
    lat: float, lng: float, postal: str | None, relevance: float = 1.0
) -> GeocodeResult:
    return GeocodeResult(lat, lng, postal, relevance, "neighborhood")


@pytest.mark.asyncio
async def test_toronto_neighbourhood_is_placed_from_the_table_without_a_call() -> None:
    # The 1 Caldow Road comps, 2026-09-16: "South Cedarbrae, Toronto" and
    # "Bendale-Glen Andrew" were geocoded into M4S / M4W. The table places
    # Bendale-Glen Andrew in Scarborough and calls nothing.
    row = _row("Nice 3 Bedrooms House For Rent, Bendale-Glen Andrew, City of Toronto")
    with patch(
        "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
    ) as geocode:
        placed = await place_kijiji(row, {})
    geocode.assert_not_awaited()
    assert placed is not None
    assert placed.method == "neighbourhood_table"
    assert placed.postal_code.startswith("M1")


@pytest.mark.asyncio
async def test_unknown_neighbourhood_is_asked_of_mapbox_as_a_neighbourhood_inside_toronto() -> (
    None
):
    row = _row("House for rent in Scarborough, South Cedarbrae, Toronto")
    with (
        patch(
            "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
        ) as geocode,
        patch(
            "geocoding.mapbox_service.reverse_postal_code", new_callable=AsyncMock
        ) as reverse,
    ):
        geocode.return_value = _geo(43.76, -79.23, None)
        reverse.return_value = "M1H2K3"
        cache: dict[str, Placement | None] = {}
        placed = await place_kijiji(row, cache)
        again = await place_kijiji(row, cache)
    assert placed == Placement(43.76, -79.23, "M1H2K3", "neighbourhood_geocode")
    assert again == placed
    geocode.assert_awaited_once()
    kwargs = geocode.await_args.kwargs
    assert kwargs["types"] == "neighborhood,locality"
    assert kwargs["bbox"] == geocoding.TORONTO_BBOX
    assert geocode.await_args.args[0] == "South Cedarbrae, Toronto, Ontario"


@pytest.mark.asyncio
async def test_a_neighbourhood_mapbox_does_not_know_leaves_the_row_unplaced() -> None:
    row = _row("2 bed, Nowhere Heights, City of Toronto")
    with patch(
        "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
    ) as geocode:
        geocode.return_value = None
        placed = await place_kijiji(row, {})
    assert placed is None


@pytest.mark.asyncio
async def test_a_street_in_the_title_is_placed_exactly() -> None:
    row = _row(
        "1 Bedroom Apartment for Rent - 155 Wellesley Street East, Church & Wellesley, Toronto"
    )
    with patch(
        "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
    ) as geocode:
        geocode.return_value = GeocodeResult(
            43.6655, -79.3778, "M4Y1J2", 0.95, "address", "155"
        )
        placed = await place_kijiji(row, {})
    assert placed.method == "street_in_title"
    assert placed.postal_code == "M4Y1J2"
    assert geocode.await_args.args[0] == "155 Wellesley Street East, Toronto, Ontario"
    assert geocode.await_args.kwargs["types"] == "address"


@pytest.mark.asyncio
async def test_street_that_fails_falls_back_to_the_neighbourhood() -> None:
    row = _row("Suite at 99 Nonexistent Ave, Church & Wellesley, Toronto")
    with patch(
        "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
    ) as geocode:
        geocode.return_value = None
        placed = await place_kijiji(row, {})
    assert placed.method == "neighbourhood_table"
    assert placed.postal_code.startswith("M4Y")


@pytest.mark.asyncio
async def test_a_postal_code_in_the_text_geocodes_the_whole_address() -> None:
    row = _row(
        "10 Main St, Toronto, ON M5V 1J1, Niagara, Toronto", postal_code="M5V1J1"
    )
    with patch(
        "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
    ) as geocode:
        geocode.return_value = GeocodeResult(43.64, -79.40, "M5V1J1", 1.0, "address")
        placed = await place_kijiji(row, {})
    assert placed.method == "address"
    geocode.assert_awaited_once_with(row.address)


@pytest.mark.asyncio
async def test_other_sources_geocode_their_street_address() -> None:
    row = _row("6020 Bathurst Street, Toronto, ON M2R 1Z8", source="rentals_ca")
    with patch(
        "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
    ) as geocode:
        geocode.return_value = GeocodeResult(43.78, -79.44, "M2R1Z8", 1.0, "address")
        placed = await place_listing(row, {})
    assert placed == Placement(43.78, -79.44, "M2R1Z8", "address")


@pytest.mark.asyncio
async def test_a_syndicated_title_names_the_neighbourhood_and_biases_the_street() -> (
    None
):
    # "90 DALE AVENUE Toronto (Guildwood)": Toronto has a Dale Avenue in
    # Rosedale too. The title's neighbourhood is the proximity for the street
    # geocode, and the fallback when the street fails.
    from geocoding import neighbourhood_in_title

    assert (
        neighbourhood_in_title("201 - 90 DALE AVENUE Toronto (Guildwood), Ontario")
        == "Guildwood"
    )
    assert neighbourhood_in_title("Nice 2 bed near the lake") is None

    row = _row("201 - 90 DALE AVENUE Toronto (Guildwood), Ontario, City of Toronto")
    with patch(
        "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
    ) as geocode:
        geocode.return_value = GeocodeResult(
            43.75, -79.19, "M1E1Z7", 1.0, "address", "90"
        )
        placed = await place_kijiji(row, {})
    assert placed.method == "street_in_title"
    prox = geocode.await_args.kwargs["proximity"]
    guildwood = match_toronto_neighbourhood("Guildwood")
    assert prox == (guildwood.lng, guildwood.lat)

    with patch(
        "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
    ) as geocode:
        geocode.return_value = None
        placed = await place_kijiji(row, {})
    assert placed.method == "neighbourhood_table"
    assert placed.postal_code == guildwood.postal_code


@pytest.mark.asyncio
async def test_neighbourhood_geocode_uses_the_lower_floor() -> None:
    from constants import GEOCODE_NEIGHBOURHOOD_MIN_RELEVANCE

    row = _row("2 bed, Golfdale Gardens, City of Toronto")
    with (
        patch(
            "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
        ) as geocode,
        patch(
            "geocoding.mapbox_service.reverse_postal_code", new_callable=AsyncMock
        ) as reverse,
    ):
        geocode.return_value = _geo(43.76, -79.22, "M1G1N9", 0.70)
        reverse.return_value = None
        await place_kijiji(row, {})
    assert (
        geocode.await_args.kwargs["min_relevance"]
        == GEOCODE_NEIGHBOURHOOD_MIN_RELEVANCE
    )


@pytest.mark.asyncio
async def test_a_street_answer_with_another_house_number_is_not_the_address() -> None:
    # Mapbox answers a street it cannot number with the nearest number it has;
    # that is a different building. The row falls back to its neighbourhood.
    row = _row("2 bed at 9999 Wellesley Street East, Church & Wellesley, Toronto")
    with patch(
        "geocoding.mapbox_service.geocode_address", new_callable=AsyncMock
    ) as geocode:
        geocode.return_value = GeocodeResult(
            43.66, -79.37, "M4Y1J2", 0.7, "address", "155"
        )
        placed = await place_kijiji(row, {})
    assert placed.method == "neighbourhood_table"
    assert geocode.await_args.kwargs["bbox"] == geocoding.GTA_BBOX
