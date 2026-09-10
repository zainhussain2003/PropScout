"""
refresh_rental_comps_geocodes.py
================================
Data-layer sandbox script — Vision / PropScout

PURPOSE
-------
1. Reads stale-geocode rows from rental_comps (via READ-ONLY replica or export).
2. Re-geocodes each address using the configured geocoding provider.
3. Writes a human-reviewable SQL patch file (UPDATE statements) to:
       geocode_refresh/output/patch_rental_comps_geocodes.sql
4. Writes a rollback file (original values) to:
       geocode_refresh/output/rollback_rental_comps_geocodes.sql
5. Does NOT touch the production database. The patch must be approved and
   applied by a human (or through the request_prod_action gate).

USAGE
-----
    python refresh_rental_comps_geocodes.py \
        --input  stale_rows.csv          \   # exported CSV from prod (read-only)
        --output output/                 \
        --provider google|nominatim      \
        --dry-run                            # skips geocoding API calls, uses mock

DEPENDENCIES
------------
    pip install requests python-dotenv tqdm
"""

import argparse
import csv
import json
import logging
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class StaleRow:
    """One rental_comps row with a stale geocode."""
    id: int
    address: str
    city: str
    state: str
    zip_code: str
    old_lat: Optional[float]
    old_lng: Optional[float]

@dataclass
class GeocodedRow:
    stale: StaleRow
    new_lat: Optional[float]
    new_lng: Optional[float]
    provider: str
    confidence: Optional[str] = None
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.new_lat is not None and self.new_lng is not None

# ---------------------------------------------------------------------------
# Geocoding providers
# ---------------------------------------------------------------------------

def geocode_google(address: str, api_key: str) -> dict:
    """Call Google Maps Geocoding API."""
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": address, "key": api_key}
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data["status"] != "OK" or not data["results"]:
        raise ValueError(f"Google geocode status: {data['status']}")
    result = data["results"][0]
    loc = result["geometry"]["location"]
    return {
        "lat": loc["lat"],
        "lng": loc["lng"],
        "confidence": result["geometry"]["location_type"],
    }

