# PropScout Tenant Report Audit

**Report:** Tenant
**Reference listing:** 3105–2221 Yonge Street, Toronto
**Reference report:** `3e1217ee-b749-4046-8654-c7594beec541`
**Purpose:** Track each tenant-report field, the evidence behind it, what is
missing, and the next product improvement. This audit is separate from the
future investor and personal-use report audits.

## Status key

- **Working:** The field is backed by the stated source and renders honestly.
- **Partial:** Useful evidence exists, but coverage, provenance, or confidence
  needs improvement.
- **Blocked:** The field cannot be completed honestly without a new data source
  or user-provided evidence.

## Field audit

| Report area                   | Current Yonge report                                                                                                                                   | Source                                                                                                                                                | Missing data or limitation                                                                                                                                   | Field to work on                                                                                                                                                                            | Status      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Hero and score                | **61 · Negotiate first**. Inputs include the $2,450 asking rent, $2,188 comparable median, Walk 99, Transit 92, Sun 87, and no detected wording flags. | Realtor.ca listing, scraped asking-rent comparables, Walk Score, SunScout, and the deterministic score model.                                         | The visible score summary does not expose the complete calculation. Absence of detected warning language does not establish that a listing is honest.        | Show the complete weighted score breakdown. Replace full honesty credit under incomplete evidence with a neutral completeness state.                                                        | **Partial** |
| §01 Rent positioning          | $1,959–$2,413 range from 22 records.                                                                                                                   | Real scraped asking rents from Rentals.ca, Kijiji, and PadMapper; geographic scope is the first three postal characters or a widened radius fallback. | The API stores aggregate percentiles but does not expose enough individual-comparable detail to judge similarity. These are asking rents, not signed leases. | Return sanitized comp rows with source, observation date, approximate location, beds, sqft, property type, distance, and similarity. Filter or weight by building, type, size, and recency. | **Partial** |
| §02 Listing accuracy          | No supported flags found.                                                                                                                              | Realtor.ca description processed by deterministic regex rules and Haiku structured extraction.                                                        | A clean wording scan is not an inspection or proof of accuracy. Fresh Haiku extraction is not cached by normalized description and extractor version.        | Cache structured extraction by description hash plus extractor version. Expand rules only with validated real descriptions and measured false-positive/false-negative results.              | **Partial** |
| §03 Listed vs reality         | Viewing required; the report does not claim the listing matches the unit.                                                                              | No inspection, tenant evidence, measurements, or uploaded documents are connected.                                                                    | Room dimensions, window/door claims, condition, noise, and advertised inclusions cannot be verified remotely.                                                | Add a viewing workflow for measurements, photos, notes, and written confirmations. Preserve unresolved claims as unknown.                                                                   | **Blocked** |
| §04 Negotiation               | Target $1,959–$2,188 with estimated annual savings of $3,144–$5,892.                                                                                   | Asking rent minus observed comparable-range low and median.                                                                                           | The report cannot yet show which individual records make the strongest case or how similar they are.                                                         | Rank the strongest genuinely similar comps and display them beside the negotiation argument.                                                                                                | **Partial** |
| §05 Monthly cost              | Rent is sourced. Hydro $56, gas $42, water $60, and internet $65 are estimates.                                                                        | Realtor.ca asking rent plus sqft-based utility constants.                                                                                             | No lease package, actual utility bills, building-specific averages, or verified parking charge.                                                              | Ask which utilities are included and accept recent bills or a lease package. Keep unknown parking charges unknown.                                                                          | **Partial** |
| §06 Included items            | Parking and locker are confirmed because the description explicitly says they are included. Utilities, laundry, and AC remain unconfirmed.             | Explicit positive wording in the Realtor.ca description.                                                                                              | Structured inclusion coverage is limited, and a mention alone cannot prove an item is included in rent.                                                      | Continue accepting only explicit positive claims. Add structured extraction for utilities, laundry, and AC with the same evidence rule.                                                     | **Partial** |
| §07 Location                  | Walk 99, Transit 92, Bike 72; transit under 0.1 km, grocery 0.2 km, pharmacy 0.1 km.                                                                   | Walk Score API, Google Places, and Mapbox geocoding.                                                                                                  | Nearby-place distances are not pedestrian routes. Precise travel time requires routing.                                                                      | Connect a routing API for walking and driving times. Until then, label measured distances by their actual method.                                                                           | **Partial** |
| §08 Schools                   | Six nearby schools with available EQAO results; no middle school matched.                                                                              | Ontario school data ranked by straight-line distance.                                                                                                 | Attendance boundaries, grades served, pedestrian routes, and complete Fraser data are unavailable. Nearest does not mean in catchment.                       | Add attendance-boundary polygons, grades, pedestrian routes, and properly sourced Fraser data.                                                                                              | **Partial** |
| §09 SunScout                  | Score 87, 3,619 estimated annual hours, and 14% sky openness.                                                                                          | pvlib/NREL solar geometry plus OpenStreetMap building footprints and known heights.                                                                   | Floor 31 is inferred from unit 3105; south is the initial facade assumption; 13 surrounding buildings have no height.                                        | Ask the user to confirm window direction and floor before treating the model as final. Keep unknown-height omissions visible.                                                               | **Partial** |
| §10 Comparable-rent map       | Individual comp markers are unavailable.                                                                                                               | Analysis currently stores aggregate rental-comparable values.                                                                                         | Coordinates, source metadata, and sanitized individual records are not returned to the report.                                                               | Extend the API response with sanitized individual comp records and approximate coordinates, then render source-aware map markers.                                                           | **Blocked** |
| §11 Unit and building details | 1 bed, 1 bath, 700 sqft, condo, and one parking space. Year built and maintenance fee are unavailable.                                                 | Realtor.ca rendered listing page.                                                                                                                     | Floor, window orientation, balcony, locker, appliances, year built, and maintenance details are not all structured.                                          | Parse explicit floor, windows, balcony, locker, and appliances. Keep year and fees unknown unless the source provides them.                                                                 | **Partial** |
| §12 Before signing            | Six questions generated from known and unknown listing fields.                                                                                         | Deterministic checklist logic using listing fields and detected risks.                                                                                | Completion is browser-local and has no written answers, evidence attachments, or durable report state.                                                       | Save checklist progress and support written answers or document attachments with clear provenance.                                                                                          | **Partial** |

