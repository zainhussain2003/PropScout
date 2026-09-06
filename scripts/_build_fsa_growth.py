"""Merge 5-year population growth per FSA into statscan-raw/fsa_stats.csv.

Why this exists
---------------
`_build_fsa_stats.py` reads the 2021 Census Profile for FSAs (98-401-X2021013)
and was written to pull two characteristics: median household income (ID 243)
and "Population percentage change, 2016 to 2021" (ID 3). Income loads fine.
**Growth does not** — that profile leaves characteristics 2 and 3 blank at the
FSA level; only the 2021 population is published there. So `pop_growth_5y` was
null for all 1,646 rows and the report's "5-year pop. growth" tile showed "—".

The growth figure therefore has to be computed from two population counts:

  2021 — StatsCan WDS table 98-10-0019, "Population and dwelling counts:
         Canada and forward sortation areas". A 125 KB zip. 1,646 FSAs.
  2016 — 2016 Census Profile for FSAs, 98-401-X2016046. A 49 MB zip holding a
         317 MB CSV, streamed rather than extracted. Member ID 1 is
         "Population, 2016"; the value is in the "Total - Sex" column.

growth = (pop2021 - pop2016) / pop2016, rounded to 4 dp, matching the decimal
convention `load-neighbourhood-stats.mjs` expects (0.038 = 3.8%).

Nothing is invented: an FSA missing from either census, or carrying a suppressed
value (F, x, .., ...), is left blank and renders as an honest "—".

Usage
-----
    python scripts/_build_fsa_growth.py <2016-fsa-profile.zip> <98100019.zip>

Then load with:
    node scripts/load-neighbourhood-stats.mjs statscan-raw/fsa_stats.csv

Downloads (neither file is committed; statscan-raw/ is gitignored):
    98-10-0019 (2021):
      curl -s https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/98100019/en
      -> returns a JSON {"object": "<zip url>"}
    98-401-X2016046 (2016):
      https://www12.statcan.gc.ca/census-recensement/2016/dp-pd/prof/details/
      download-telecharger/comp/GetFile.cfm?Lang=E&FILETYPE=CSV&GEONO=046
"""

import csv
import io
import json
import re
import sys
import zipfile

STATS_CSV = "statscan-raw/fsa_stats.csv"
FSA_RE = re.compile(r"^[A-Z]\d[A-Z]$")
SUPPRESSED = {"", "F", "x", "X", "..", "...", "n/a", "N/A"}

# Census Profile: "Population, 2016" is Member ID 1; its value sits in the
# "Total - Sex" column (index 11).
MEMBER_ID_POPULATION = "1"
MEMBER_ID_COL = 9
GEO_NAME_COL = 3
VALUE_COL = 11


def _to_int(raw: str) -> int | None:
    """Parse a census count, returning None for suppressed or unparseable values."""
    v = (raw or "").strip()
    if v in SUPPRESSED:
        return None
    try:
        return int(float(v.replace(",", "")))
    except ValueError:
        return None


def read_pop_2016(zip_path: str) -> dict[str, int]:
    """
    Stream 2016 populations per FSA out of the 2016 Census Profile zip.

    The inner CSV is ~317 MB, so it is read through the zip rather than
    extracted — the original load ran on a machine with 2.9 GB free.

    Args:
        zip_path: Path to 98-401-X2016046_English_CSV_data.zip.

    Returns:
        {FSA: population_2016} for every FSA with an unsuppressed count.
    """
    out: dict[str, int] = {}
    z = zipfile.ZipFile(zip_path)
    name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
    with z.open(name) as fh:
        reader = csv.reader(
            io.TextIOWrapper(fh, encoding="utf-8-sig", errors="replace")
        )
        next(reader, None)
        for row in reader:
            if (
                len(row) <= VALUE_COL
                or row[MEMBER_ID_COL].strip() != MEMBER_ID_POPULATION
            ):
                continue
            fsa = row[GEO_NAME_COL].strip().upper()
            if not FSA_RE.match(fsa):
                continue
            pop = _to_int(row[VALUE_COL])
            if pop is not None:
                out[fsa] = pop
    return out


