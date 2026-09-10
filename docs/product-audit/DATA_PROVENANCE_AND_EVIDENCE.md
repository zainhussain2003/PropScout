# Data provenance and evidence audit

## Principle

Every report value needs five attributes: **value, origin, observation date, transformation, and confidence**. A null is a valid result. A default is an assumption and must never be serialized or displayed as an observed fact.

## Source inventory

| Domain                    | Current source                                                       | Current use                                                                          | Main limitation                                                                 | Recommended next step                                                                           |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Listing facts             | Realtor.ca rendered page via scraper; user entry                     | Address, type, price/rent, beds, baths, sqft, fees, taxes, year, description, photos | Page shape changes; some missing values become defaults.                        | Preserve field-level provenance and nulls; fixtures for parser tests; freshness/status.         |
| Address/coordinates       | Mapbox geocoding                                                     | Ontario check, maps, proximity, SunScout                                             | Building/unit match is inferred from relevance and postal code.                 | Store geocoder match type, relevance and normalized result alongside user input.                |
| Rental comparables        | Nightly scraped Rentals.ca, Kijiji and PadMapper records in Supabase | Low/mid/high asking-rent band and count                                              | Asking rents, not executed leases; aggregate returned; weak size/type matching. | Return sanitized records with source/date/features/distance and a transparent similarity score. |
| Comparable sales          | Repliers free sample key                                             | Personal-buyer comp display                                                          | Tacoma, Washington sample only. No Ontario sold source.                         | Keep labelled sample; do not score Ontario FMV until TRREB/Ontario data is licensed.            |
| Mortgage rate             | Bank of Canada service with cache/fallback                           | Investment financing default                                                         | Product-specific offered rate and term differ; fallback can go stale.           | Show rate, series/method, retrieved date and allow override.                                    |
| Vacancy                   | Per-city CMHC constant map                                           | Demand component and narrative                                                       | Coarse geography and release vintage; fallback values.                          | Ingest dated CMHC rental-market rows by geography/type and show the matched geography.          |
| Market cap rate           | Per-city constants                                                   | Estimate value from rent for rental listings                                         | Explicitly indicative/placeholders, not a valuation source.                     | Do not use for user-facing acquisition conclusions; require value or licensed evidence.         |
| Schools                   | Loaded Ontario school database/EQAO                                  | Nearest schools and scores                                                           | Straight-line nearest is not catchment; missing middle-level matches.           | Add attendance boundaries, grade coverage, school-year/source date and walking route.           |
| Neighborhood demographics | Statistics Canada 2021 FSA data                                      | Income and population growth                                                         | Broad FSA; census is dated.                                                     | Show vintage/geography and ingest newer releases when available.                                |
| Walk/transit/bike         | Walk Score API                                                       | Mobility scores                                                                      | Third-party coverage varies; source date not surfaced.                          | Persist response metadata and show unavailable distinctly.                                      |
| Nearby places             | Google Places                                                        | Transit, grocery, pharmacy/highway proximity                                         | Straight-line distance; highway category is imperfect.                          | Use routes/travel-time API and name the destination used.                                       |
| Sun geometry              | pvlib/NREL algorithms                                                | Sun hours and light score                                                            | Orientation defaults south; floor inferred; sample-day annualization.           | Ask direction/floor, mark inferred inputs, calibrate score against measured cases.              |
| Obstruction               | OpenStreetMap building geometry/heights                              | Sky openness and hours lost                                                          | Many buildings lack height; missing heights bias result optimistic.             | Quantify coverage and suppress definitive score below a coverage threshold.                     |
| Listing risks             | Regex plus Haiku structured extraction                               | Evidence flags and deductions                                                        | Description-only; no cache; failure can look clean.                             | Cache by normalized description hash, rules/model version; return extraction status.            |

## Rental comparables in detail

The current comparable rents are actual scraped **active asking-rent listings** in the `rental_listings` table. They are not synthetic sample values in the live tenant analysis. The product should describe them as market asking rents, not transactions or signed leases.