def geocode_nominatim(address: str) -> dict:
    """Call OpenStreetMap Nominatim (no API key required; respect rate limit)."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": address, "format": "json", "limit": 1}
    headers = {"User-Agent": "PropScout-GeoRefresh/1.0"}
    resp = requests.get(url, params=params, headers=headers, timeout=10)
    resp.raise_for_status()
    results = resp.json()
    if not results:
        raise ValueError("Nominatim returned no results")
    r = results[0]
    return {
        "lat": float(r["lat"]),
        "lng": float(r["lon"]),
        "confidence": r.get("type"),
    }

def geocode_mock(address: str) -> dict:
    """Deterministic mock for dry-run / CI testing."""
    # Produce a fake but stable coordinate derived from address hash
    h = abs(hash(address))
    lat = 25.0 + (h % 25000) / 1000.0   # 25–50 °N (continental US range)
    lng = -65.0 - (h % 60000) / 1000.0  # -65 – -125 °W
    return {"lat": round(lat, 6), "lng": round(lng, 6), "confidence": "mock"}

# ---------------------------------------------------------------------------
# Core orchestration
# ---------------------------------------------------------------------------

def load_stale_rows(csv_path: Path) -> list[StaleRow]:
    """
    Load stale rows from a CSV export.

    Expected columns (case-insensitive):
        id, address, city, state, zip_code, lat, lng
    """
    rows: list[StaleRow] = []
    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        # Normalise header case
        reader.fieldnames = [f.strip().lower() for f in reader.fieldnames]
        for line in reader:
            rows.append(StaleRow(
                id=int(line["id"]),
                address=line["address"].strip(),
                city=line["city"].strip(),
                state=line["state"].strip(),
                zip_code=line.get("zip_code", line.get("zip", "")).strip(),
                old_lat=float(line["lat"]) if line.get("lat") else None,
                old_lng=float(line["lng"]) if line.get("lng") else None,
            ))
    log.info("Loaded %d stale rows from %s", len(rows), csv_path)
    return rows


def geocode_rows(
    rows: list[StaleRow],
    provider: str,
    api_key: Optional[str],
    dry_run: bool,
    rate_limit_secs: float = 0.1,
) -> list[GeocodedRow]:
    """Geocode each row, respecting rate limits."""
    results: list[GeocodedRow] = []
    for i, row in enumerate(rows, 1):
        full_address = f"{row.address}, {row.city}, {row.state} {row.zip_code}"
        try:
            if dry_run:
                geo = geocode_mock(full_address)
            elif provider == "google":
                if not api_key:
                    raise EnvironmentError("GOOGLE_GEOCODE_API_KEY not set")
                geo = geocode_google(full_address, api_key)
            elif provider == "nominatim":
                geo = geocode_nominatim(full_address)
            else:
                raise ValueError(f"Unknown provider: {provider}")

            results.append(GeocodedRow(
                stale=row,
                new_lat=round(geo["lat"], 7),
                new_lng=round(geo["lng"], 7),
                provider=provider if not dry_run else "mock",
                confidence=geo.get("confidence"),
            ))
            if i % 50 == 0:
                log.info("  Geocoded %d / %d rows …", i, len(rows))
        except Exception as exc:
            log.warning("Row id=%d failed: %s", row.id, exc)
            results.append(GeocodedRow(
                stale=row,
                new_lat=None,
                new_lng=None,
                provider=provider,
                error=str(exc),
            ))
        time.sleep(rate_limit_secs)
    return results


def write_sql_patch(geocoded: list[GeocodedRow], out_dir: Path, run_ts: str) -> Path:
    """
    Write an auditable UPDATE patch file.
    Only rows where geocoding succeeded are included.
    """
    successes = [g for g in geocoded if g.success]
    patch_path = out_dir / "patch_rental_comps_geocodes.sql"

    with open(patch_path, "w", encoding="utf-8") as fh:
        fh.write(f"-- PropScout geocode-refresh patch\n")
        fh.write(f"-- Generated : {run_ts}\n")
        fh.write(f"-- Rows      : {len(successes)} (of {len(geocoded)} attempted)\n")
        fh.write(f"-- REVIEW THIS FILE BEFORE APPLYING TO PRODUCTION\n\n")
        fh.write("BEGIN;\n\n")

        for g in successes:
            fh.write(
                f"UPDATE rental_comps\n"
                f"   SET lat            = {g.new_lat},\n"
                f"       lng            = {g.new_lng},\n"
                f"       geocode_source  = '{g.provider}',\n"
                f"       geocode_updated = NOW()\n"
                f" WHERE id = {g.stale.id};\n"
                f"  -- was: lat={g.stale.old_lat}, lng={g.stale.old_lng}"
                f"  confidence={g.confidence}\n\n"
            )

        fh.write("COMMIT;\n")

    log.info("Patch SQL written → %s (%d rows)", patch_path, len(successes))
    return patch_path


def write_rollback_sql(geocoded: list[GeocodedRow], out_dir: Path, run_ts: str) -> Path:
    """
    Write a rollback file restoring original lat/lng for every patched row.
    """
    successes = [g for g in geocoded if g.success]
    rollback_path = out_dir / "rollback_rental_comps_geocodes.sql"

    with open(rollback_path, "w", encoding="utf-8") as fh:
        fh.write(f"-- PropScout geocode-refresh ROLLBACK\n")
        fh.write(f"-- Generated : {run_ts}\n")
        fh.write(f"-- Apply this file to UNDO the patch\n\n")
        fh.write("BEGIN;\n\n")

        for g in successes:
            old_lat = g.stale.old_lat if g.stale.old_lat is not None else "NULL"
            old_lng = g.stale.old_lng if g.stale.old_lng is not None else "NULL"
            fh.write(
                f"UPDATE rental_comps\n"
                f"   SET lat = {old_lat},\n"
                f"       lng = {old_lng}\n"
                f" WHERE id = {g.stale.id};\n\n"
            )

        fh.write("COMMIT;\n")

    log.info("Rollback SQL written → %s", rollback_path)
    return rollback_path


def write_error_report(geocoded: list[GeocodedRow], out_dir: Path) -> Path:
    """Write a JSON report of failed rows for manual follow-up."""
    failures = [g for g in geocoded if not g.success]
    report_path = out_dir / "geocode_errors.json"

    payload = [
        {
            "id": g.stale.id,
            "address": g.stale.address,
            "city": g.stale.city,
            "state": g.stale.state,
            "zip_code": g.stale.zip_code,
            "error": g.error,
        }
        for g in failures
    ]

    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)

    if failures:
        log.warning("%d rows failed geocoding — see %s", len(failures), report_path)
    else:
        log.info("All rows geocoded successfully.")
    return report_path


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Refresh stale geocodes for rental_comps.")
    parser.add_argument("--input",    required=True,  help="CSV of stale rows exported from prod")
    parser.add_argument("--output",   default="output", help="Output directory (default: output/)")
    parser.add_argument("--provider", default="google", choices=["google", "nominatim"],
                        help="Geocoding provider (default: google)")
    parser.add_argument("--dry-run",  action="store_true",
                        help="Skip real API calls; use mock geocoder (for testing)")
    args = parser.parse_args()

    run_ts = datetime.now(timezone.utc).isoformat()
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    api_key = os.getenv("GOOGLE_GEOCODE_API_KEY") if args.provider == "google" else None

    log.info("=== PropScout Geocode Refresh ===")
    log.info("Provider : %s%s", args.provider, " (DRY-RUN)" if args.dry_run else "")
    log.info("Input    : %s", args.input)
    log.info("Output   : %s", out_dir.resolve())

    stale_rows = load_stale_rows(Path(args.input))
    geocoded   = geocode_rows(stale_rows, args.provider, api_key, args.dry_run)

    patch_path    = write_sql_patch(geocoded, out_dir, run_ts)
    rollback_path = write_rollback_sql(geocoded, out_dir, run_ts)
    error_path    = write_error_report(geocoded, out_dir)

    successes = sum(1 for g in geocoded if g.success)
    failures  = len(geocoded) - successes

    print("\n=== Summary ===")
    print(f"  Total rows   : {len(geocoded)}")
    print(f"  Geocoded OK  : {successes}")
    print(f"  Failed       : {failures}")
    print(f"  Patch SQL    : {patch_path}")
    print(f"  Rollback SQL : {rollback_path}")
    print(f"  Error report : {error_path}")
    print("\nNext step: have a human review the patch SQL, then submit via")
    print("           request_prod_action for production approval.")


if __name__ == "__main__":
    main()
