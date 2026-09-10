"""
Tests for refresh_rental_comps_geocodes.py (dry-run / unit level).
No network calls, no production database access.
"""

import csv
import json
import sys
import tempfile
from pathlib import Path

import pytest

# Make the script importable
sys.path.insert(0, str(Path(__file__).parent))
from refresh_rental_comps_geocodes import (
    StaleRow,
    GeocodedRow,
    geocode_mock,
    load_stale_rows,
    geocode_rows,
    write_sql_patch,
    write_rollback_sql,
    write_error_report,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_ROWS = [
    StaleRow(1001, "123 Main St", "Austin",   "TX", "78701", 30.999, -97.999),
    StaleRow(1002, "456 Oak Ave", "Denver",   "CO", "80203", 39.111, -104.11),
    StaleRow(1003, "789 Pine Rd", "Miami",    "FL", "33101", None,   None),
]

@pytest.fixture
def sample_csv(tmp_path: Path) -> Path:
    path = tmp_path / "stale_rows.csv"
    with open(path, "w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=["id","address","city","state","zip_code","lat","lng"])
        writer.writeheader()
        for r in SAMPLE_ROWS:
            writer.writerow({
                "id": r.id, "address": r.address, "city": r.city,
                "state": r.state, "zip_code": r.zip_code,
                "lat": r.old_lat or "", "lng": r.old_lng or "",
            })
    return path

# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

class TestGeocodeMock:
    def test_returns_valid_coords(self):
        geo = geocode_mock("123 Main St, Austin, TX 78701")
        assert -90 <= geo["lat"] <= 90
        assert -180 <= geo["lng"] <= 180

    def test_deterministic(self):
        addr = "456 Oak Ave, Denver, CO 80203"
        assert geocode_mock(addr) == geocode_mock(addr)

    def test_confidence_is_mock(self):
        geo = geocode_mock("any address")
        assert geo["confidence"] == "mock"


class TestLoadStaleRows:
    def test_loads_all_rows(self, sample_csv):
        rows = load_stale_rows(sample_csv)
        assert len(rows) == len(SAMPLE_ROWS)

    def test_parses_fields_correctly(self, sample_csv):
        rows = load_stale_rows(sample_csv)
        assert rows[0].id == 1001
        assert rows[0].address == "123 Main St"
        assert rows[0].state == "TX"
        assert rows[0].old_lat == pytest.approx(30.999)

    def test_null_lat_lng_parsed_as_none(self, sample_csv):
        rows = load_stale_rows(sample_csv)
        null_row = next(r for r in rows if r.id == 1003)
        assert null_row.old_lat is None
        assert null_row.old_lng is None


class TestGeocodeRows:
    def test_all_succeed_in_dry_run(self):
        results = geocode_rows(SAMPLE_ROWS, "google", None, dry_run=True, rate_limit_secs=0)
        assert all(r.success for r in results)
        assert len(results) == len(SAMPLE_ROWS)

    def test_provider_is_mock_in_dry_run(self):
        results = geocode_rows(SAMPLE_ROWS[:1], "google", None, dry_run=True, rate_limit_secs=0)
        assert results[0].provider == "mock"

    def test_coordinates_rounded_to_7dp(self):
        results = geocode_rows(SAMPLE_ROWS[:1], "google", None, dry_run=True, rate_limit_secs=0)
        lat_str = str(results[0].new_lat)
        # At most 7 decimal places
        if "." in lat_str:
            assert len(lat_str.split(".")[1]) <= 7


class TestWriteSqlPatch:
    def test_patch_contains_update_statements(self, tmp_path):
        geocoded = geocode_rows(SAMPLE_ROWS, "google", None, dry_run=True, rate_limit_secs=0)
        patch = write_sql_patch(geocoded, tmp_path, "2025-01-01T00:00:00Z")
        content = patch.read_text()
        assert "BEGIN;" in content
        assert "COMMIT;" in content
        for row in SAMPLE_ROWS:
            assert f"WHERE id = {row.id}" in content

    def test_patch_contains_old_coords_as_comment(self, tmp_path):
        geocoded = geocode_rows(SAMPLE_ROWS[:1], "google", None, dry_run=True, rate_limit_secs=0)
        patch = write_sql_patch(geocoded, tmp_path, "2025-01-01T00:00:00Z")
        content = patch.read_text()
        assert "was:" in content   # rollback comment present

    def test_failed_rows_excluded_from_patch(self, tmp_path):
        geocoded = [
            GeocodedRow(stale=SAMPLE_ROWS[0], new_lat=30.1, new_lng=-97.1, provider="mock"),
            GeocodedRow(stale=SAMPLE_ROWS[1], new_lat=None, new_lng=None,  provider="mock", error="timeout"),
        ]
        patch = write_sql_patch(geocoded, tmp_path, "2025-01-01T00:00:00Z")
        content = patch.read_text()
        assert f"WHERE id = {SAMPLE_ROWS[0].id}" in content
        assert f"WHERE id = {SAMPLE_ROWS[1].id}" not in content


class TestWriteRollbackSql:
    def test_rollback_restores_original_values(self, tmp_path):
        geocoded = geocode_rows(SAMPLE_ROWS[:2], "google", None, dry_run=True, rate_limit_secs=0)
        rollback = write_rollback_sql(geocoded, tmp_path, "2025-01-01T00:00:00Z")
        content = rollback.read_text()
        # Row 1001 had old_lat=30.999 — must appear in rollback
        assert "30.999" in content

    def test_null_old_coords_written_as_NULL(self, tmp_path):
        geocoded = geocode_rows(SAMPLE_ROWS, "google", None, dry_run=True, rate_limit_secs=0)
        rollback = write_rollback_sql(geocoded, tmp_path, "2025-01-01T00:00:00Z")
        content = rollback.read_text()
        assert "NULL" in content   # row 1003 had no old coords


class TestWriteErrorReport:
    def test_empty_when_all_succeed(self, tmp_path):
        geocoded = geocode_rows(SAMPLE_ROWS, "google", None, dry_run=True, rate_limit_secs=0)
        report = write_error_report(geocoded, tmp_path)
        data = json.loads(report.read_text())
        assert data == []

    def test_captures_failed_rows(self, tmp_path):
        geocoded = [
            GeocodedRow(stale=SAMPLE_ROWS[0], new_lat=None, new_lng=None, provider="google", error="API error 429"),
        ]
        report = write_error_report(geocoded, tmp_path)
        data = json.loads(report.read_text())
        assert len(data) == 1
        assert data[0]["id"] == 1001
        assert "429" in data[0]["error"]
