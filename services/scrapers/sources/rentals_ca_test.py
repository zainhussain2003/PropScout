"""Unit tests for the GraphQL-based rentals_ca source.

Rentals.ca redesigned to a map SPA backed by a GraphQL API; the source now parses
``RentalListingSearch`` nodes instead of CSS cards. These tests cover node
parsing, the range→low-end collapse, payload shape, the in-page query wrapper, and
the fetch_listings orchestration (token capture, per-city signal, block handling).
"""

import json

import pytest
from unittest.mock import AsyncMock

from normalization import RawRentalListing
from sources import rentals_ca
from sources.browser import NAV_FAILED_STATUS, PageResult
from sources.rentals_ca import _BASE_URL, SOURCE

# ── pure helpers ───────────────────────────────────────────────────────────────


def test_slug_to_area_simple():
    assert rentals_ca._slug_to_area("toronto") == "toronto, on, ca"


def test_slug_to_area_hyphenated():
    assert rentals_ca._slug_to_area("richmond-hill") == "richmond hill, on, ca"


@pytest.mark.parametrize(
    "rng,expected",
    [
        ([1895.0, 4595.0], "1895.0"),  # low end of a building range
        ([0.0, 3.0], "0.0"),  # studio → 0
        ([1200], "1200"),  # single value
        ([None, 2200.0], "2200.0"),  # None filtered out
        ([], ""),  # empty
        (None, ""),  # absent
        ("nonsense", ""),  # non-list
    ],
)
def test_low_range(rng, expected):
    assert rentals_ca._low(rng) == expected


# ── _parse_node ────────────────────────────────────────────────────────────────


def _node(**over) -> dict:
    node = {
        "id": "cmVudGFsbGlzdGluZzox",
        "path": "toronto/1060-eastern-avenue",
        "name": "Bridge",
        "rentRange": [1895.0, 4595.0],
        "bedsRange": [0.0, 3.0],
        "bathsRange": [1.0, 2.0],
        "sizeRange": [377.0, 875.0],
        "location": [-79.317635, 43.665422],
        "listingType": "residential:apartment:apartment",
        "address": {
            "street": "1060 Eastern Avenue",
            "streetSuffix": None,
            "cityName": "Toronto",
            "regionCode": "ON",
            "postalCode": "M4L 1L1",
        },
    }
    node.update(over)
    return node


def test_parse_node_full():
    r = rentals_ca._parse_node(_node(), "toronto")
    assert r is not None
    assert r.source == SOURCE
    assert r.source_url == _BASE_URL + "/toronto/1060-eastern-avenue"
    # postal folded into the address so the shared normaliser can read it
    assert r.address == "1060 Eastern Avenue, Toronto, ON M4L 1L1"
    assert r.rent_raw == "1895.0"  # low end
    assert r.beds_raw == "0.0"  # studio low end
    assert r.baths_raw == "1.0"
    assert r.sqft_raw == "377.0"
    assert r.lat == 43.665422 and r.lng == -79.317635  # [lng, lat] → lat, lng


def test_parse_node_includes_street_suffix():
    addr = {
        "street": "5 King",
        "streetSuffix": "St W",
        "cityName": "Toronto",
        "regionCode": "ON",
        "postalCode": "M5H 1A1",
    }
    r = rentals_ca._parse_node(_node(address=addr), "toronto")
    assert r is not None
    assert r.address.startswith("5 King St W, Toronto")


def test_parse_node_falls_back_to_name_when_street_blank():
    addr = {
        "street": None,
        "cityName": "Toronto",
        "regionCode": "ON",
        "postalCode": "M4Y 0E5",
    }
    r = rentals_ca._parse_node(_node(name="The Britt", address=addr), "toronto")
    assert r is not None
    assert r.address.startswith("The Britt, Toronto")


def test_parse_node_no_path_uses_base_url():
    r = rentals_ca._parse_node(_node(path=None), "toronto")
    assert r is not None
    assert r.source_url == _BASE_URL


def test_parse_node_missing_location_leaves_coords_none():
    r = rentals_ca._parse_node(_node(location=[]), "toronto")
    assert r is not None
    assert r.lat is None and r.lng is None


def test_parse_node_locality_fallback_to_slug():
    addr = {
        "street": "1 Main St",
        "cityName": None,
        "regionCode": "ON",
        "postalCode": "L6A 1A1",
    }
    r = rentals_ca._parse_node(_node(address=addr), "richmond-hill")
    assert r is not None
    assert "Richmond Hill" in r.address


def test_parse_node_empty_returns_none():
    assert rentals_ca._parse_node({}, "toronto") is None


def test_parse_node_no_address_text_returns_none():
    # no street, no name, no address dict → nothing to locate on
    node = _node(name="", path=None, address={})
    assert rentals_ca._parse_node(node, "") is None


# ── _build_payload ─────────────────────────────────────────────────────────────


def test_build_payload_shape(monkeypatch):
    monkeypatch.setattr(rentals_ca, "RENTALS_CA_PAGE_SIZE", 100)
    monkeypatch.setattr(rentals_ca, "RENTALS_CA_RADIUS_M", 20_000)
    p = rentals_ca._build_payload("ottawa")
    assert p["operationName"] == "RentalListingSearch"
    assert p["variables"]["first"] == 100
    assert p["variables"]["place"]["namedAreaDistance"] == {
        "distance": 20_000,
        "namedArea": "ottawa, on, ca",
    }


# ── _query_city ────────────────────────────────────────────────────────────────


def _gql_body(n: int) -> str:
    edges = [{"node": _node(path=f"toronto/l{i}")} for i in range(n)]
    return json.dumps(
        {"data": {"rentalListings": {"meta": {"totalCount": n}, "edges": edges}}}
    )


