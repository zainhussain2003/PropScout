"""Unit tests for kijiji._parse_card() — Playwright elements mocked.

Beds are parsed from the full card text (title + description preview), bound to a
bed/bedroom/br suffix so IDs and street numbers can't slip through; address =
title + location.
"""

import pytest
from unittest.mock import AsyncMock

from sources import kijiji
from sources.kijiji import (
    _BASE_URL,
    _LINK_SELECTOR,
    _LOCATION_SELECTOR,
    _RENT_SELECTOR,
    _TITLE_SELECTOR,
    SOURCE,
)


def _el(text: str = "", href: str | None = None) -> AsyncMock:
    el = AsyncMock()
    el.inner_text.return_value = text
    el.get_attribute.return_value = href
    return el


def _card(
    title: str = "2BR Apartment",
    rent: str = "$2,150/mo",
    location: str = "Vaughan, ON L4K 5W4",
    card_text: str | None = None,
    href: str | None = "/v-apartments-condos/12345",
    missing_rent: bool = False,
    missing_title: bool = False,
    missing_location: bool = False,
) -> AsyncMock:
    selector_map = {
        _TITLE_SELECTOR: None if missing_title else _el(title),
        _RENT_SELECTOR: None if missing_rent else _el(rent),
        _LOCATION_SELECTOR: None if missing_location else _el(location),
        _LINK_SELECTOR: _el("", href=href) if href is not None else None,
    }
    card = AsyncMock()

    async def qs(selector: str) -> AsyncMock | None:
        return selector_map.get(selector)

    card.query_selector.side_effect = qs
    # Beds parse from the full card text; default it to the title when unset.
    card.inner_text.return_value = card_text if card_text is not None else title
    return card


@pytest.mark.asyncio
async def test_full_card_builds_address_and_beds_from_title():
    result = await kijiji._parse_card(_card())
    assert result is not None
    assert result.source == SOURCE
    assert result.address == "2BR Apartment, Vaughan, ON L4K 5W4"
    assert result.rent_raw == "$2,150/mo"
    assert result.beds_raw == "2BR"  # parsed from the title


@pytest.mark.asyncio
async def test_spelled_out_beds_in_title():
    result = await kijiji._parse_card(_card(title="Renovated two bedroom apartment"))
    assert result is not None
    assert result.beds_raw == "two bedroom"


@pytest.mark.asyncio
async def test_bachelor_title_is_studio():
    result = await kijiji._parse_card(
        _card(title="Parkdale Bachelor Apartment for Rent")
    )
    assert result is not None
    assert result.beds_raw == "studio"


@pytest.mark.asyncio
async def test_no_beds_stated_anywhere_is_blank():
    result = await kijiji._parse_card(
        _card(
            title="Bright downtown apartment for rent",
            card_text="Bright downtown apartment",
        )
    )
    assert result is not None
    assert result.beds_raw == ""


@pytest.mark.asyncio
async def test_beds_recovered_from_description_when_title_omits():
    # Title states no bed count; the description preview does.
    result = await kijiji._parse_card(
        _card(
            title="Renovated unit - ID 544, Indian Road",
            card_text="$2,200 Renovated unit - ID 544 Akelius two bedroom apartment near High Park",
        )
    )
    assert result is not None
    assert result.beds_raw == "two bedroom"


@pytest.mark.asyncio
async def test_guard_ignores_id_and_street_numbers():
    # "ID 544" and "90 Jameson" must NOT become bed counts — only the bed-bound match wins.
    result = await kijiji._parse_card(
        _card(
            title="Apartment for rent",
            card_text="ID 544 at 90 Jameson Avenue, a 1 bedroom unit, unit 7",
        )
    )
    assert result is not None
    assert result.beds_raw == "1 bedroom"


@pytest.mark.asyncio
async def test_bdr_abbreviation_parses():
    # "1 bdr den" — the bdr abbreviation must read as 1, still bound to a digit.
    result = await kijiji._parse_card(
        _card(title="Move-in ready", card_text="$2,469 1 bdr den for CAF IR posting")
    )
    assert result is not None
    assert result.beds_raw == "1 bdr"


@pytest.mark.asyncio
async def test_bare_bdr_without_number_does_not_match():
    # The guard still holds: "bdr" with no bound number is not a bed count.
    result = await kijiji._parse_card(
        _card(title="Cozy unit", card_text="Spacious bdr-style layout, great light")
    )
    assert result is not None
    assert result.beds_raw == ""


@pytest.mark.asyncio
async def test_real_bedroom_not_overridden_by_later_studio_mention():
    # A later "fitness studio" amenity must not zero out a stated 2 bedroom.
    result = await kijiji._parse_card(
        _card(
            title="Spacious 2 bedroom",
            card_text="Spacious 2 bedroom apartment with access to a fitness studio",
        )
    )
    assert result is not None
    assert result.beds_raw == "2 bedroom"


@pytest.mark.asyncio
async def test_missing_rent_returns_none():
    assert await kijiji._parse_card(_card(missing_rent=True)) is None


@pytest.mark.asyncio
async def test_both_title_and_location_missing_returns_none():
    assert (
        await kijiji._parse_card(_card(missing_title=True, missing_location=True))
        is None
    )


@pytest.mark.asyncio
async def test_title_missing_address_falls_back_to_location():
    result = await kijiji._parse_card(_card(missing_title=True))
    assert result is not None
    assert result.address == "Vaughan, ON L4K 5W4"


@pytest.mark.asyncio
async def test_weekly_rent_passes_through_raw():
    result = await kijiji._parse_card(_card(rent="$550/wk"))
    assert result is not None
    assert result.rent_raw == "$550/wk"  # normalization converts later


@pytest.mark.asyncio
async def test_relative_href_prepends_base_url():
    result = await kijiji._parse_card(_card(href="/v-apartments-condos/99"))
    assert result is not None
    assert result.source_url == _BASE_URL + "/v-apartments-condos/99"


@pytest.mark.asyncio
async def test_no_link_element_falls_back_to_base_url():
    result = await kijiji._parse_card(_card(href=None))
    assert result is not None
    assert result.source_url == _BASE_URL
