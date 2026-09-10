"""
Build school-data/schools.csv from the Ontario Ministry SIF backbone.

Source: data.ontario.ca "School information and student demographics"
        (2025-26 preliminary edition, English) — real public data.

Every value traces to the source spreadsheet. Nothing is invented:
  - name, address, postal_code, lat, lng, board  -> SIF columns
  - school_type  -> SIF "School Level" (Elementary->elementary, Secondary->high)
  - eqao_score   -> mean of the SIF's own EQAO provincial-standard percentages
                    (Grade 3/6 reading/writing/math for elementary;
                     Grade 9 math + Grade 10 OSSLT for secondary), x100, 1 dp.
                    Blank when no components are reported (NA/N/D/N/R).
  - fraser_rank_pct -> BLANK (Fraser API is AES-encrypted; not scraped)
  - graduation_rate -> BLANK (no clean per-school source on data.ontario.ca)
  - data_year -> 2025 (SIF 2024-25 preliminary edition)

Rows with no postal/address (planned/future schools) -> unmatched.csv.
"""

import csv
import openpyxl
from pathlib import Path

RAW = Path("school-data-raw/backbone_2025_26_prelim.xlsx")
OUT = Path("school-data/schools.csv")
UNMATCHED = Path("school-data/unmatched.csv")
DATA_YEAR = 2025

# 0-based column indices in the SIF sheet
C_BOARD_NAME = 1
C_NAME = 4
C_LEVEL = 7
C_STREET = 12
C_CITY = 14
C_POSTAL = 16
C_LAT = 22
C_LNG = 23
# EQAO provincial-standard achievement columns
ELEM_EQAO = [30, 32, 34, 36, 38, 40]  # G3 r/w/m, G6 r/w/m
SEC_EQAO = [42, 44]  # G9 math, G10 OSSLT

HEADERS = [
    "name",
    "school_type",
    "address",
    "postal_code",
    "lat",
    "lng",
    "eqao_score",
    "fraser_rank_pct",
    "graduation_rate",
    "board",
    "data_year",
]

NON_NUMERIC = {"", "none", "na", "n/d", "n/r", "n/a"}


def is_blank(v) -> bool:
    return v is None or str(v).strip().lower() in NON_NUMERIC


def num(v):
    """Return float or None. SIF stores '.' as a placeholder for missing coords."""
    if v is None:
        return None
    s = str(v).strip()
    if s in ("", ".", "None"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def eqao_composite(row, cols) -> str:
    vals = []
    for c in cols:
        v = row[c]
        if not is_blank(v):
            try:
                vals.append(float(v))
            except (TypeError, ValueError):
                pass
    if not vals:
        return ""
    # SIF stores fractions (0.86 = 86%). Store a 0-100 composite, 1 dp.
    return f"{round(sum(vals) / len(vals) * 100, 1)}"


def normalize_postal(v) -> str:
    if is_blank(v):
        return ""
    return str(v).replace(" ", "").upper()[:6]


def main():
    wb = openpyxl.load_workbook(RAW, read_only=True)
    ws = wb[wb.sheetnames[0]]
    it = ws.iter_rows(values_only=True)
    next(it)  # header

    written = []
    unmatched = []
    stats = {
        "source_rows": 0,
        "elementary": 0,
        "high": 0,
        "eqao_filled": 0,
        "unmatched": 0,
        "non_ontario": 0,
    }

    for row in it:
        name = row[C_NAME]
        if name is None:
            continue
        name = str(name).strip()
        stats["source_rows"] += 1

        postal = normalize_postal(row[C_POSTAL])
        lat = num(row[C_LAT])
        lng = num(row[C_LNG])
        level = str(row[C_LEVEL] or "").strip()
        school_type = (
            "elementary"
            if level == "Elementary"
            else ("high" if level == "Secondary" else "")
        )

        # No location -> cannot place on a map; log and skip (never blank coords).
        if not postal or lat is None or lng is None:
            unmatched.append(
                [name, level, "no postal/coords in source (planned or program)"]
            )
            stats["unmatched"] += 1
            continue

        # Ontario only.
        if postal[0] not in "KLMNP":
            unmatched.append([name, level, f"non-Ontario postal {postal}"])
            stats["non_ontario"] += 1
            continue

        eqao = eqao_composite(row, ELEM_EQAO if level == "Elementary" else SEC_EQAO)
        if eqao:
            stats["eqao_filled"] += 1

        street = "" if is_blank(row[C_STREET]) else str(row[C_STREET]).strip()
        city = "" if is_blank(row[C_CITY]) else str(row[C_CITY]).strip()
        address = ", ".join([p for p in (street, city, "ON") if p])

        board = "" if is_blank(row[C_BOARD_NAME]) else str(row[C_BOARD_NAME]).strip()

        if school_type == "elementary":
            stats["elementary"] += 1
        elif school_type == "high":
            stats["high"] += 1

        written.append(
            [
                name,
                school_type,
                address,
                postal,
                f"{lat}",
                f"{lng}",
                eqao,
                "",
                "",
                board,
                str(DATA_YEAR),
                level,  # level kept for disambiguation
            ]
        )

    wb.close()

    # Disambiguate K-12 combined schools: same (name, postal) across both panels
    # would collide on the upsert key. Suffix the panel so both rows survive.
    import collections as _c

    key_count = _c.Counter((r[0].lower(), r[3]) for r in written)
    disambiguated = 0
    for r in written:
        if key_count[(r[0].lower(), r[3])] > 1:
            r[0] = f"{r[0]} ({r[11]})"  # append SIF level, e.g. "(Elementary)"
            disambiguated += 1
    for r in written:
        r.pop()  # drop the temporary level column before writing

    OUT.parent.mkdir(exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(HEADERS)
        w.writerows(written)

    with UNMATCHED.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["name", "level", "reason"])
        w.writerows(unmatched)

    print("=== BUILD SUMMARY ===")
    print(f"source rows (backbone):   {stats['source_rows']}")
    print(f"written to schools.csv:   {len(written)}")
    print(f"  elementary:             {stats['elementary']}")
    print(f"  high (secondary):       {stats['high']}")
    print(
        f"  eqao_score filled:      {stats['eqao_filled']} "
        f"({round(100 * stats['eqao_filled'] / len(written), 1)}%)"
    )
    print("  fraser_rank_pct filled: 0 (source encrypted - blank by design)")
    print("  graduation_rate filled: 0 (no clean source - blank by design)")
    print(f"unmatched (-> unmatched.csv): {stats['unmatched'] + stats['non_ontario']}")
    print(f"  no postal/coords:       {stats['unmatched']}")
    print(f"  non-Ontario postal:     {stats['non_ontario']}")
    remaining = _c.Counter((r[0].lower(), r[3]) for r in written)
    still_dup = sum(1 for c in remaining.values() if c > 1)
    print(f"K-12 combined rows disambiguated: {disambiguated}")
    print(f"remaining duplicate (name,postal) keys: {still_dup}")


if __name__ == "__main__":
    main()
