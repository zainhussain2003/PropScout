# Private MLS® HPI development testing

Owner request: 2026-10-05. This feature is default OFF and is not part of the
public beta. It does not feed property FMV, rental estimates, scoring or verdicts.

## Source and privacy

Use only [CREA's official HPI tool](https://www.crea.ca/housing-market-stats/mls-home-price-index/hpi-tool/).
The download requires accepting CREA's terms. The terms distinguish reference
analysis from publication/distribution; real values must stay private. Do not
put workbooks, ZIPs, SQLite files, real-number fixtures, screenshots or previews
on GitHub. No third-party board scraping. Attribute CREA in the local display.

Store downloads and databases outside every checkout, for example under a
private directory in the user's home. The importer rejects paths inside Git
repositories/worktrees. Synthetic and official observations use separate databases.

## Import contract

`scripts/dev-hpi/hpi_store.py` reads Excel with `openpyxl` (read-only), then stores
observations in a local SQLite table. This needs a Python interpreter with
`openpyxl`; no new application dependency or production database migration is used.

Every row has an exact market, housing type and YYYY-MM month. Types are Composite,
Single Family, Townhouse and Apartment. Optional levels are benchmark CAD and HPI
index; changes are 1m, 6m, 1y, 3y and 5y in percentage points. Missing fields stay
null. Zero change is valid. No values or missing metrics are guessed.

Imports atomically upsert by market/type/month. Re-importing a month replaces its
observation (including explicit missing values); existing other months remain.
New markets need no schema change. Duplicate keys, invalid months/levels, unknown
types and changed/missing mapped headers fail the whole import. Source SHA-256 and
UTC import time are retained locally. Import output contains counts only.

The verified CREA adapter reads **Not Seasonally Adjusted (M).xlsx** directly.
Each worksheet is one market. Columns include `Date`, `<Housing>_HPI` and
`<Housing>_Benchmark`. It imports Composite, Single Family, Townhouse and Apartment.
Absent housing columns remain null. One/Two Storey columns are recognized but are
outside this requested four-type schema. Annual, quarterly and seasonally adjusted
files are rejected to prevent series from being mixed.

The official workbook supplies levels, not the requested change columns. Changes
are derived as `(current HPI / prior HPI - 1) * 100`, comparing exact months 1, 6,
12, 36 and 60 months earlier. The display labels this derivation and its non-adjusted
basis. No nearest-month substitution or benchmark-price rounding is used. Appending
observations or revising old ones recomputes changes against retained history.
Missing current/prior index remains null.

```text
python scripts/dev-hpi/hpi_store.py import --crea-monthly --database <external-private.sqlite> --workbook <external-folder>/Not Seasonally Adjusted (M).xlsx
```

An optional generic reader takes an explicit long-format mapping JSON:

```json
{
  "sheets": [
    {
      "name": "Synthetic example only",
      "header_row": 1,
      "percentage_units": "points",
      "columns": {
        "market": "Market",
        "housing_type": "Housing type",
        "month": "Month",
        "benchmark_price": "Benchmark price",
        "hpi_index": "HPI index",
        "change_1m": "1-month",
        "change_6m": "6-month",
        "change_1y": "1-year",
        "change_3y": "3-year",
        "change_5y": "5-year"
      }
    }
  ]
}
```

`fraction` explicitly converts Excel fractional percentages to points. Sheet and
header names above are synthetic examples, **not CREA workbook headers**. Use the
CREA adapter for the official workbook. Do not edit a raw workbook just to fit the
generic reader. Fail closed if the published schema changes.

```text
python scripts/dev-hpi/hpi_store.py import --database <external-private.sqlite> --workbook <external-download.xlsx> --layout <verified-layout.json>
```

## Local display

Set these only in the local launch environment:

```text
NODE_ENV=development
DEV_HPI_BENCHMARKS=true
DEV_HPI_DATABASE=<absolute external SQLite path>
DEV_HPI_PYTHON=<absolute Python interpreter path>
VITE_DEV_HPI_BENCHMARKS=true
VITE_API_URL=http://localhost:3001
```

Open `/dev/hpi` on the Vite development server. Choose an exact market/type/month.
The frontend flag works only in development; production builds omit the dev page.
The API additionally requires development mode, the flag, loopback client, local
Host and local Origin, returns `no-store`, and binds localhost when enabled.
Missing database errors do not disclose private values or subprocess stderr.

This page is separate from printable/shareable reports. Use synthetic data for
all shared QA evidence. No automated monthly download or scheduled job is included.

## Verification status

Synthetic tests cover updates, new months/markets, missing values, zero/negative
changes, duplicate rejection, path privacy, source-kind separation, mapped column
drift and production/network feature gates. Nine importer tests, five API gate tests
and frontend feature/display checks pass. Only synthetic numbers appear in tests.

On 2026-10-05 the owner approved CREA's terms for private local testing. The official
September 2026 archive downloaded through the CREA page. The verified monthly
adapter imported 62,400 observations for 60 market sheets covering 2005-01 through
2026-08. Repeat import preserved the same row count. An external private check
compared benchmark, index and all five change periods with the original workbook
for Toronto and Vancouver in all four housing types. Eight actual database-to-API-
browser selections also passed. No real values were returned in QA summaries or
captured in shared screenshots. The source and database stay outside the repository.

This verifies the September 2026 layout. Future files must still pass header and
row validation. No production launch or exact-candidate review is claimed here.
