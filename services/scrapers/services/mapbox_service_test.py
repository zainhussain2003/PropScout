"""Unit tests for mapbox_service — httpx and env mocked throughout."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import services.mapbox_service as mapbox_service


def _mock_http_client(features: list) -> AsyncMock:
    """Build a mock httpx client whose .get() returns a Mapbox-shaped response."""
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = {"features": features}
    client = AsyncMock()
    client.get.return_value = resp
    return client


def _patch_http(mock_inner_client: AsyncMock):
    """Context manager: replaces httpx.AsyncClient with a mock that yields mock_inner_client."""
    ctx = MagicMock()
    ctx.__aenter__ = AsyncMock(return_value=mock_inner_client)
    ctx.__aexit__ = AsyncMock(return_value=False)
    return patch("services.mapbox_service.httpx.AsyncClient", return_value=ctx)


@pytest.mark.asyncio
async def test_missing_token_returns_none(monkeypatch):
    monkeypatch.delenv("MAPBOX_TOKEN", raising=False)
    result = await mapbox_service.geocode_address("5 Buttermill Ave, Vaughan")
    assert result is None


@pytest.mark.asyncio
async def test_valid_response_returns_lat_lng_in_correct_order(monkeypatch):
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    # Mapbox returns [lng, lat] — we must return (lat, lng)
    http = _mock_http_client(features=[{"center": [-79.53, 43.79]}])
    with _patch_http(http):
        result = await mapbox_service.geocode_address("5 Buttermill Ave, Vaughan")
    assert result is not None
    assert (result.lat, result.lng) == (43.79, -79.53)
    assert result.postal_code is None  # no context → no postcode recovered


@pytest.mark.asyncio
async def test_postcode_recovered_from_context(monkeypatch):
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    feature = {
        "center": [-79.44, 43.66],
        "context": [
            {"id": "postcode.123", "text": "M6H 0E6"},
            {"id": "place.456", "text": "Toronto"},
        ],
    }
    http = _mock_http_client(features=[feature])
    with _patch_http(http):
        result = await mapbox_service.geocode_address("950 Lansdowne Ave, Toronto, ON")
    assert result is not None
    assert result.postal_code == "M6H0E6"  # space stripped, uppercased


@pytest.mark.asyncio
async def test_empty_features_list_returns_none(monkeypatch):
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    http = _mock_http_client(features=[])
    with _patch_http(http):
        result = await mapbox_service.geocode_address("5 Buttermill Ave, Vaughan")
    assert result is None


@pytest.mark.asyncio
async def test_missing_features_key_returns_none(monkeypatch):
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = {}  # no "features" key
    http = AsyncMock()
    http.get.return_value = resp
    with _patch_http(http):
        result = await mapbox_service.geocode_address("5 Buttermill Ave, Vaughan")
    assert result is None


@pytest.mark.asyncio
async def test_http_error_returns_none(monkeypatch):
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    http = AsyncMock()
    http.get.side_effect = Exception("connection refused")
    with _patch_http(http):
        result = await mapbox_service.geocode_address("5 Buttermill Ave, Vaughan")
    assert result is None


@pytest.mark.asyncio
async def test_raise_for_status_error_returns_none(monkeypatch):
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    resp = MagicMock()
    resp.raise_for_status.side_effect = Exception("404 Not Found")
    http = AsyncMock()
    http.get.return_value = resp
    with _patch_http(http):
        result = await mapbox_service.geocode_address("5 Buttermill Ave, Vaughan")
    assert result is None


# ── Relevance gate, type/bbox filters, reverse postcode (D-119) ───────────────


@pytest.mark.asyncio
async def test_low_relevance_match_is_discarded(monkeypatch):
    # "South Cedarbrae, Toronto" used to come back as a midtown point at 0.5;
    # that guess became the comp's postal code.
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    http = _mock_http_client(
        features=[
            {
                "center": [-79.39, 43.70],
                "relevance": 0.5,
                "place_type": ["neighborhood"],
            }
        ]
    )
    with _patch_http(http):
        assert await mapbox_service.geocode_address("South Cedarbrae, Toronto") is None
        # The caller can lower the floor when it has reason to.
        result = await mapbox_service.geocode_address(
            "South Cedarbrae, Toronto", min_relevance=0.4
        )
    assert result is not None
    assert result.relevance == 0.5
    assert result.place_type == "neighborhood"


@pytest.mark.asyncio
async def test_types_and_bbox_are_sent_as_mapbox_params(monkeypatch):
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    http = _mock_http_client(
        features=[
            {
                "center": [-79.23, 43.76],
                "relevance": 0.9,
                "place_type": ["neighborhood"],
            }
        ]
    )
    with _patch_http(http):
        await mapbox_service.geocode_address(
            "Cedarbrae, Toronto, Ontario",
            types="neighborhood,locality",
            bbox=(-79.64, 43.58, -79.11, 43.86),
        )
    params = http.get.call_args.kwargs["params"]
    assert params["types"] == "neighborhood,locality"
    assert params["bbox"] == "-79.64,43.58,-79.11,43.86"
    assert params["country"] == "ca"


@pytest.mark.asyncio
async def test_a_feature_without_relevance_is_treated_as_certain(monkeypatch):
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    http = _mock_http_client(features=[{"center": [-79.53, 43.79]}])
    with _patch_http(http):
        result = await mapbox_service.geocode_address("5 Buttermill Ave, Vaughan")
    assert result is not None and result.relevance == 1.0


@pytest.mark.asyncio
async def test_reverse_postal_code_reads_the_postcode_feature(monkeypatch):
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    http = _mock_http_client(
        features=[{"id": "postcode.123", "text": "M1H 2K3", "center": [-79.23, 43.76]}]
    )
    with _patch_http(http):
        assert await mapbox_service.reverse_postal_code(43.76, -79.23) == "M1H2K3"
    url = http.get.call_args.args[0]
    assert url.startswith(
        "https://api.mapbox.com/geocoding/v5/mapbox.places/-79.23,43.76"
    )
    assert http.get.call_args.kwargs["params"]["types"] == "postcode"


@pytest.mark.asyncio
async def test_reverse_postal_code_is_none_on_failure(monkeypatch):
    monkeypatch.setenv("MAPBOX_TOKEN", "test-token")
    with _patch_http(_mock_http_client(features=[])):
        assert await mapbox_service.reverse_postal_code(43.76, -79.23) is None
