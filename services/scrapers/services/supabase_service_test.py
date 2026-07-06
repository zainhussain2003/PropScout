"""Unit tests for supabase_service — Supabase client mocked throughout."""
import pytest
from unittest.mock import MagicMock, patch

import services.supabase_service as supabase_service
from normalization import CleanRentalListing


def _listing(address: str = "5 Buttermill Ave, Vaughan") -> CleanRentalListing:
    return CleanRentalListing(
        source="rentals_ca",
        source_url="https://example.com/x",
        address=address,
        postal_code="L4K5W4",
        beds=2,
        baths=None,
        rent_monthly=2150,
        sqft=None,
        listed_at=None,
    )


@pytest.fixture(autouse=True)
def reset_cached_client():
    original = supabase_service._client
    supabase_service._client = None
    yield
    supabase_service._client = original


# ── get_client ────────────────────────────────────────────────────────────────

def test_get_client_raises_if_url_missing(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    with pytest.raises(RuntimeError, match="SUPABASE_URL"):
        supabase_service.get_client()


def test_get_client_raises_if_key_missing(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    with pytest.raises(RuntimeError):
        supabase_service.get_client()


def test_get_client_creates_client_from_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-key")
    mock_client = MagicMock()
    with patch("services.supabase_service.create_client", return_value=mock_client) as mock_create:
        client = supabase_service.get_client()
    mock_create.assert_called_once_with("https://test.supabase.co", "test-key")
    assert client is mock_client


# ── fetch_recent_dedupe_keys ──────────────────────────────────────────────────

def test_fetch_returns_address_rent_beds_tuples():
    mock_client = MagicMock()
    supabase_service._client = mock_client
    mock_client.table.return_value.select.return_value.gte.return_value.execute.return_value = MagicMock(
        data=[
            {"address": "5 Buttermill Ave, Vaughan", "rent_monthly": 2150, "beds": 2},
            {"address": "10 Main St, Toronto", "rent_monthly": 1800, "beds": None},
        ]
    )
    result = supabase_service.fetch_recent_dedupe_keys()
    assert result == [
        ("5 Buttermill Ave, Vaughan", 2150, 2),
        ("10 Main St, Toronto", 1800, None),
    ]


def test_fetch_returns_empty_list_on_db_error():
    mock_client = MagicMock()
    supabase_service._client = mock_client
    mock_client.table.return_value.select.return_value.gte.return_value.execute.side_effect = (
        RuntimeError("DB unavailable")
    )
    result = supabase_service.fetch_recent_dedupe_keys()
    assert result == []


def test_fetch_returns_empty_list_when_no_rows():
    mock_client = MagicMock()
    supabase_service._client = mock_client
    mock_client.table.return_value.select.return_value.gte.return_value.execute.return_value = MagicMock(
        data=[]
    )
    result = supabase_service.fetch_recent_dedupe_keys()
    assert result == []


# ── insert_rental_listings ────────────────────────────────────────────────────

def test_insert_empty_list_returns_zero_without_calling_supabase():
    mock_client = MagicMock()
    supabase_service._client = mock_client
    result = supabase_service.insert_rental_listings([])
    assert result == 0
    mock_client.table.assert_not_called()


def test_insert_returns_count_of_inserted_rows():
    mock_client = MagicMock()
    supabase_service._client = mock_client
    mock_client.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{}, {}]
    )
    result = supabase_service.insert_rental_listings([_listing(), _listing("10 Main St")])
    assert result == 2


def test_insert_returns_zero_on_supabase_error():
    mock_client = MagicMock()
    supabase_service._client = mock_client
    mock_client.table.return_value.insert.return_value.execute.side_effect = RuntimeError(
        "insert failed"
    )
    result = supabase_service.insert_rental_listings([_listing()])
    assert result == 0
