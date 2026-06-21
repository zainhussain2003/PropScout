"""Unit tests for padmapper._parse_card() — Playwright elements mocked."""
import pytest
from unittest.mock import AsyncMock

from sources import padmapper
from sources.padmapper import (
    _ADDRESS_SELECTOR,
    _BASE_URL,
    _BEDS_SELECTOR,
    _LINK_SELECTOR,
    _RENT_SELECTOR,
    SOURCE,
)


def _el(text: str = "", href: str | None = None) -> AsyncMock:
    el = AsyncMock()
    el.inner_text.return_value = text
    el.get_attribute.return_value = href
    return el


def _card(
    address: str = "5 Buttermill Ave, Vaughan, ON L4K 5W4",
    rent: str = "$2,150/mo",
    beds: str = "2 Beds",
    href: str | None = "/apartments/5-buttermill/123",
    missing_address: bool = False,
    missing_rent: bool = False,
) -> AsyncMock:
    selector_map = {
        _ADDRESS_SELECTOR: None if missing_address else _el(address),
        _RENT_SELECTOR: None if missing_rent else _el(rent),
        _BEDS_SELECTOR: _el(beds),
        _LINK_SELECTOR: _el("", href=href) if href is not None else None,
    }
    card = AsyncMock()

    async def qs(selector: str) -> AsyncMock | None:
        return selector_map.get(selector)

    card.query_selector.side_effect = qs
    return card


@pytest.mark.asyncio
async def test_full_card_returns_listing():
    result = await padmapper._parse_card(_card())
    assert result is not None
    assert result.source == SOURCE
    assert result.address == "5 Buttermill Ave, Vaughan, ON L4K 5W4"
    assert result.rent_raw == "$2,150/mo"
    assert result.beds_raw == "2 Beds"


@pytest.mark.asyncio
async def test_missing_address_returns_none():
    result = await padmapper._parse_card(_card(missing_address=True))
    assert result is None


@pytest.mark.asyncio
async def test_missing_rent_returns_none():
    result = await padmapper._parse_card(_card(missing_rent=True))
    assert result is None


@pytest.mark.asyncio
async def test_relative_href_prepends_base_url():
    result = await padmapper._parse_card(_card(href="/apartments/unit/99"))
    assert result is not None
    assert result.source_url == _BASE_URL + "/apartments/unit/99"


@pytest.mark.asyncio
async def test_no_link_element_falls_back_to_base_url():
    result = await padmapper._parse_card(_card(href=None))
    assert result is not None
    assert result.source_url == _BASE_URL


@pytest.mark.asyncio
async def test_inner_text_exception_returns_none():
    card = AsyncMock()

    async def qs(_selector: str) -> AsyncMock:
        el = AsyncMock()
        el.inner_text.side_effect = RuntimeError("render timeout")
        return el

    card.query_selector.side_effect = qs
    result = await padmapper._parse_card(card)
    assert result is None