@pytest.mark.asyncio
async def test_query_city_returns_nodes():
    page = AsyncMock()
    page.evaluate.return_value = {"status": 200, "text": _gql_body(3)}
    nodes, status = await rentals_ca._query_city(page, "Bearer x", "toronto")
    assert status == 200
    assert len(nodes) == 3
    assert nodes[0]["path"] == "toronto/l0"


@pytest.mark.asyncio
async def test_query_city_non_200_returns_empty():
    page = AsyncMock()
    page.evaluate.return_value = {"status": 403, "text": "<html>blocked</html>"}
    nodes, status = await rentals_ca._query_city(page, "Bearer x", "toronto")
    assert nodes == [] and status == 403


@pytest.mark.asyncio
async def test_query_city_bad_json_returns_empty():
    page = AsyncMock()
    page.evaluate.return_value = {"status": 200, "text": "not json"}
    nodes, status = await rentals_ca._query_city(page, "Bearer x", "toronto")
    assert nodes == [] and status == 200


@pytest.mark.asyncio
async def test_query_city_graphql_errors_still_returns_edges():
    page = AsyncMock()
    body = json.dumps(
        {
            "errors": [{"message": "deprecated"}],
            "data": {"rentalListings": {"edges": [{"node": _node()}]}},
        }
    )
    page.evaluate.return_value = {"status": 200, "text": body}
    nodes, status = await rentals_ca._query_city(page, "Bearer x", "toronto")
    assert len(nodes) == 1


# ── fetch_listings ─────────────────────────────────────────────────────────────


def _patch_token(monkeypatch, page, token, status=200, blocked=False):
    async def fake_open(_browser, _url):
        return PageResult(page=page, status=status, blocked=blocked), token

    monkeypatch.setattr(rentals_ca, "open_page_capturing_token", fake_open)
    monkeypatch.setattr(rentals_ca, "REQUEST_DELAY_SECONDS", 0)


@pytest.mark.asyncio
async def test_fetch_happy_path(monkeypatch):
    monkeypatch.setattr(rentals_ca, "TARGET_CITIES", ("toronto", "ottawa"))
    page = AsyncMock()
    page.evaluate.return_value = {"status": 200, "text": _gql_body(2)}
    _patch_token(monkeypatch, page, "Bearer tok")

    result = await rentals_ca.fetch_listings(object())

    assert len(result.listings) == 4  # 2 cities × 2 nodes
    assert {pf.city for pf in result.pages} == {"toronto", "ottawa"}
    assert all(
        pf.status == 200 and pf.rows == 2 and not pf.blocked for pf in result.pages
    )
    page.close.assert_awaited()


@pytest.mark.asyncio
async def test_fetch_blocked_landing_records_blocked_per_city(monkeypatch):
    monkeypatch.setattr(rentals_ca, "TARGET_CITIES", ("toronto", "ottawa"))
    page = AsyncMock()
    _patch_token(monkeypatch, page, None, status=403, blocked=True)

    result = await rentals_ca.fetch_listings(object())

    assert result.listings == []
    assert len(result.pages) == 2
    assert all(pf.blocked and pf.rows == 0 and pf.status == 403 for pf in result.pages)


@pytest.mark.asyncio
async def test_fetch_no_token_records_zero_per_city(monkeypatch):
    monkeypatch.setattr(rentals_ca, "TARGET_CITIES", ("toronto",))
    page = AsyncMock()
    _patch_token(monkeypatch, page, None, status=200, blocked=False)

    result = await rentals_ca.fetch_listings(object())

    assert result.listings == []
    assert len(result.pages) == 1
    assert result.pages[0].rows == 0 and not result.pages[0].blocked


@pytest.mark.asyncio
async def test_fetch_nav_failure_page_none(monkeypatch):
    monkeypatch.setattr(rentals_ca, "TARGET_CITIES", ("toronto",))
    _patch_token(monkeypatch, None, None, status=NAV_FAILED_STATUS, blocked=False)

    result = await rentals_ca.fetch_listings(object())

    assert result.listings == []
    assert result.pages[0].status == NAV_FAILED_STATUS


@pytest.mark.asyncio
async def test_fetch_city_query_exception_is_isolated(monkeypatch):
    monkeypatch.setattr(rentals_ca, "TARGET_CITIES", ("toronto", "ottawa"))
    page = AsyncMock()

    calls = {"n": 0}

    async def flaky_evaluate(_js, _args):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("evaluate crashed")
        return {"status": 200, "text": _gql_body(2)}

    page.evaluate.side_effect = flaky_evaluate
    _patch_token(monkeypatch, page, "Bearer tok")

    result = await rentals_ca.fetch_listings(object())

    # first city crashed (recorded, 0 rows), second city still scraped
    assert len(result.listings) == 2
    assert len(result.pages) == 2
    assert result.pages[0].rows == 0
    assert result.pages[1].rows == 2


@pytest.mark.asyncio
async def test_fetch_empty_target_cities_returns_empty(monkeypatch):
    monkeypatch.setattr(rentals_ca, "TARGET_CITIES", ())
    result = await rentals_ca.fetch_listings(object())
    assert result.listings == [] and result.pages == []


@pytest.mark.asyncio
async def test_fetch_listings_are_raw_rental_listings(monkeypatch):
    monkeypatch.setattr(rentals_ca, "TARGET_CITIES", ("toronto",))
    page = AsyncMock()
    page.evaluate.return_value = {"status": 200, "text": _gql_body(1)}
    _patch_token(monkeypatch, page, "Bearer tok")

    result = await rentals_ca.fetch_listings(object())

    assert len(result.listings) == 1
    assert isinstance(result.listings[0], RawRentalListing)
    assert result.listings[0].lat is not None and result.listings[0].lng is not None
