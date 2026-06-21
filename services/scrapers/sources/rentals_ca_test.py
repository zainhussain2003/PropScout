"""Unit tests for rentals_ca._parse_card() — Playwright elements mocked."""
import pytest
from unittest.mock import AsyncMock

from sources import rentals_ca
from sources.rentals_ca import (
    _ADDRESS_SELECTOR,
    _BATHS_SELECTOR,
    _BEDS_SELECTOR,
    _BASE_URL,
    _LINK_SELECTOR,
    _RENT_SELECTOR,
    _SQFT_SELECTOR,
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
    baths: str | None = None,
    sqft: str | None = None,
    href: str | None = "/listing/12345",
    missing_address: bool = False,
    missing_rent: bool = False,
) -> AsyncMock:
    selector_map = {
        _ADDRESS_SELECTOR: None if missing_address else _el(address),
        _RENT_SELECTOR: None if missing_rent else _el(rent),
        _BEDS_SELECTOR: _el(beds),
        _BATHS_SELECTOR: _el(baths) if baths is not None else None,
        _SQFT_SELECTOR: _el(sqft) if sqft is not None else None,
        _LINK_SELECTOR: _el("", href=href) if href is not None else None,
    }
    card = AsyncMock()

    async def qs(selector: str) -> AsyncMock | None:
        return selector_map.get(selector)

    card.query_selector.side_effect = qs
    return card


@pytest.mark.asyncio
async def test_full_card_returns_listing():
    result = await rentals_ca._parse_card(_card(baths="1 Bath", sqft="750 sqft"))
    assert result is not None
    assert result.source == SOURCE
    assert result.address == "5 Buttermill Ave, Vaughan, ON L4K 5W4"
    assert result.rent_raw == "$2,150/mo"
    assert result.beds_raw == "2 Beds"
    assert result.baths_raw == "1 Bath"
    assert result.sqft_raw == "750 sqft"


@pytest.mark.asyncio
async def test_missing_address_element_returns_none():
    result = await rentals_ca._parse_card(_card(missing_address=True))
    assert result is None


@pytest.mark.asyncio
async def test_missing_rent_element_returns_none():
    result = await rentals_ca._parse_card(_card(missing_rent=True))
    assert result is None


@pytest.mark.asyncio
async def test_relative_href_prepends_base_url():
    result = await rentals_ca._parse_card(_card(href="/listing/99"))
    assert result is not None
    assert result.source_url == _BASE_URL + "/listing/99"


@pytest.mark.asyncio
async def test_absolute_href_used_as_is():
    result = await rentals_ca._parse_card(_card(href="https://rentals.ca/listing/99"))
    assert result is not None
    assert result.source_url == "https://rentals.ca/listing/99"


@pytest.mark.asyncio
async def test_no_link_element_falls_back_to_base_url():
    result = await rentals_ca._parse_card(_card(href=None))
    assert result is not None
    assert result.source_url == _BASE_URL


@pytest.mark.asyncio
async def test_absent_optional_fields_stored_as_none():
    result = await rentals_ca._parse_card(_card())
    assert result is not None
    assert result.baths_raw is None
    assert result.sqft_raw is None


@pytest.mark.asyncio
async def test_inner_text_exception_returns_none():
    card = AsyncMock()

    async def qs(_selector: str) -> AsyncMock:
        el = AsyncMock()
        el.inner_text.side_effect = RuntimeError("browser crashed")
        return el

    card.query_selector.side_effect = qs
    result = await rentals_ca._parse_card(card)
    assert result is None
