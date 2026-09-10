# Hamilton current-listing calibration

**Research date:** 2026-09-09
**Scope:** Current Hamilton investment listings and rent evidence published on Realtor.ca
**Code changes:** None
**Production writes:** None

## Why this check exists

The investor regression suite uses 146 East 19th Street, Hamilton: a $449,000 duplex with $3,600 monthly rent, $5,200 annual tax, and a 1985 build year. That fixture is useful for detecting calculation drift, but it is old calibration data and should not be treated as proof that a similar deal is available today.

This check uses current Realtor.ca postings with rent disclosed in the sale listing or, for 156 East 36th Street, current rental listings for the exact two units. It tests whether the present scoring engine can recognize favourable investments without inventing rents.

## Method

The public Realtor.ca pages were read directly. The application scraper and shared Supabase project were not used, so this exercise did not create listings or reports.

The current calculation service was called locally through `POST /analysis/`. No listing description was sent to the extraction pipeline, so these results isolate the financial score and do not include risk-flag deductions.

### Baseline assumptions

| Input                       |                                                                Value | Reason                                   |
| --------------------------- | -------------------------------------------------------------------: | ---------------------------------------- |
| Down payment                |                                                                  20% | Existing regression default              |
| Mortgage rate               |                                                                4.79% | Existing regression default              |
| Amortization                |                                                             25 years | Existing regression default              |
| Management                  |                                                    Self-managed / 0% | Existing default                         |
| Operating vacancy allowance |                                                                   5% | Existing investment calculation constant |
| Demand-score vacancy input  |                                                                 2.5% | Existing Hamilton calibration input      |
| Rental days on market       |                                                              21 days | Current service default                  |
| Rent trend                  |                                                                 Flat | Current service default                  |
| Insurance                   |                                              0.35% of value annually | Current service estimate                 |
| Maintenance                 | 1.5% when an exact pre-1980 year is known; 1.0% when year is unknown | Current service behaviour                |

The baseline rent is the disclosed gross rent or the sum of the exact property's live rental asks. These are listing-side claims, not verified lease documents.

### Conservative sensitivity

The conservative run reduces gross rent by 5% and enables the service's 8% management fee. Where Realtor.ca reports an age range of 51–99 years, it also applies the pre-1980 1.5% maintenance bracket. This is a sensitivity case, not a claim about an exact build year.

## Results

### Baseline: current service defaults

| Property           | Asking price | Gross rent used | Raw / display score | Verdict    | Cap rate | Cash flow / mo |    CoC |  DSCR | Break-even rent |
| ------------------ | -----------: | --------------: | ------------------: | ---------- | -------: | -------------: | -----: | ----: | --------------: |
| 90 Sherman Ave N   |     $499,900 |          $4,875 |             92 / 97 | Strong buy |    9.19% |        +$1,550 | 17.09% | 1.68× |          $3,243 |
| 406 East 43rd St   |     $699,900 |          $4,115 |             27 / 28 | Do not buy |    4.69% |          −$456 | −3.58% | 0.86× |          $4,595 |
| 16 Beaucourt Pl    |     $599,900 |          $5,100 |             92 / 97 | Strong buy |    7.43% |          +$982 |  9.00% | 1.36× |          $4,067 |
| 10 Fairleigh Ave N |     $559,000 |          $4,750 |             92 / 97 | Strong buy |    7.71% |        +$1,042 | 10.26% | 1.41× |          $3,653 |
| 156 East 36th St   |     $749,990 |          $4,495 |             24 / 25 | Do not buy |    4.42% |          −$653 | −4.78% | 0.81× |          $5,183 |
| 66 Wellington St S |   $1,499,000 |         $12,583 |             92 / 97 | Strong buy |    7.80% |        +$2,911 | 10.63% | 1.43× |          $9,519 |

### Conservative sensitivity: 5% lower rent, management included

| Property           | Reduced rent | Raw / display score | Verdict    | Cap rate | Cash flow / mo |    CoC |  DSCR | Break-even rent |
| ------------------ | -----------: | ------------------: | ---------- | -------: | -------------: | -----: | ----: | --------------: |
| 90 Sherman Ave N   |       $4,631 |             92 / 97 | Strong buy |    7.75% |          +$948 | 10.45% | 1.42× |          $3,541 |
| 406 East 43rd St   |       $3,909 |             17 / 18 | Hard pass  |    3.82% |          −$964 | −7.57% | 0.70× |          $5,018 |
| 16 Beaucourt Pl    |       $4,845 |             72 / 76 | Good deal  |    6.17% |          +$352 |  3.23% | 1.13× |          $4,440 |
| 10 Fairleigh Ave N |       $4,512 |             62 / 65 | Caution    |    5.95% |          +$222 |  2.19% | 1.09× |          $4,257 |
| 156 East 36th St   |       $4,270 |             17 / 18 | Hard pass  |    3.54% |        −$1,209 | −8.85% | 0.65× |          $5,659 |
| 66 Wellington St S |      $11,954 |             77 / 81 | Good deal  |    6.06% |          +$732 |  2.67% | 1.11× |         $11,113 |

