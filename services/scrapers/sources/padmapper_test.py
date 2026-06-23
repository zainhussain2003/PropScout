"""Unit tests for padmapper._parse_card() — Playwright elements mocked.

PadMapper cards are anchored on schema.org microdata (itemprop fields) for the
address + listing URL, and the rent/bed RANGE is read from the card's visible
text. These tests mirror that: address comes from itemprop elements, rent/beds
from the card's inner_text.
"""

import pytest
from unittest.mock import AsyncMock

from sources import padmapper
from sources.padmapper import (
    _BASE_URL,
    _LINK_SELECTOR,
    _LOCALITY_SELECTOR,
    _POSTAL_SELECTOR,
    _REGION_SELECTOR,
    _STREET_SELECTOR,
    SOURCE,
)

# A realistic PadMapper card's visible text (en-dash ranges, as the live site uses).
_CARD_TEXT = (
    "MUST-SEE VERIFIED $2,174–$3,956 1–3 Bedrooms "
    "Apartments · Davenport, Toronto The Diamond"
)


def _el(text: str = "", href: str | None = None) -> AsyncMock:
    el = AsyncMock()
    el.inner_text.return_value = text

    async def ga(name: str) -> str | None:
        return {"href": href, "content": None}.get(name)

    el.get_attribute.side_effect = ga
    return el


def _card(
    street: str = "950 Lansdowne Ave",
    locality: str = "Toronto",
    region: str = "ON",
    postal: str = "M6H 0E6",
    text: str = _CARD_TEXT,
    href: str | None = "/buildings/p1624543/the-diamond",
    missing_street: bool = False,
) -> AsyncMock:
    selector_map = {
        _STREET_SELECTOR: None if missing_street else _el(street),
        _LOCALITY_SELECTOR: _el(locality),
        _REGION_SELECTOR: _el(region),
        _POSTAL_SELECTOR: _el(postal),
        _LINK_SELECTOR: _el("", href=href) if href is not None else None,
    }
    card = AsyncMock()

    async def qs(selector: str) -> AsyncMock | None:
        return selector_map.get(selector)

    card.query_selector.side_effect = qs
    card.inner_text.return_value = text
    return card


@pytest.mark.asyncio
async def test_full_card_builds_address_and_reads_rent_beds():
    result = await padmapper._parse_card(_card())
    assert result is not None
    assert result.source == SOURCE
    assert result.address == "950 Lansdowne Ave, Toronto, ON M6H 0E6"
    assert (
        result.rent_raw == "$2,174–$3,956"
    )  # full range; normaliser takes the low end
    assert result.beds_raw == "1–3 Bedrooms"
    assert result.source_url == _BASE_URL + "/buildings/p1624543/the-diamond"


@pytest.mark.asyncio
async def test_missing_street_address_returns_none():
    assert await padmapper._parse_card(_card(missing_street=True)) is None


@pytest.mark.asyncio
async def test_no_price_in_text_returns_none():
    # A card whose text carries no "$" can't be a rental comp.
    assert (
        await padmapper._parse_card(_card(text="Coming soon · Davenport, Toronto"))
        is None
    )


@pytest.mark.asyncio
async def test_studio_range_captured():
    result = await padmapper._parse_card(
        _card(text="VERIFIED $1,999–$3,995 Studio–3 Bedrooms Apartments · South Annex")
    )
    assert result is not None
    assert result.beds_raw == "Studio–3 Bedrooms"


@pytest.mark.asyncio
async def test_absolute_href_kept():
    result = await padmapper._parse_card(
        _card(href="https://www.padmapper.com/buildings/p9/x")
    )
    assert result is not None
    assert result.source_url == "https://www.padmapper.com/buildings/p9/x"


@pytest.mark.asyncio
async def test_no_link_element_falls_back_to_base_url():
    result = await padmapper._parse_card(_card(href=None))
    assert result is not None
    assert result.source_url == _BASE_URL


@pytest.mark.asyncio
async def test_inner_text_exception_returns_none():
    card = _card()
    card.inner_text.side_effect = RuntimeError("render timeout")
    assert await padmapper._parse_card(card) is None