## Prioritized tenant work queue

1. **Correct score completeness.** Expose the full breakdown and stop awarding
   full honesty points when the evidence is merely silent.
2. **Expose individual rent comps.** Add sanitized comp records, source/date
   metadata, similarity inputs, and geographic scope to the API and report.
3. **Cache structured risk extraction.** Key the cache by normalized description
   hash and extractor version so identical input produces identical flags.
4. **Build the viewing workflow.** Capture measurements, photos, notes, and
   written confirmations for claims that listing data cannot establish.
5. **Improve cost evidence.** Accept utility inclusions, recent bills, lease
   documents, and known parking charges.
6. **Add routing and school boundaries.** Replace proximity-only evidence with
   pedestrian routes and verified attendance polygons when sources are licensed.
7. **Persist due diligence.** Save checklist completion, written answers, and
   evidence attachments.

## Already corrected during this audit

- Verdict prose is deterministic backend output; Sonnet no longer writes it.
- Haiku is limited to structured risk extraction and cannot set rent ranges or
  narrative advice.
- Empty wording scans no longer receive a green clean-bill-of-health treatment.
- Parking and locker inclusion requires explicit positive listing language.
- Unknown parking cost remains unknown.
- School distance is labelled as straight-line, and unsupported Fraser or
  catchment claims were removed.
- The facade direction selector recalculates the tenant SunScout result.
- Inactive rent-monitoring and unsupported valuation promises were removed.

## Verification baseline

As of 2026-09-08, the complete web suite passes **939 tests across 73 files**.
Web typecheck, lint, and `git diff --check` also pass. Run the repository's six
test gates and the live end-to-end sequence in `AGENT_HANDOFF.md` after any
implementation work derived from this audit.