The matching pipeline uses postal code/FSA and can widen geographically when coordinates are available. Bedroom count is used, but the response sent to the report stores only `low`, `mid`, `high`, `compCount`, `confidence`, postal code and optional radius. That means neither the user nor a reviewer can determine whether “22 comparable rentals” are genuinely comparable by building, size, property type, age, parking, furnished state or listing date.

Minimum comparable record:

```ts
interface RentComparableEvidence {
  id: string
  provider: string
  sourceUrl: string
  observedAt: string
  approximateLocation: string
  askingRent: number
  beds: number | null
  baths: number | null
  sqft: { low: number; high: number } | null
  propertyType: string | null
  distanceKm: number | null
  sameBuilding: boolean | null
  similarity: number
  exclusions: string[]
}
```

The percentile range should be computed from the displayed eligible set. Any outlier removal and weighting must be reproducible.

## Field-level unknowns

The data model has one good precedent: `condoFeeKnown`. It should be generalized. Today:

- Missing beds/baths are read as zero.
- Missing parking is read as zero.
- Missing property type is read as detached; manual entry starts as condo.
- Unknown annual tax is estimated and stored in metrics with an `annualTaxesEstimated` flag.
- Unknown rent for a sale listing can become a gross-yield proxy.
- Unknown window direction becomes south inside SunScout.
- Unknown floor can be inferred from unit number.

Each derived field should carry `kind: observed | user_supplied | inferred | estimated | sample | unknown`, source, date and method version. UI copy should come from that metadata rather than scattered boolean conditions.

## Freshness and reproducibility

Repeated reports for the same listing can legitimately change when market data changes. They must remain reproducible:

- Store a snapshot ID or query timestamp for comps and third-party responses.
- Store calculator, rule, narrative and extractor versions.
- Cache extraction by normalized description hash plus extractor version.
- Persist each assumption actually used.
- Distinguish “rerun with current data” from “open original report.”
- Show the report's as-of timestamp.

This meets the user's requirement that identical inputs should not generate arbitrary prose changes while still allowing dated evidence to update transparently.

## Confidence policy

Confidence should constrain the strength of the conclusion. It should not simply subtract a small number from a score. Suggested levels:

| Level  | Minimum evidence                                                                          | Allowed conclusion                                                                      |
| ------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| High   | Subject facts confirmed, recent close matches, expenses observed, critical risks reviewed | Normal verdict language.                                                                |
| Medium | Core facts known; comps relevant but incomplete; some expenses estimated                  | Qualified verdict with explicit sensitivities.                                          |
| Low    | Rent or expenses proxied; property type/size missing; sparse/geographically widened comps | “Insufficient evidence” or “appreciation/assumption dependent”; no positive deal claim. |
| Sample | Out-of-market provider sample                                                             | Demonstration only; never included in score.                                            |

For address-entered sale listings, low confidence will be common until the owner supplies rent, expenses and property type. That is a truthful product outcome and should be designed intentionally.

## Data acquisition priorities

1. Ontario sold comparables under a valid licence.
2. Individual active rental comp payload and matching method.
3. Explicit manual-entry facts and provenance schema.
4. Executed rent evidence where legally/licensably available.
5. Dated CMHC vacancy and rental-market measures.
6. School attendance boundaries.
7. Routes/travel time.
8. Better building height coverage and confirmed unit orientation.

No synthetic record should fill any of these gaps.

## Review trail

- [Independent review](../audit-review/DATA_PROVENANCE_AND_EVIDENCE.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **Resolved correction:** there is no condo-to-detached round trip. Address input coerces an unknown to condo; URL scraping coerces an unknown to detached, producing path-dependent costs and flag behavior.
- **Retained additions:** add `failed` and `stale` evidence states; expose search geography on each comparable set; make the address-entry confidence ceiling an owner decision; define mortgage staleness and source licence/retention rules; suppress definitive SunScout conclusions below an approved height-coverage threshold.
