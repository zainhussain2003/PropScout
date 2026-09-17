"""
Build services/scrapers/data/toronto_neighbourhoods.json from the City of
Toronto's open "Neighbourhoods" dataset (158 areas, 2021 revision) — D-119.

Kijiji labels every Toronto ad with one of these names and nothing else
locatable, so the scraper places the ad at the neighbourhood's centroid and
takes the postal code there. Mapbox does not know most of the names; asked
to geocode "South Cedarbrae, Toronto" it answered with midtown.

Source: https://open.toronto.ca/dataset/neighbourhoods/ (Open Government
Licence – Toronto). The centroid is the area-weighted centroid of the largest
polygon; the postal code is Mapbox's reverse geocode of that point (one call
per neighbourhood, at build time only — the scraper never calls Mapbox for a
matched neighbourhood).

Run from the repo root with MAPBOX_TOKEN in the environment (the root .env):

    python scripts/_build_toronto_neighbourhoods.py

Re-run when the City revises the boundaries.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

PACKAGE_URL = (
    "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_show"
    "?id=neighbourhoods"
)
# The 2021 revision (158) plus the 2016 set (140) it replaced: Kijiji labels
# ads with names from both ("Mount Pleasant West" is a 2016 name).
RESOURCES = [
    ("Neighbourhoods - 4326.geojson", 2021),
    ("Neighbourhoods - historical 140 - 4326.geojson", 2016),
]
OUT = (
    Path(__file__).resolve().parents[1]
    / "services/scrapers/data/toronto_neighbourhoods.json"
)
REVERSE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json"


def _fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=120) as resp:  # noqa: S310 — fixed hosts
        return json.load(resp)


def _largest_ring(geometry: dict) -> list[list[float]]:
    """Outer ring of the largest polygon, by absolute shoelace area."""
    polys = (
        geometry["coordinates"]
        if geometry["type"] == "MultiPolygon"
        else [geometry["coordinates"]]
    )
    best: list[list[float]] = []
    best_area = -1.0
    for poly in polys:
        ring = poly[0]
        area = abs(_signed_area(ring))
        if area > best_area:
            best, best_area = ring, area
    return best


def _signed_area(ring: list[list[float]]) -> float:
    a = 0.0
    for i in range(len(ring) - 1):
        x0, y0 = ring[i][:2]
        x1, y1 = ring[i + 1][:2]
        a += x0 * y1 - x1 * y0
    return a / 2


def _centroid(ring: list[list[float]]) -> tuple[float, float]:
    """Area-weighted polygon centroid (lng, lat) of a closed ring."""
    a = _signed_area(ring)
    if a == 0:
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return sum(xs) / len(xs), sum(ys) / len(ys)
    cx = cy = 0.0
    for i in range(len(ring) - 1):
        x0, y0 = ring[i][:2]
        x1, y1 = ring[i + 1][:2]
        cross = x0 * y1 - x1 * y0
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    return cx / (6 * a), cy / (6 * a)


def _reverse_postal(lat: float, lng: float, token: str) -> str | None:
    url = (
        REVERSE_URL.format(lng=lng, lat=lat)
        + "?"
        + urllib.parse.urlencode(
            {"access_token": token, "types": "postcode", "country": "ca", "limit": 1}
        )
    )
    data = _fetch_json(url)
    features = data.get("features") or []
    if not features:
        return None
    text = features[0].get("text") or ""
    code = text.replace(" ", "").upper()
    return code if len(code) == 6 else None


def main() -> int:
    token = os.environ.get("MAPBOX_TOKEN")
    if not token:
        print("MAPBOX_TOKEN not set", file=sys.stderr)
        return 1

    package = _fetch_json(PACKAGE_URL)["result"]
    rows: list[dict[str, object]] = []
    seen: set[str] = set()
    for resource_name, revision in RESOURCES:
        resource = next(r for r in package["resources"] if r["name"] == resource_name)
        geo = _fetch_json(resource["url"])
        for feature in geo["features"]:
            props = feature["properties"]
            name = str(props["AREA_NAME"]).strip()
            # The 2016 file spells names as "Name (code)".
            if name.endswith(")") and "(" in name:
                name = name[: name.rindex("(")].strip()
            if name in seen:
                continue  # the 2021 set wins where a name survived unchanged
            seen.add(name)
            ring = _largest_ring(feature["geometry"])
            lng, lat = _centroid(ring)
            postal = _reverse_postal(lat, lng, token)
            rows.append(
                {
                    "name": name,
                    "code": int(props["AREA_SHORT_CODE"]),
                    "revision": revision,
                    "lat": round(lat, 5),
                    "lng": round(lng, 5),
                    "postal_code": postal,
                }
            )
            time.sleep(0.15)  # polite to the geocoder
            print(f"{revision} {name:45s} {lat:.5f} {lng:.5f} {postal}")

    rows.sort(key=lambda r: str(r["name"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "source": (
                    "City of Toronto Open Data — Neighbourhoods (158, 2021 revision) "
                    "+ the 2016 set of 140 it replaced"
                ),
                "source_url": "https://open.toronto.ca/dataset/neighbourhoods/",
                "licence": "Open Government Licence – Toronto",
                "built_at": time.strftime("%Y-%m-%d"),
                "postal_code_method": "Mapbox reverse geocode of the area-weighted centroid",
                "neighbourhoods": rows,
            },
            indent=1,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    missing = [r["name"] for r in rows if r["postal_code"] is None]
    print(f"\nwrote {len(rows)} neighbourhoods to {OUT}")
    print(f"{len(missing)} without a postal code: {missing}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
