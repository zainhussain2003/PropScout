"""Unit tests for padmapper._parse_card() — Playwright elements mocked.

PadMapper cards are anchored on schema.org microdata (itemprop fields) for the
address + listing URL, and the rent/bed RANGE is read from the card's visible
text. These tests mirror that: address comes from itemprop elements, rent/beds
from the card's inner_text.
"""

import pytest
from unittest.mock import AsyncMock

from normalization import RawRentalListing
from sources import padmapper
from sources.browser import PageResult
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


# ── fetch_listings per-page signal (status / row count / blocked) ──────────────


def _listing(url: str) -> RawRentalListing:
    """A minimal RawRentalListing so a mocked _parse_card returns something real."""
    return RawRentalListing(
        source=SOURCE,
        source_url=url,
        address="950 Lansdowne Ave, Toronto, ON M6H 0E6",
        rent_raw="$2,174",
        beds_raw="1 Bedrooms",
    )


@pytest.mark.asyncio
async def test_fetch_records_per_page_rows_status_blocked(monkeypatch):
    # PadMapper waits for the card selector, then counts raw cards on the page.
    monkeypatch.setattr(padmapper, "TARGET_CITIES", ("toronto",))
    monkeypatch.setattr(padmapper, "MAX_PAGES_PER_CITY", 1)
    page = AsyncMock()
    page.wait_for_selector.return_value = object()  # cards rendered
    page.query_selector_all.return_value = [object(), object(), object()]

    async def fake_open_page(_browser: object, _url: str) -> PageResult:
        return PageResult(page=page, status=200, blocked=False)

    # Distinct URLs per card so the in-source URL dedupe keeps all three.
    parsed = [_listing("https://x/1"), _listing("https://x/2"), _listing("https://x/3")]
    monkeypatch.setattr(padmapper, "open_page", fake_open_page)
    monkeypatch.setattr(
        padmapper, "_parse_card", AsyncMock(side_effect=parsed), raising=True
    )

    result = await padmapper.fetch_listings(object())

    assert len(result.pages) == 1
    pf = result.pages[0]
    assert (pf.source, pf.city, pf.page) == (SOURCE, "toronto", 1)
    assert pf.status == 200
    assert pf.rows == 3  # raw cards on the page, before URL dedupe
    assert pf.blocked is False
    assert len(result.listings) == 3


@pytest.mark.asyncio
async def test_fetch_records_signal_when_no_cards_render(monkeypatch):
    # wait_for_selector timing out (no cards rendered — blocked or past last page)
    # must still record the page's captured status/blocked, not silently break.
    monkeypatch.setattr(padmapper, "TARGET_CITIES", ("toronto",))
    monkeypatch.setattr(padmapper, "MAX_PAGES_PER_CITY", 1)
    page = AsyncMock()
    page.wait_for_selector.side_effect = RuntimeError("selector timeout")

    async def fake_open_page(_browser: object, _url: str) -> PageResult:
        return PageResult(page=page, status=403, blocked=True)

    monkeypatch.setattr(padmapper, "open_page", fake_open_page)

    result = await padmapper.fetch_listings(object())

    assert len(result.pages) == 1
    pf = result.pages[0]
    assert pf.blocked is True
    assert pf.status == 403
    assert pf.rows == 0
    assert result.listings == []
