# Rental comps scraper — deploy & first-run checklist

Nightly Playwright worker that builds the rental-comparables moat. Runs on Railway as a
cron job (`railway.json`: `0 6 * * *` UTC = 01:00 EST / 02:00 EDT). Scrapes three sources
(Rentals.ca, Kijiji, PadMapper) across the Ontario target cities, normalises, dedupes,
geocodes, and **inserts only — historical rows are never deleted** (accumulation is the moat).

Pipeline detail lives in `rental_comps_scraper.py`; spec Section 11.2.

---

## Environment variables (set on Railway before the first run)

| Var                         | Required | Purpose                                                       | If missing                                                          |
| --------------------------- | -------- | ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `SUPABASE_URL`              | **Yes**  | Postgres/Storage endpoint                                     | Run aborts — can't store rows                                       |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes**  | Backend write key (service role — **never** ship to frontend) | Run aborts                                                          |
| `MAPBOX_TOKEN`              | No       | Geocoding addresses → lat/lng                                 | Listings stored **without** coordinates (logged warning, non-fatal) |

> The scraper is the one place a `SERVICE_ROLE_KEY` is correct — it writes server-side.
> It must never appear in `apps/web`.

---

## ⚠️ Run #1 is a SELECTOR TEST, not a data load

The source selectors are **TEMPLATE CODE** (spec 11.2) — CSS that will drift as the sites
change their markup. The first manual run exists to **validate the selectors against the
current live markup**, not to populate the database. A sparse first run is the **alarm
working**, not the deploy failing.

"The scraper ran" and "the scraper extracted rows" are different claims. The per-source
yield check exists precisely so a broken selector can't masquerade as a quiet listings night.

### Steps

1. Set the env vars above on the Railway service.
2. Trigger the worker **once, manually** (Railway → the service → "Run" / deploy trigger),
   rather than waiting for the cron. The `startCommand` is `python rental_comps_scraper.py`.
3. **Read the per-source yield log.** Near the end of the run you'll see one line per source:

   ```
   Source yield: rentals_ca     142 raw listings
   Source yield: kijiji          98 raw listings
   Source yield: padmapper        0 raw listings   ← dead source, broken selector
   ```

   - **Healthy** ≈ tens to low-hundreds per source (12 cities × up to 5 pages each).
   - **Near-zero** (below `MIN_RAW_ROWS_PER_SOURCE`, currently **5**) → that source's
     selectors no longer match the site. Fix `sources/<name>.py` against the current markup
     and re-run. Do **not** trust the cron until every source clears the floor.

4. **Read the exit code / final log:**

   | Exit | Meaning                                                                          | Action                                                                                              |
   | ---- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
   | `0`  | All sources cleared the floor                                                    | Healthy — let the cron run nightly                                                                  |
   | `2`  | Stored healthy rows, but ≥1 source was near-zero (`ZERO/LOW-YIELD SOURCE(S): …`) | Fix the named selector(s), re-run. Good data was still stored — exit 2 is "investigate", not "lost" |
   | `1`  | The run crashed before completing                                                | Read the traceback; environment or dependency issue                                                 |

   A dead source is recorded as **0** (not omitted) and the healthy sources' rows are stored
   **first**, so a broken selector never costs you the working sources' data — it just trips
   the alarm.

---

## The alarm threshold is a deliberate guess

`MIN_RAW_ROWS_PER_SOURCE` (`constants.py`, currently `5`) is itself an **unsourced constant**
— "how few rows is suspiciously few." Too high false-alarms on a genuinely quiet night; too
low lets a half-broken selector scraping 3-of-200 slip through. It is tracked in
`NIGHT_NOTES.md` (consolidated ledger, row 14). **Tune it against the first week of real
per-source yields**, then raise it to a value that's comfortably below a normal night but
above zero — don't leave the watchdog's own tripwire as an unexamined number.

---

## Running the tests locally

```
cd services/scrapers
python -m pytest -q            # 109 tests — pipeline, normalisation, dedupe, yield alarm
```

The yield alarm specifically: `find_underperforming_sources` (unit) and the
dead-source-still-stores-healthy-rows / all-healthy-flags-nothing functionality tests in
`rental_comps_scraper_test.py`.
