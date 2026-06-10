"""Unit tests for kijiji._parse_card() — Playwright elements mocked."""
import pytest
from unittest.mock import AsyncMock

from sources import kijiji
from sources.kijiji import (
    _BASE_URL,
    _BEDS_SELECTOR,
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
    beds: str = "2 Beds",
    href: str | None = "/v-apartments-condos/12345",
    missing_rent: bool = False,
    missing_title: bool = False,
    missing_location: bool = False,
) -> AsyncMock:
    selector_map = {
        _TITLE_SELECTOR: None if missing_title else _el(title),
        _RENT_SELECTOR: None if missing_rent else _el(rent),
        _LOCATION_SELECTOR: None if missing_location else _el(location),
        _BEDS_SELECTOR: _el(beds),
        _LINK_SELECTOR: _el("", href=href) if href is not None else None,
    }
    card = AsyncMock()

    async def qs(selector: str) -> AsyncMock | None:
        return selector_map.get(selector)

    card.query_selector.side_effect = qs
    return card


@pytest.mark.asyncio
async def test_full_card_builds_address_from_title_and_location():
    result = await kijiji._parse_card(_card())
    assert result is not None
    assert result.source == SOURCE
    assert result.address == "2BR Apartment, Vaughan, ON L4K 5W4"
    assert result.rent_raw == "$2,150/mo"


@pytest.mark.asyncio
async def test_missing_rent_returns_none():
    result = await kijiji._parse_card(_card(missing_rent=True))
    assert result is None


@pytest.mark.asyncio
async def test_both_title_and_location_missing_returns_none():
    result = await kijiji._parse_card(_card(missing_title=True, missing_location=True))
    assert result is None


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