def read_pop_2021(zip_path: str) -> dict[str, int]:
    """
    Read 2021 populations per FSA from StatsCan WDS table 98-10-0019.

    Args:
        zip_path: Path to 98100019-eng.zip.

    Returns:
        {FSA: population_2021} for every FSA with an unsuppressed count.
    """
    out: dict[str, int] = {}
    z = zipfile.ZipFile(zip_path)
    name = next(
        n
        for n in z.namelist()
        if n.lower().endswith(".csv") and "meta" not in n.lower()
    )
    reader = csv.DictReader(
        io.StringIO(z.read(name).decode("utf-8-sig", errors="replace"))
    )
    pop_col = next(c for c in (reader.fieldnames or []) if "Population, 2021" in c)
    for row in reader:
        fsa = (row.get("GEO") or "").strip().upper()
        if not FSA_RE.match(fsa):
            continue
        pop = _to_int(row.get(pop_col, ""))
        if pop is not None:
            out[fsa] = pop
    return out


def compute_growth(pop16: dict[str, int], pop21: dict[str, int]) -> dict[str, float]:
    """
    Five-year population change as a decimal, for FSAs present in both censuses.

    Args:
        pop16: {FSA: population_2016}
        pop21: {FSA: population_2021}

    Returns:
        {FSA: growth} where growth is e.g. 0.038 for +3.8%.
    """
    growth: dict[str, float] = {}
    for fsa in sorted(set(pop16) & set(pop21)):
        before = pop16[fsa]
        if before <= 0:
            continue
        growth[fsa] = round((pop21[fsa] - before) / before, 4)
    return growth


def merge_into_stats_csv(growth: dict[str, float]) -> tuple[int, int]:
    """
    Write pop_growth_5y into the existing fsa_stats.csv, preserving median_income.

    FSAs present in the growth data but absent from the income file are appended,
    so the output is not silently narrower than its sources.

    Args:
        growth: {FSA: growth decimal}

    Returns:
        (rows_written, rows_with_growth)
    """
    with open(STATS_CSV, encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    for row in rows:
        g = growth.get(row["fsa"].strip().upper())
        if g is not None:
            row["pop_growth_5y"] = f"{g}"

    seen = {r["fsa"].strip().upper() for r in rows}
    for fsa, g in sorted(growth.items()):
        if fsa not in seen:
            rows.append(
                {
                    "fsa": fsa,
                    "median_income": "",
                    "pop_growth_5y": f"{g}",
                    "data_year": "2021",
                }
            )

    rows.sort(key=lambda r: r["fsa"])
    with open(STATS_CSV, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh, fieldnames=["fsa", "median_income", "pop_growth_5y", "data_year"]
        )
        writer.writeheader()
        writer.writerows(rows)

    with_growth = sum(1 for r in rows if (r["pop_growth_5y"] or "").strip())
    return len(rows), with_growth


def main() -> None:
    """Entry point — see module docstring for arguments and data sources."""
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    pop16 = read_pop_2016(sys.argv[1])
    pop21 = read_pop_2021(sys.argv[2])
    growth = compute_growth(pop16, pop21)

    print(f"2016 FSA populations : {len(pop16)}")
    print(f"2021 FSA populations : {len(pop21)}")
    print(f"growth computed      : {len(growth)}")
    print(f"  of which Ontario   : {sum(1 for f in growth if f[0] in 'KLMNP')}")

    total, with_growth = merge_into_stats_csv(growth)
    print(f"{STATS_CSV}: {total} rows, {with_growth} with pop_growth_5y")

    # A few spot checks so a bad parse is visible rather than silently loaded.
    for fsa in ("M5V", "L4K", "L5A", "M3H"):
        if fsa in growth:
            print(
                f"  {fsa}: {pop16[fsa]:>7,} -> {pop21[fsa]:>7,}  "
                f"{growth[fsa] * 100:+.1f}%"
            )

    with open("statscan-raw/fsa_growth.json", "w", encoding="utf-8") as fh:
        json.dump(growth, fh)


if __name__ == "__main__":
    main()