## Listing records

### 90 Sherman Avenue N, Stipley

- [Realtor.ca sale listing](https://www.realtor.ca/real-estate/29989066/90-sherman-avenue-n-hamilton-stipley), MLS X13522306
- Legal triplex; 7 bedrooms, 3 bathrooms, 1,500–2,000 sqft.
- Asking price: $499,900. Annual property tax: $2,880.
- Listing-reported current gross rent: $58,500/year, or $4,875/month.
- Listing-reported NOI: $44,850 and cap rate: 8.97%.
- Fully occupied; five of six room leases are fixed-term and one is month-to-month.
- Build year and detailed operating-expense statement: unknown.
- The engine's baseline NOI is $45,946, close to the listing's $44,850 claim. That agreement is encouraging, but a rent roll, leases, utility bills, insurance quote, and repair history are still required.

### 406 East 43rd Street, Hampton Heights

- [Realtor.ca sale listing](https://www.realtor.ca/real-estate/29858585/406-east-43rd-street-hamilton), MLS 40836955
- Fully tenanted duplex; two 3-bedroom units, 2 bathrooms, 1,639 sqft.
- Asking price: $699,900. Annual property tax: $4,656.08.
- Listing-reported current gross rent: $4,115/month.
- Two parking spaces. Build year: unknown.
- The listing calls the rents “market rents,” but provides neither unit-level rents nor leases. Even accepting the gross rent, the engine finds negative cash flow at 20% down.

### 16 Beaucourt Place, Ainslie Wood

- [Realtor.ca sale listing](https://www.realtor.ca/real-estate/30202602/16-beaucourt-place-hamilton), MLS 40858707
- Licensed six-bedroom student rental; 2 bathrooms, 2,022 sqft.
- Asking price: $599,900. Annual property tax: $5,450.30.
- Listing-reported current gross rent: $5,100/month. Lease stated to run through May 2027.
- Tenants reportedly pay all utilities except water.
- Build year, water expense, lease documents, and room-level rent schedule: unknown.
- This remains positive in the conservative sensitivity, although DSCR falls to 1.13×.

### 10 Fairleigh Avenue N, Gibson

- [Realtor.ca sale listing](https://www.realtor.ca/real-estate/30225743/10-fairleigh-avenue-n-hamilton-gibson), MLS X13737250
- Legal duplex plus a separate basement apartment; three units, 4+1 bedrooms, 3 bathrooms, 2,000–2,500 sqft.
- Asking price: $559,000. Annual property tax: $3,526.38. Age reported as 51–99 years.
- The listing says the property previously generated approximately $4,700/month. Its stated unit rents are $1,400 + $2,100 + $1,250 = **$4,750**, a $50 inconsistency.
- All units are to be vacant by the end of September. Historical rent is therefore not in-place income for a buyer.
- The baseline uses the unit sum of $4,750 and labels it as historical. The conservative run uses $4,512 and the pre-1980 maintenance bracket.
- This changes from Strong buy under defaults to Caution in the conservative run, showing that the initial 92 is not robust.

### 156 East 36th Street, Raleigh

- [Realtor.ca sale listing](https://www.realtor.ca/real-estate/30171037/156-east-36th-street-hamilton), MLS 40856413
- Legal duplex; two 3-bedroom units, 2 bathrooms, 1,613 sqft; built in 1950.
- Asking price: $749,990. Annual property tax: $4,188.97.
- Both units are vacant. The exact-property rental postings ask [$2,500 for the main unit](https://www.realtor.ca/real-estate/30171331/main-156-e36th-street-hamilton-raleigh) and [$1,995 for the basement](https://www.realtor.ca/immobilier/30171416/basement-156-e36th-street-hamilton-raleigh), for $4,495/month combined.
- These are asking rents, not executed leases. Even accepting both asks, the engine returns Do not buy under defaults and Hard pass in the conservative run.

### 66 Wellington Street S, Corktown

- [Realtor.ca sale listing](https://www.realtor.ca/real-estate/30059973/66-wellington-street-s-hamilton-corktown), MLS X13587910
- Nine-unit multiplex; 9 bedrooms, 9 bathrooms, 3,500–5,000 sqft. Age reported as 51–99 years.
- Asking price: $1,499,000. Annual property tax: $6,300.
- Listing-reported gross revenue: approximately $151,000/year, or $12,583/month.
- Unit rents, leases, utilities, laundry income, insurance, repairs, and a trailing-12-month operating statement: unknown.
- The current residential model is a weak fit for a nine-unit building because it estimates expenses from property value rather than a verified multiplex operating statement. The score is directional only.

## Other current sale listings reviewed but not scored

| Property                                                                                                    | Why it was not scored                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [54 Frederick Avenue](https://www.realtor.ca/real-estate/30089278/54-frederick-avenue-hamilton-crown-point) | The listing claims a 4.99% cap rate “when fully rented” but discloses no rent roll. Two of three units are vacant. Reverse-engineering rent from the advertised cap rate would circularly validate the seller's claim. |
| [24 Somerset Avenue](https://www.realtor.ca/real-estate/30051717/24-somerset-avenue-hamilton)               | Legal duplex with useful physical details, but no current or historical rent is disclosed. Nearby rents would be proxies rather than property evidence.                                                                |
| [217 Caroline Street S](https://www.realtor.ca/real-estate/30165066/217-caroline-street-s-hamilton-durand)  | Legal duplex, but only occupancy status is disclosed; the existing one-bedroom tenancy rent is unknown.                                                                                                                |
| [172 Hanover Place](https://www.realtor.ca/real-estate/29970329/172-hanover-place-hamilton-vincent)         | Legal duplex with a future garden-suite approval, but no current rents. Future garden-suite rent was excluded because the unit is not built.                                                                           |
| [362 Rosseau Road](https://www.realtor.ca/real-estate/30203775/362-rosseau-road-hamilton)                   | Legal duplex with no disclosed rent.                                                                                                                                                                                   |
| 43 Crooks Street                                                                                            | Search results exposed rent claims, but the Realtor.ca page returned 404 when verified. A stale result was not used.                                                                                                   |

## What the sample says about the score

The old Hamilton fixture is directionally plausible: current Hamilton listings with unusually high rent relative to price do exist, and the engine can identify them. It should remain a regression fixture, clearly labelled as calibration data rather than a current market example.

The sample does **not** support loosening the score to make more properties pass. Two current duplexes fail even when their disclosed or advertised gross rents are accepted. Four properties pass under the baseline, so the earlier run of failures came from the Toronto/Vaughan properties tested, not from a rule that forces every investment to fail.

The stronger concern is score saturation. Four materially different properties all receive 92 raw / 97 displayed because they clear the maximum threshold in each financial component and receive the same seven demand points. A 92 should not be presented as equally certain across:

- a triplex whose claimed NOI nearly reconciles to the engine;
- a student rental with one disclosed total rent;
- a soon-to-be-vacant property with internally inconsistent historical rent; and
- a nine-unit multiplex without an operating statement.

The conservative run separates them: 90 Sherman stays Strong buy; 16 Beaucourt and 66 Wellington become Good deal; 10 Fairleigh becomes Caution; and the two weaker duplexes become Hard pass. This suggests future calibration should add evidence quality and expense completeness to the score, or cap the verdict when the rent roll and operating expenses are unverified. It does not justify adding points to weak deals.

## Data needed before relying on any verdict

- Executed leases and a unit-by-unit rent roll.
- Trailing 12 months of bank-supported rental income.
- Property tax bill, insurance quote, water and common utility bills.
- Repairs, maintenance, turnover, legal, accounting, and snow/landscape costs.
- Major capital history and near-term roof, foundation, plumbing, electrical, HVAC, and fire-code work.
- Legal-use documentation, rental licence where applicable, and fire inspection records.
- Vacancy and bad-debt history.
- Exact financing terms and lender treatment of rental income.

Until those are supplied, the scores are screening results based on seller-published data, not completed underwriting.

## Review trail

- [Independent review](../audit-review/HAMILTON_CURRENT_LISTING_CALIBRATION.review.md)
- [Counter-review reconciliation](../audit-review/COUNTER_REVIEW_RECONCILIATION.md)
- **Retained conclusion:** current-listing evidence supports testing score separation, but seller-published assumptions do not justify loosening bad-deal guardrails.
- **Calibration prerequisite:** expense rows, NOI and scenario settings must reconcile before score weights are recalibrated.
