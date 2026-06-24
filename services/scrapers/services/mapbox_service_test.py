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
