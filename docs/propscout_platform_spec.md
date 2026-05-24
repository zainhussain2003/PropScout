# PropScout — Platform Spec & Business Plan
**Version 3 · May 2026 · Authoritative document — supersedes all prior drafts**

---

## Table of contents

1. [What PropScout is](#1-what-propscout-is)
2. [Who it's for](#2-who-its-for)
3. [The four report modes](#3-the-four-report-modes)
4. [Feature architecture and tier matrix](#4-feature-architecture-and-tier-matrix)
5. [The core user flow — URL to report](#5-the-core-user-flow--url-to-report)
6. [Report A — Investment purchase](#6-report-a--investment-purchase)
7. [Report B — Personal purchase](#7-report-b--personal-purchase)
8. [Report C — Tenant evaluation](#8-report-c--tenant-evaluation)
9. [Report D — Landlord rental analysis](#9-report-d--landlord-rental-analysis)
10. [Deal score formula](#10-deal-score-formula)
11. [Technical architecture](#11-technical-architecture)
12. [AI narrative spec](#12-ai-narrative-spec)
13. [Data and API stack](#13-data-and-api-stack)
14. [PDF export spec](#14-pdf-export-spec)
15. [Revenue model](#15-revenue-model)
16. [Build roadmap and MVP scope](#16-build-roadmap-and-mvp-scope)
17. [SunScout module](#17-sunscout-module)
18. [Domain and naming](#18-domain-and-naming)
19. [Listing description extraction pipeline](#19-listing-description-extraction-pipeline)

---

## 1. What PropScout is

PropScout is a Canadian real estate analysis platform. A user pastes any property listing URL from Realtor.ca or Zillow.ca and receives a full analysis report in under 60 seconds. The type of report depends on whether the listing is for sale or for rent, and what the user intends to do with the property.

**The core problems it solves:**

- **Investors** analyze deals manually in Excel. It takes 30–60 minutes per property. Rental comps don't exist in any structured Canadian form. Canadian-specific rules (OSFI stress test, Ontario rent control, provincial LTT) are never modeled correctly by US tools.
- **Personal buyers** have no single tool that consolidates neighbourhood quality, school rankings, comparable sales, and true ownership costs.
- **Tenants** have no way to verify whether a listed "2-bedroom" is actually a 2-bedroom, or whether the asking rent is fair for what they're getting.

**The moat:** A proprietary, time-series rental comparables database built from daily scraping of Rentals.ca, Kijiji, and PadMapper. After 6 months of operation, this dataset exists nowhere else in Canada.

---

## 2. Who it's for

| Customer | What they use PropScout for | Pays? |
|---|---|---|
| Individual investors | Analyze deals before buying. Currently use Excel. | Yes — Investor Pro |
| Investor-focused agents | Generate branded deal reports for clients. | Yes — Professional |
| Mortgage brokers | Run DSCR and cash flow analysis faster. | Yes — Professional |
| Personal home buyers | Research a property before making an offer. | Yes — Pro or free tier |
| Tenants | Verify a rental listing before signing. | Free (acquisition funnel) |
| Small REITs / syndicates | Portfolio-level analysis and reporting. | Yes — Team |

---

## 3. The four report modes

PropScout automatically detects whether a URL is a for-sale or for-rent listing. For for-sale listings it asks one question. For for-rent listings it asks one question. The answer routes to one of four report types.

```
User pastes URL
       |
       |-- For-sale listing detected
       |         |
       |         +-- Modal: "Are you buying this as an investment or for personal use?"
       |                   |
       |                   |-- Investment  --> Report A: Investment purchase analysis
       |                   +-- Personal    --> Report B: Personal purchase report
       |
       +-- For-rent listing detected
                 |
                 +-- Modal: "Are you a tenant evaluating this rental, or a landlord analyzing rental income?"
                           |
                           |-- Tenant     --> Report C: Tenant evaluation (free, no login)
                           +-- Landlord   --> Report D: Landlord rental analysis
```

**How listing type is detected:**

| Signal | Classification |
|---|---|
| URL contains /for-sale/, /buy/, or listing shows a sale price | For-sale |
| URL contains /for-rent/, /rental/, or listing shows a monthly rent | For-rent |
| Ambiguous | Default to for-sale, show toggle to switch |

For Realtor.ca: listing type is explicit in the URL path and JSON response.
For Zillow.ca: listing type is in the page metadata and price field format.

---

## 4. Feature architecture and tier matrix

### Pricing tiers

| | Free | Investor Pro | Professional | Team / REIT |
|---|---|---|---|---|
| Price | $0/mo | $10/mo | $59/mo | $299+/mo |
| Annual | — | $100/yr | $590/yr | Custom |
| Target | Casual browsers, tenants | Serious individual investors | Agents and brokers | Syndicates, small REITs |

### Feature matrix

| Feature | Free | Pro | Professional | Team |
|---|---|---|---|---|
| Report A — Investment | 3/month, limited | Unlimited, full | Unlimited, full | Unlimited, full |
| Report B — Personal purchase | 3/month, limited | Unlimited, full | Unlimited, full | Unlimited, full |
| Report C — Tenant evaluation | Unlimited, no login | Unlimited | Unlimited | Unlimited |
| Report D — Landlord rental | 3/month, limited | Unlimited, full | Unlimited, full | Unlimited, full |
| Rental comps (full — range, map, trend, confidence) | Yes | Yes | Yes | Yes |
| Full investment metrics | All metrics | All metrics | All | All |
| Financing scenarios | All scenarios + sliders | All scenarios + sliders | All | All |
| Risk analysis | Full detail | Full detail | Full | Full |
| Neighbourhood intelligence | Yes | Yes | Yes | Yes |
| School rankings | Yes | Yes | Yes | Yes |
| STR vs LTR analysis | No (Phase 2) | Yes | Yes | Yes |
| SunScout — sun path + light score + seasonal arc | Yes | Yes | Yes | Yes |
| SunScout — building obstruction (3D Mapbox) | No | Yes | Yes | Yes |
| AI narrative verdict | 1 short paragraph (4–5 sentences) | Full (3 paragraphs) | Full | Full |
| PDF export | No | Yes | Yes | Yes |
| Saved analyses | Last 10 | Unlimited | Unlimited | Unlimited |
| Portfolio tracker | No | Up to 10 properties | Unlimited | Unlimited |
| White-label branded reports | No | No | Yes | Yes |
| Shareable client links | No | No | Yes | Yes |
| Bulk URL analysis | No | No | Yes | Yes |
| Multi-user seats | 1 | 1 | 1 | 5–20+ |
| API access | No | No | No | Yes |

### Paywall trigger points

Free users hit a gate at:
1. Their 11th analysis of the month — hard gate with a countdown shown.
2. The "Export PDF" button — blurred with "Unlock with Pro."
3. The SunScout building obstruction section — blurred preview with "See accurate shadow data in dense cities — Investor Pro."
4. "Save to portfolio" — prompts upgrade to access portfolio tracker.

Gate copy always shows what the user is missing, never just "upgrade to continue."

---

## 5. The core user flow — URL to report

### Step 1 — URL input

Clean, centred input bar. Placeholder: "Paste a Realtor.ca or Zillow.ca listing URL."

Validation:
- Realtor.ca pattern: realtor.ca/real-estate/.../[numeric ID]
- Zillow.ca pattern: zillow.ca/... or zillow.com/homedetails/... (Canadian postal code confirmed after scrape)
- Invalid URL: "That doesn't look like a supported listing URL. We support Realtor.ca and Zillow.ca right now."

### Step 2 — Listing type detection and mode selection

After URL validation, the system detects for-sale vs. for-rent. A modal appears immediately with one question and two buttons.

For-sale: "Are you analyzing this as an investment or for personal use?" — [Investment] [Personal Use]

For-rent: "Are you a tenant evaluating this rental, or a landlord analyzing rental income?" — [I'm a Tenant] [I'm a Landlord]

Report C (tenant) requires no login. All other modes check login state. A guest user gets one free analysis with email capture at the end.

### Step 3 — Scraping and progress display

Scraper runs immediately after mode selection. User sees progressive confirmation:

```
Listing found — Unit 5702 · 5 Buttermill Ave, Vaughan
Asking price: $729,900 · 3 bed · 2 bath · ~950 sqft
Property taxes: $3,326/yr
Condo fee: $761/mo
Pulling rental comps nearby...
Running investment analysis...
Generating AI verdict...
```

Each confirmed field appears as it's extracted. Fields not found appear as amber "enter manually" prompts. The analysis waits for any required missing fields (condo fee for condos, taxes if absent) before running.

Time targets: Urban Ontario under 10 seconds. Smaller cities up to 25 seconds.

### Step 4 — Report display

Full report renders in-page. Gated sections show blurred previews, never hidden entirely. Sections load progressively: scorecard first, AI narrative last.

### Step 5 — Export and share

- PDF: One-click, generates and downloads immediately. White-labelled for Professional+ accounts.
- Shareable link: Unique URL, no login to view, active for 30 days.
- Save: Adds to saved analyses and portfolio tracker.

### Error states

| Situation | What user sees |
|---|---|
| Scraper fails entirely | Manual entry form, pre-filled with whatever was captured |
| Listing expired or removed | "That listing has been removed. Enter the details manually." |
| Fewer than 3 rental comps | Analysis runs. Comps section: "Only 2 comparables found — confidence: low." |
| Non-Ontario property | Province gate + email capture for waitlist |
| Condo fee not found | Required field prompt before analysis runs |
| Year built not found | Analysis runs. Risk module flags: "Year built unknown — rent control status unconfirmed." |
| Zillow URL is a US property | "This appears to be a US property. PropScout covers Canadian properties only." |

---

## 6. Report A — Investment purchase analysis

Triggered when a for-sale URL is pasted and the user selects "Investment." This is the core monetised product.

### Sections in display order

**1. Property header**
Address, asking price, key tags (property type, beds/baths, sqft, parking, condo fee, year built, rent control status), deal score badge.

**2. Deal scorecard**

| Metric | Pass | Caution | Fail |
|---|---|---|---|
| Cap rate | 5%+ | 3–4.99% | Under 3% |
| Monthly cash flow | +$200 or more | $0 to +$199 | Negative |
| Cash-on-cash return | 5%+ | 3–4.99% | Under 3% |
| DSCR | 1.1x or more | 1.0–1.09x | Under 1.0x |
| OSFI stress test | Qualifies | — | Fails |
| Overall deal score | 70+ | 50–69 | Under 50 |

**3. Full investment metrics**

Inputs (auto-filled from scraper, user-editable): purchase price, annual taxes, condo fee, estimated monthly rent (from comps), down payment % (default 20%), mortgage rate (auto-fetched weekly from Bank of Canada), amortization (default 25yr), province (auto-detected).

Calculated outputs:
- Gross rental income (annual and monthly)
- Operating expenses: taxes + insurance (0.35% of value) + maintenance reserve + vacancy allowance (5%) + management fee (8%, toggleable)
- NOI — Net Operating Income
- Cap rate = NOI / purchase price
- Annual and monthly debt service
- Annual and monthly cash flow = NOI minus debt service
- Cash-on-cash return = annual cash flow / total cash invested
- Total cash invested = down payment + LTT + closing costs
- DSCR = NOI / annual debt service
- GRM — Gross Rent Multiplier = purchase price / annual gross rent
- Break-even rent = all monthly expenses combined
- Equity build at 5, 10, and 20 years (mortgage paydown + 3% appreciation, user-adjustable)

Maintenance reserve by build year: post-2010 at 0.5%/yr, 1980–2010 at 1.0%/yr, pre-1980 at 1.5%/yr.

**4. Rental comps engine** (all tiers)

Comp selection logic: same FSA or within 1km radius, same bedroom count (±1 if fewer than 5 results), listed within 90 days (expand to 180 if needed), outliers removed.

Output: low/mid/high rent range (25th/50th/75th percentile), number of comps, confidence level (0–4: low, 5–9: medium, 10+: high), nearest 5 comps on Mapbox map, rental days-on-market, 12-month rent trend, CMHC vacancy rate.

**5. Financing scenarios** (sliders Pro only)

Four default scenarios: base case, OSFI stress, 35% down, conservative (rate +2%). Pro sliders: down payment 20–50%, mortgage rate ±3%, amortization 20/25/30yr. Live recalculation on every slider move.

Closing costs by province:

| Province | Land Transfer Tax |
|---|---|
| Ontario non-Toronto | 0.5% on first $55K; 1% on $55K–$250K; 1.5% on $250K–$400K; 2% above |
| Ontario Toronto | Same brackets doubled — provincial + municipal LTT stack |
| BC | 1% on first $200K; 2% on $200K–$2M; 3% above $2M |
| Alberta | No provincial LTT — land title transfer fee only (~$400–600 flat) |
| Other provinces | Manual entry prompt |

First-time buyer rebates do not apply to investment properties.

**6. Risk analysis** (flags visible free, detail Pro only)

| Flag | Trigger | Severity |
|---|---|---|
| Rent control | Year built before Nov 15, 2018 in Ontario | Red |
| Year built unknown | Year not found — rent control status unclear | Amber |
| Condo fee impact | Monthly fee over 20% of estimated gross rent | Red |
| High maintenance risk | Pre-1980 build | Amber |
| Flood or conservation zone | Municipal open data match | Red |
| Unverified rental unit | "Basement," "lower level," or "in-law" in description | Amber |
| Supply pressure | More than 15 competing rentals in building or 50 in postal code + declining rents | Amber |

**7. Neighbourhood intelligence** (Pro only)

Average household income, 5yr population growth trend (Statistics Canada), Walk Score, Transit Score, active building permits nearby, 5yr and 10yr price appreciation, comparable recent sales, price per sqft trend.

**8. STR vs LTR analysis** (Pro only — AirDNA in Phase 2)

At MVP: LTR baseline shown from comps. STR section shows "Coming soon — AirDNA integration in progress." STR legality check still runs based on municipality rules:
- Toronto and Vancouver: investment STR prohibited — prominent warning
- Ottawa: permitted with registration
- Calgary and Edmonton: generally permitted
- Other: "Verify local bylaws before proceeding"

**9. SunScout**

All tiers: annual light score 0–100, hours of direct sun by month, window-by-window forecast by compass direction, seasonal arc visualization.
Investor Pro and above: building obstruction (3D Mapbox data) — accurate shadow mapping in dense cities like Toronto and Vancouver. Full spec in Section 17.

**10. AI narrative verdict**

Full-width dark section. Three paragraphs. Plain English. Direct. Full prompt spec in Section 12.

---

## 7. Report B — Personal purchase report

Triggered when a for-sale URL is pasted and the user selects "Personal use." Lifestyle-focused — helps someone decide if this is the right home, not whether it's a good return.

### Sections

**1. Property header**
Same as Report A.

**2. True monthly cost of ownership**

This is the number that surprises most personal buyers — the full carrying cost, not just the mortgage payment:
- Estimated monthly mortgage (current rates, 20% down default, user-adjustable)
- Monthly property taxes (from listing or MPAC)
- Monthly condo fee (if applicable)
- Estimated monthly insurance (~$150–250 condo, ~$200–350 detached)
- Estimated monthly utilities (hydro, gas, water — rough by property type and sqft)
- Estimated monthly maintenance reserve (0.5–1.5% of value / 12, by age)
- **Total estimated monthly cost of ownership** — the headline number

**3. Comparable sales**

Last 10 similar sales within 1km, same property type: address, sale price, sqft, beds/baths, sale date, price per sqft. Visual showing where the asking price sits vs. recent comps. Fair market value band: low/mid/high.

**4. School rankings**

Nearest schools found via Google Places API, ranked via EQAO and Fraser Institute data.

| School type | Data shown |
|---|---|
| Elementary (up to 3 nearest) | Name, walking distance, drive time, EQAO score (out of 10), Fraser Institute provincial percentile |
| Middle school (up to 3 nearest) | Name, distance, drive time, EQAO score, Fraser Institute rank |
| High school (up to 3 nearest) | Name, distance, drive time, Fraser Institute rank, graduation rate if available |

Schools within the property's catchment area are highlighted. Catchment polygons sourced from TDSB and other major Ontario boards.

Data sources:
- School discovery: Google Places API (type=school near property coordinates)
- EQAO scores: Ontario public dataset, loaded annually into our database
- Fraser Institute rankings: scraped annually from fraserinstitute.org (Ontario and BC available at launch)
- Catchment boundaries: scraped from major board websites and stored as polygon data

**5. Neighbourhood intelligence**

Same as Report A Section 7.

**6. SunScout**

Same as Report A Section 9. Particularly relevant for personal buyers who will live in the space.

**7. AI narrative — personal buyer verdict**

Answers: Is this priced fairly for what it is and where it is? What is the most important consideration for a personal buyer in this specific location? What should they do before making an offer?

---

## 8. Report C — Tenant evaluation

Triggered when a for-rent URL is pasted and the user selects "I'm a Tenant." No login required. Free, always. Shareable link generated automatically.

### Purpose

Help a tenant answer three questions: Is this accurately listed? Is it fairly priced? Should I sign, negotiate, or walk away?

### Sections (in display order)

**1. Property header**
Address, floor (if available), monthly rent, unit tags (beds, baths, sqft, balcony, parking status, availability date), tenant score badge.

---

**2. Listed vs. reality** *(conditional — only shown when at least one listing accuracy flag fires)*

Side-by-side cards showing exactly how the listing describes the unit versus what the extraction pipeline and user-reported flags indicate is actually there. This section crystallises the misrepresentation case visually and gives the tenant clear language to use when negotiating.

Left card — "How it's listed":
- Pulls directly from the listing title and description (Zillow/Realtor.ca copy)
- Shows each listed feature exactly as written: bedroom count, bathroom count, included amenities, parking

Right card — "What you actually get":
- Replaces any flagged item with the accurate description
- Glass door den listed as bedroom → "1 proper bedroom + 1 glass-door den (no privacy)"
- Parking listed as "contact manager" → "Parking: unconfirmed — must verify"
- Items confirmed accurate carry a green tick
- Items flagged as misrepresented carry a red warning

Display rule: if zero listing accuracy flags fire, this section is hidden entirely. A clean listing does not need a listed vs. reality comparison.

---

**3. Listing accuracy check**

Automated flags surfaced from the extraction pipeline (Section 19 of spec):
- "Glass door," "sliding door," "den," or "study" listed as a bedroom → "One room may not be a private bedroom"
- "Basement" or "lower level" → "Confirm adequate natural light and proper egress"
- Parking listed as "contact manager" or "inquire" → "Parking status unclear — confirm before signing"
- No exterior window detectable for a listed bedroom → "Verify this room has a window"
- Heat/hydro/internet confirmed included → shown as green positive confirmations

Each flag shows: what triggered it, what it means for the tenant, and what to confirm before signing.

---

**4. Full unit breakdown**

A complete data sheet of every known property attribute. Two-column layout, scannable.

| Field | Value |
|---|---|
| Floor | 37 of 55 |
| Sqft | Not listed — est. 600–700 sqft |
| Balcony | 105 sqft |
| Bedroom 1 | Proper room with solid door |
| Bedroom 2 / den | Glass sliding door — no privacy |
| Bathrooms | 2 full baths |
| Kitchen | Built-in appliances |
| Ceilings | 9ft |
| Windows | Floor-to-ceiling in main living area |
| Laundry | Ensuite |
| Cooling | Central air |
| Heating | Electric forced air |
| Internet | 1 Gbps included |
| Parking | Not confirmed |
| Available | Now |

Fields sourced from the scraper are labelled auto-filled. Fields not found are labelled "Not listed" rather than left blank.

---

**5. Rent positioning**

Where the asking rent sits vs. the market:
- Building-level comparables (other active rentals in the same building, same or similar bedroom count)
- Postal-code-level comparables (similar units within 1km, last 90 days)
- Visual bar chart: asking rent vs. low/mid/high range with the unit's asking price clearly marked
- Verdict label: "Above market," "At market," or "Below market" with the specific dollar gap
- 12-month rent trend for the postal code: rising, flat, or declining

---

**6. Negotiation assessment**

- Number of competing rentals in the building and nearby postal code
- Days on market for this specific listing
- Whether the listing has been price-reduced (detected from listing history)
- Negotiation leverage score: Strong / Moderate / Weak with the reason shown
- If leverage is present: specific negotiation target range ("Fair value for a true 1+1 in this building is $1,950–2,000/month")
- Suggested script: copy-pasteable message the tenant can send to the landlord or agent

---

**7. Monthly cost breakdown**

Two columns: at asking price and at negotiated target.

- Rent (asking vs. negotiated target)
- Hydro / electricity (confirmed included or estimated by unit size)
- Water and heat (confirmed included or estimated)
- Internet (confirmed included or estimated)
- Parking (confirmed cost, not included, or unknown — flagged if unknown)
- YMCA or building amenity memberships (if confirmed included)
- **Total estimated monthly cost at asking**
- **Total estimated monthly cost at negotiated target**

The total line is the headline number. It shows the real cost of living there — not just the rent.

---

**8. Building amenities**

Grid of amenities confirmed from the listing description and building data:
- Each amenity shown as a labelled tile with an icon
- Included amenities (gym, pool, internet, etc.) shown in full colour
- Parking shown with a warning state if unconfirmed
- This section directly affects the value assessment — $2,150/month with a gym, pool, sauna, and 1Gbps included is a different value proposition than $2,150/month with nothing

---

**9. Location and lifestyle**

Transit and commute data relevant to a renter's daily life:
- Nearest subway or LRT station with walking distance in minutes
- Estimated commute to downtown core (transit, no transfers if applicable)
- Nearest university or major employer (relevant for student and professional renters)
- Highway access (for car commuters)
- Walk Score and Transit Score
- Walkable daily living rating: restaurants, grocery, pharmacy within walking distance
- Notable nearby landmarks or amenities
- Active construction or noise warnings if detected from municipal permit data

---

**10. SunScout**

Natural light forecast for the unit. Especially useful for tenants who cannot verify light before signing.
- Annual light score (0–100)
- Seasonal grid: December / March / June / September — hours of direct sun per window
- Warning if the den or secondary bedroom has no exterior window
- Plain-English note: "This unit's main living area gets good light year-round. The den has no exterior window and receives zero direct natural light."

---

**11. AI narrative — tenant verdict**

Direct answer: sign at asking / negotiate first / walk away, and the specific reason why.

Free tier: 1 paragraph, 4–5 sentences, 60–120 words.
Pro tier: 2 full paragraphs, 150–280 words.

Gold-standard examples are in spec Section 12.

---

**12. Confirm-before-signing checklist**

Action-oriented checklist of the specific things the tenant must verify before signing anything:
- Each item is a concrete action, not a vague suggestion
- Items are generated dynamically based on which flags fired
- If parking is unconfirmed → "Confirm in writing whether parking is included or what the monthly cost is"
- If glass door bedroom flagged → "Ask landlord to confirm the den has an exterior window and propose installation of a solid door before move-in"
- If rent is above market → "Request a rent reduction to $X before signing — point to the X comparable listings in this building"
- Includes a copy-pasteable negotiation message pre-filled with the specific property details

---

**13. Conversion prompt**

Shown at the very bottom of the report after all sections.
"Thinking about buying a property instead of renting? Analyze any listing as an investment →" — links to Report A flow.
Email capture below it: "Save this report and get notified if the rent drops." Optional opt-in, not required to view the report.

---

## 9. Report D — Landlord rental analysis

Triggered when a for-rent URL is pasted and the user selects "I'm a Landlord." Functionally similar to Report A but starting from rental listing data.

Used by landlords who own or are considering buying a property and want to understand whether the rental income pencils out.

The user inputs (or the system prompts for): the property's purchase price or current value, current mortgage details if owned, actual monthly expenses if owned.

Rent estimate uses the listed rent as the primary input, with comps run alongside to show whether current/planned rent is at, above, or below market.

All Report A modules run (deal scorecard, full metrics, financing scenarios, risk analysis, neighbourhood intelligence, SunScout) with the rental listing data as the starting point.

---

## 10. Deal score formula

Applies to Report A and Report D. Calculated after all modules run. Reproducible — same inputs always produce the same score.

### Component scores

**Cap rate — 25 points maximum**

| Cap rate | Points |
|---|---|
| 6.0% or more | 25 |
| 5.0–5.99% | 20 |
| 4.0–4.99% | 15 |
| 3.0–3.99% | 10 |
| 2.0–2.99% | 5 |
| Under 2.0% | 0 |

**Monthly cash flow — 25 points maximum**

| Cash flow | Points |
|---|---|
| +$500/mo or more | 25 |
| +$200 to +$499 | 20 |
| $0 to +$199 | 13 |
| -$1 to -$300 | 6 |
| -$301 to -$700 | 2 |
| Under -$700 | 0 |

**Cash-on-cash return — 20 points maximum**

| CoC return | Points |
|---|---|
| 8% or more | 20 |
| 6–7.99% | 16 |
| 4–5.99% | 12 |
| 2–3.99% | 8 |
| 0–1.99% | 4 |
| Under 0% | 0 |

**DSCR — 15 points maximum**

| DSCR | Points |
|---|---|
| 1.25x or more | 15 |
| 1.10–1.24x | 12 |
| 1.00–1.09x | 7 |
| 0.85–0.99x | 3 |
| Under 0.85x | 0 |

**Rental demand — 10 points maximum**

| Signal | Points |
|---|---|
| CMHC vacancy under 2% | 4 |
| CMHC vacancy 2–3% | 3 |
| CMHC vacancy 3–5% | 1 |
| CMHC vacancy 5% or more | 0 |
| Rental DOM under 14 days | 3 |
| Rental DOM 14–30 days | 2 |
| Rental DOM over 30 days | 0 |
| 12-month rent trend rising | 3 |
| 12-month rent trend flat | 2 |
| 12-month rent trend declining | 0 |

**Risk flag deductions — applied after subtotal, score floor is 0**

| Flag | Deduction |
|---|---|
| Ontario rent control (pre-Nov 2018) | -5 |
| Condo fee over 25% of gross rent | -4 |
| Pre-1980 build | -3 |
| Flood zone or conservation overlay | -4 |
| Unverified rental unit (basement etc.) | -3 |
| High supply pressure (20+ competing + declining rents) | -2 |
| Year built unknown (rent control undetermined) | -1 |

Maximum total deduction: -15. Score never goes below 0.

### Verdict thresholds

| Score | Label |
|---|---|
| 80–100 | Strong deal — proceed, fundamentals are solid |
| 65–79 | Good deal — proceed with standard due diligence |
| 50–64 | Caution — real issues, model the risks carefully |
| 35–49 | Marginal — significant headwinds, need a specific thesis |
| 20–34 | Do not buy as investment — numbers don't work as rental income |
| 0–19 | Hard pass — fails on multiple fundamental metrics |

---

## 11. Technical architecture

### 11.1 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Backend API | Fastify (Node.js) |
| Database | Supabase (Postgres + Auth + Storage) |
| Scraping workers | Playwright, scheduled jobs on Railway |
| Calc engine | Python FastAPI microservice on Railway |
| AI narrative | Claude API (claude-sonnet-4-6) |
| Maps | Mapbox GL JS |
| Sun path math | NREL SPA via pvlib (runs locally, no API call) |
| School lookup | Google Places API + EQAO/Fraser local database |
| Payments | Stripe |
| PDF generation | Puppeteer (headless Chrome renders report HTML to PDF) |
| Frontend hosting | Vercel |
| Backend services | Railway |

### 11.2 Scraper architecture

**Why two sources exist**

Realtor.ca is the primary Canadian MLS data source. Zillow.ca is the secondary source. Both are supported at MVP.

Realtor.ca HTML scraping is unreliable due to IP-based blocking — the solution is Realtor.ca's internal JSON API (the same endpoints their website uses). This returns clean structured data and is far more stable than browser-based HTML scraping.

**Realtor.ca — internal JSON API**

> **TEMPLATE CODE** — Endpoint URLs, headers, and response field names are based on Realtor.ca's current internal API structure. These will shift without notice. Update endpoint paths and field mappings whenever the scraper breaks.

Realtor.ca loads listing data via internal API calls. These return structured JSON without needing to parse HTML:

```
Base endpoint: https://api2.realtor.ca/Listing.svc/PropertyDetails

Required headers:
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
  Referer: https://www.realtor.ca/
  Content-Type: application/json

The listing ID is extracted from the Realtor.ca URL.
The response includes:
  ListingId, Price, PropertyType
  Building.BathroomTotal, Building.BedroomsAboveGrade
  Property.Address (full structured object)
  Land.SizeTotal (sqft when available)
  Property.Photo[] (photo URLs)
  Tax (annual property tax)
  MaintenanceFee (when present on condo listings)
```

**Zillow.ca — Playwright HTML scraper**

Zillow.ca does not expose a clean internal API. Use Playwright in headless mode to navigate to the listing URL and extract: price, beds, baths, sqft, property type, address, tax history if shown, listing description, photos, listing type (for-sale vs for-rent).

Rate limit: 1 request per 5 seconds. Rotate residential proxies if blocked.

**Fallback — manual entry form**

If either scraper fails or required fields are missing:
- Show a pre-filled form with every field that was successfully extracted
- Missing required fields highlighted in amber ("Not found — enter manually")
- Scraper-sourced fields labelled "auto-filled" in UI; manual fields labelled "user-entered"
- This distinction carries through to the PDF footer

**Rental comps scraper — nightly scheduled job**

Sources: Rentals.ca, Kijiji (rental category), PadMapper
Schedule: Nightly at 2am ET
Process: scrape all active rentals across Ontario by FSA, normalise (geocode address, convert weekly rents to monthly, parse beds to integer), deduplicate (same address + rent + beds within 7 days = one record), store with timestamp. Never delete historical records — accumulation is the moat.

**Comp selection at query time:**
1. Same FSA (first 3 postal code characters) OR within 1km radius, whichever returns more results — max 3km
2. Same bedroom count ±0, expand to ±1 if fewer than 5 results
3. Listed within 90 days, expand to 180 days if fewer than 5
4. Remove outliers: exclude listings over 1.5x or under 0.5x the set median
5. Return 25th/50th/75th percentile rent, comp count, and confidence level

### 11.3 Calc engine

> **TEMPLATE CODE** — Input/output payload structure, field names, and formula implementations are reference patterns. Update as the data model evolves during development.

Python FastAPI microservice. Stateless — no database calls. Takes a JSON payload, returns complete analysis JSON.

```json
Input payload structure:
{
  "property": {
    "address": "5702-5 Buttermill Ave, Vaughan",
    "postal_code": "L4K5W4",
    "province": "ON",
    "price": 729900,
    "property_type": "condo_apartment",
    "beds": 3, "baths": 2, "sqft": 950,
    "annual_taxes": 3326,
    "condo_fee_monthly": 761,
    "condo_fee_known": true,
    "year_built": 2020,
    "year_built_known": true
  },
  "financing": {
    "down_payment_pct": 0.20,
    "mortgage_rate": 0.0479,
    "amortization_years": 25
  },
  "rental_estimate": {
    "low": 2700, "mid": 2900, "high": 3200,
    "comp_count": 8, "confidence": "medium"
  },
  "market": {
    "cmhc_vacancy_rate": 0.018,
    "rental_dom_median": 18,
    "rent_trend_12mo": "declining"
  }
}
```

Output payload includes: all calculated metrics, deal score with component breakdown, all four financing scenarios, and OSFI result.

OSFI stress test: qualifying_rate = max(contract_rate + 0.02, 0.0525). Flag as failing if the qualifying monthly payment exceeds 44% GDS threshold on estimated household income.

### 11.4 Province scope enforcement

MVP scope: Ontario only.

Detection: parse postal code from scraped address. Ontario FSA prefixes: K, L, M, N, P.

Non-Ontario flow: analysis does not run. User sees a province-specific waitlist message. Email stored with province tag for segmented launch notification.

Why this matters: running Ontario LTT on a BC property overstates closing costs by $15,000–$40,000 on a typical $700K purchase. Never run wrong-province calculations — gate cleanly.

Phase 3 expansion order: BC first, then Alberta, then Quebec last.

### 11.5 Database schema

> **TEMPLATE CODE** — Schema is the intended starting structure. Column names, types, and constraints will evolve as features are built. Run all changes as Supabase migrations — never edit schema directly in production.

```sql
users (id uuid PK, email, tier, created_at, stripe_customer_id)

subscriptions (id, user_id FK, tier, status, current_period_end, stripe_subscription_id)

listings (
  id uuid PK,
  source_url text UNIQUE,
  source text,           -- 'realtor_ca', 'zillow_ca', 'manual'
  listing_type text,     -- 'for_sale', 'for_rent'
  address text, postal_code char(6), province char(2),
  price int,
  beds int, baths numeric, sqft int,
  property_type text,
  annual_taxes int, taxes_known bool,
  condo_fee_monthly int, condo_fee_known bool,
  year_built int, year_built_known bool,
  listing_description text,
  photo_urls jsonb,
  days_on_market int,
  scraped_at timestamptz
)

rental_listings (
  id uuid PK,
  source text,           -- 'rentals_ca', 'kijiji', 'padmapper'
  source_url text,
  address text, postal_code char(6),
  lat numeric, lng numeric,
  beds int, baths numeric,
  rent_monthly int,
  sqft int,
  listed_at date,
  scraped_at timestamptz,
  is_active bool,
  raw_json jsonb
)

schools (
  id uuid PK,
  name text,
  school_type text,      -- 'elementary', 'middle', 'high'
  address text, postal_code char(6),
  lat numeric, lng numeric,
  eqao_score numeric,
  fraser_rank_pct int,
  graduation_rate numeric,
  board text,
  data_year int,
  updated_at timestamptz
)

analyses (
  id uuid PK,
  user_id uuid,          -- nullable for guest analyses
  listing_id uuid FK,
  report_mode text,      -- 'investment', 'personal', 'tenant', 'landlord'
  financing_params jsonb,
  rental_estimate jsonb,
  market_data jsonb,
  calculated_metrics jsonb,
  deal_score int,
  risk_flags jsonb,
  ai_narrative text,
  pdf_url text,
  share_token text UNIQUE,
  share_expires_at timestamptz,
  created_at timestamptz
)

portfolio_properties (
  id uuid PK,
  user_id uuid FK,
  address text,
  purchase_price int, purchase_date date,
  original_analysis_id uuid FK,
  current_mortgage_balance int, current_rate numeric,
  current_rent_monthly int, lease_end_date date,
  notes text,
  created_at timestamptz, updated_at timestamptz
)

waitlist (id uuid PK, email text, province char(2), created_at timestamptz)
```

---

## 12. AI narrative spec

> **TEMPLATE CODE** — All prompts below are starting templates. Iterate on wording, tone, and structure based on output quality during development. The gold-standard examples in this section are the quality target — if generated output does not match that quality, refine the prompt, not the examples.

### Purpose

The AI narrative is the final section of every report. It does not repeat the numbers — the numbers are already shown above it. It adds judgment: what does this mean, and what should the reader do?

### Model

Model: claude-sonnet-4-6
Max tokens: 600
Temperature: 0 (fully reproducible — same inputs always produce the same narrative)

### Prompt — Report A and D (investment)

```
You are a senior Canadian real estate investment analyst writing a deal verdict.

PROPERTY: {address}
PRICE: {price}
PROVINCE: {province}
TYPE: {property_type}

METRICS:
- Cap rate: {cap_rate}%
- Monthly cash flow: ${cash_flow_monthly}/mo (annual: ${cash_flow_annual})
- Cash-on-cash return: {coc}%
- DSCR: {dscr}x
- Deal score: {deal_score}/100 — {verdict_label}
- Estimated rent: ${rent_mid}/mo ({comp_count} comparables, confidence: {confidence})
- Break-even rent: ${break_even_rent}/mo
- Condo fee: ${condo_fee_monthly}/mo ({condo_fee_known})
- Rent control: {rent_control_status}
- OSFI stress test: {osfi_result}

RISK FLAGS: {risk_flags_list}
MARKET: Vacancy {vacancy_rate}%, rent trend {rent_trend}

Write a 3-paragraph investment verdict:
1. The single most important fact — the one thing that determines whether to proceed.
2. The 2–3 specific numbers that back this up. Use dollar amounts, not just percentages.
3. One concrete next step or the exact condition under which this deal would work.

Rules: second person ("you"). Be direct. Maximum 280 words. Plain paragraphs only.
No bullet points. Do not mention PropScout. Do not say "as an AI."
Assume the reader has seen all the numbers already — add judgment, not repetition.
```

### Prompt — Report B (personal purchase)

```
You are a real estate advisor helping someone decide whether to buy a home for personal use.

PROPERTY: {address}
ASKING PRICE: {price}
MONTHLY OWNERSHIP COST: ${monthly_total}/mo
FAIR MARKET VALUE: ${fmv_low} – ${fmv_high} based on {comp_count} comparable sales
SCHOOL SUMMARY: {school_summary}
WALK SCORE: {walk_score} | TRANSIT SCORE: {transit_score}

Write a 3-paragraph verdict:
1. Is this priced fairly relative to recent comparable sales?
2. The most important practical consideration for this buyer.
3. What they should do before making an offer.

Rules: second person. Warm but direct. Maximum 240 words. Plain paragraphs only.
Do not mention PropScout.
```

### Prompt — Report C (tenant)

```
You are a tenant advisor reviewing a rental listing.

UNIT: {address}
ASKING RENT: ${asking_rent}/mo
MARKET RANGE: ${rent_low} – ${rent_high}/mo
LEVERAGE: {leverage_level} — {leverage_reason}
FLAGS: {flags_list}
SUNSCOUT: {light_score}/100

Write a 2-paragraph verdict:
1. Is this priced fairly? Should they negotiate, and to what target?
2. The one thing they must confirm before signing.

Rules: second person. Direct. Maximum 180 words. Plain paragraphs only.
Do not mention PropScout.
```

### Narrative length by tier

| Tier | Free | Investor Pro | Professional | Team |
|---|---|---|---|---|
| Report A / D (investment) | 1 short paragraph, 4–5 sentences | Full 3 paragraphs | Full | Full |
| Report B (personal) | 1 short paragraph, 4–5 sentences | Full 3 paragraphs | Full | Full |
| Report C (tenant) | 1 short paragraph, 4–5 sentences | Full 2 paragraphs | Full | Full |

The difference between free and Pro is not "useless vs useful" — free users get a real verdict. The upgrade gives full reasoning, specific numbers, and the precise next action to take.

### Gold-standard examples

**Report A — investment, free tier (Unit 5702, $729,900):**
> This property does not work as a rental investment at the current price. Your total monthly outgoing — mortgage, taxes, insurance, and the $761 condo fee — comes to roughly $4,733 a month. The market will pay around $2,900 in rent. That is a $1,833 monthly shortfall from day one, before a single vacancy or repair. The numbers only make sense if you are betting entirely on price appreciation over a long hold.

**Report A — investment, Pro tier (same property):**
> The $761-per-month condo fee is what ends this deal before it starts. At $9,132 a year, it consumes 26% of the gross rent this unit can realistically earn — before the mortgage, taxes, or insurance are touched. No amount of negotiating on price fully fixes that; the fee is a permanent drag on every calculation.
>
> Run the numbers at current rates and you are looking at $4,733 going out every month against roughly $2,900 coming in. That is $1,833 in the red every single month — $21,996 a year — and the break-even rent of $4,585 is nearly 60% above what the market will actually pay. The DSCR sits at 0.45x, which means most investment mortgage products will not even be available to you here.
>
> The only scenario where this makes sense is as a personal residence, not a rental. If you are buying it to live in and are comfortable with the carrying costs, the location and unit quality are genuinely strong. As a pure investment, pass and keep looking — the VMC corridor has better opportunities at lower condo fee exposure.

**Report C — tenant, free tier (Unit 3705, $2,150/mo asking):**
> The unit is priced above what comparable rentals in this building are actually going for, and one of the two rooms being marketed as a bedroom has a sliding glass door — no solid wall, no sound insulation, and likely no exterior window. You are being asked to pay near-2-bedroom pricing for what functions as a one-bedroom with a den. Before signing anything, confirm whether parking is included and get clarity on the glass door situation.

**Report C — tenant, Pro tier (same unit):**
> Do not sign at $2,150. The building range sits at $1,900–2,100 across all unit types, and the true 2-bedroom median is $2,300 — but this is not a true 2-bedroom. That room has no privacy, no sound barrier, and almost certainly no exterior window. You are being asked to pay a 2-bedroom premium for a 1-bedroom with a study, and the math does not support it.
>
> Your negotiation target is $1,950–2,000 a month. You have real leverage: there are 24 competing rentals in this building right now, the landlord has listed it as available immediately, and you have a documented misrepresentation to point to. Before you go back, confirm two things in writing — does the den have a window, and is parking included or extra. If parking is separate, add $100–150 to the true monthly cost and adjust your offer accordingly.

### Output validation

Before storing or displaying any narrative:
- Free tier: minimum 60 words, maximum 120 words
- Pro tier: minimum 150 words, maximum 320 words
- Must not contain: "as an AI," "I cannot," "PropScout," bullet points, or numbered lists
- Must contain at least one dollar figure
- If validation fails: regenerate once with the same prompt
- If second attempt fails: log failure and display fallback — "AI summary temporarily unavailable — all analysis data above is unaffected"

---

## 13. Data and API stack

### Day-one APIs (MVP)

| Source | Purpose | Cost |
|---|---|---|
| Realtor.ca internal JSON API | For-sale listing data | Free (use at respectful rates) |
| Zillow.ca Playwright scraper | Secondary listing source | Free |
| Rentals.ca / Kijiji / PadMapper scrapers | Nightly rental comps database | Free |
| Walk Score API | Walk Score + Transit Score | ~$50–200/mo |
| Mapbox GL JS | Rental comps map, SunScout arc visualization | Free up to 50K map loads/mo, then usage-based |
| Google Places API | Nearby school discovery by coordinates | ~$0.017/request, budget ~$30–80/mo |
| EQAO open data | Ontario school performance scores | Free — annual public dataset |
| Fraser Institute school data | School rankings for Ontario and BC | Free — scraped annually |
| Bank of Canada | Current mortgage rate feed | Free public API |
| CMHC | Vacancy rates by city | Free public data |
| Statistics Canada | Demographics and income by postal code | Free public data |
| NREL SPA via pvlib | SunScout sun path math | Free — runs locally |
| Claude API | AI narrative generation | ~$20–50/mo at MVP volume |
| Stripe | Subscription payments | 2.9% + $0.30 per transaction |

### Phase 2 APIs

| Source | Purpose | Cost |
|---|---|---|
| AirDNA | STR revenue data for STR vs LTR module | $300–1,000/mo |
| Teranet | Historical sale prices (neighbourhood appreciation) | $5K–20K/yr license |
| Municipal open data | Flood zones, zoning, permits (Toronto, Ottawa etc.) | Free |

### Scraping legal notes

Realtor.ca internal API: uses the same data the website serves to its own users. Legal gray area but standard Canadian proptech practice. Use respectfully — 1 request per 4 seconds max. Pursue formal CREA IDX partnership at 500+ paying users.

Rental listing scrapers (Rentals.ca, Kijiji, PadMapper): publicly listed data with no login wall. Low legal risk. The time-series database built from this is the core competitive moat.

---

## 14. PDF export spec

Generated via Puppeteer — headless Chrome renders the web report HTML and captures it as a PDF. The PDF always matches the web report exactly. No separate PDF template to maintain.

### Pages by report type

**Report A — Investment purchase (8 pages)**

| Page | Content |
|---|---|
| 1 | Property overview: photo, address, price, tags, deal score |
| 2 | Investment metrics: full table |
| 3 | Rental comps: map, rent range, vacancy rate, confidence band |
| 4 | Financing: mortgage scenarios, OSFI result, closing costs, break-even rent |
| 5 | Risk flags: each with severity and investor implication |
| 6 | Neighbourhood data: demographics, walkability, development, price appreciation |
| 7 | AI narrative: full-page, large type, standalone verdict |
| 8 | SunScout: light score, seasonal grid, window breakdown |

**Report B — Personal purchase (6 pages)**

| Page | Content |
|---|---|
| 1 | Property overview |
| 2 | Monthly ownership cost breakdown |
| 3 | Comparable sales and fair market value |
| 4 | School rankings — elementary, middle, high |
| 5 | Neighbourhood intelligence and SunScout |
| 6 | AI narrative |

**Report C — Tenant evaluation (6 pages)**

| Page | Content |
|---|---|
| 1 | Property header + listed vs. reality cards (conditional) + listing accuracy flags |
| 2 | Full unit breakdown + building amenities grid |
| 3 | Rent positioning + negotiation assessment |
| 4 | Monthly cost breakdown + location and lifestyle |
| 5 | SunScout + confirm-before-signing checklist |
| 6 | AI narrative verdict + conversion prompt |

**Branding:**
- Free and Pro: PropScout logo, propscout.ca footer
- Professional tier: user's logo replaces PropScout branding, user's brokerage name and contact in footer
- All reports: "Not financial or legal advice" disclaimer, date/time stamp, report share token as QR code

---

## 15. Revenue model

### Pricing

| Tier | Monthly | Annual |
|---|---|---|
| Free | $0 | — |
| Investor Pro | $10 | $100/yr (2 months free) |
| Professional | $59 | $590/yr (2 months free) |
| Team / REIT | $299+ base | Custom annual contract |

### 18-month MRR target

| Tier | Subscribers | MRR |
|---|---|---|
| Investor Pro | 500 | $5,000 |
| Professional | 80 | $4,720 |
| Team / REIT | 15 | $4,485 |
| Total | 595 | $14,205/mo (~$170K ARR) |

### Additional revenue (Phase 3+)

Market data licensing: anonymized rental comp data sold to banks, pension funds, REITs, CMHC. $5K–$50K/yr per institution. Two or three of these licenses materially changes the revenue profile.

API access: Team tier add-on. $499/mo for 500 calls, $1/call above that.

Implementation fees: Team/REIT onboarding. $2K–$5K one-time setup.

### Unit economics targets

| Metric | Target |
|---|---|
| CAC organic | Under $25 |
| CAC paid | Under $80 |
| LTV Investor Pro (18mo avg retention) | $700 |
| LTV:CAC organic | 8:1 or better |
| Monthly churn Pro | Under 4% |
| Free to paid conversion | 8% or more |

---

## 16. Build roadmap and MVP scope

### MVP definition

A working product that can be shared with real users. Every item below is required. Nothing else ships until these work end-to-end on real Ontario properties.

### Build order (solo developer)

**Weeks 1–2: Data pipeline**
- Realtor.ca internal JSON API scraper — extracts clean property data by listing ID parsed from URL
- Zillow.ca Playwright scraper — secondary source
- Listing type detection (for-sale vs for-rent from URL and page data)
- Rental comps nightly scraper — start accumulating from day one; even 2 weeks of data is better than nothing

**Weeks 2–3: Calc engine**
- All Report A investment metrics in Python FastAPI: NOI, cap rate, cash flow, CoC, DSCR, GRM, break-even, OSFI, Ontario LTT
- Unit test every formula against manual calculations on 5 real properties
- Verify the 5702 Buttermill Ave case produces ~9/100 deal score under the formula

**Weeks 3–4: Frontend skeleton**
- React: URL input bar, validation, listing type detection
- Mode selection modal (investment/personal, tenant/landlord)
- Progress display during scraping
- Basic report layout for all four modes

**Weeks 4–5: School and neighbourhood data**
- Load EQAO dataset into database
- Scrape Fraser Institute rankings for Ontario schools
- Google Places API integration for school discovery by coordinates
- Neighbourhood intelligence module (Walk Score, Statistics Canada, CMHC)

**Weeks 5–6: SunScout module**
- pvlib integration for sun path math
- User inputs window compass direction
- Monthly sun hours calculation
- Light score output
- SVG arc visualization (summer vs winter day)

**Weeks 6–7: AI and PDF**
- Claude API integration — all four narrative prompts with output validation
- Puppeteer PDF generation — all four report types
- PropScout branding in PDF footer

**Weeks 7–8: Auth, payments, access control**
- Supabase auth (email + Google)
- Stripe subscription tiers
- Free tier limits enforced (3 analyses/month, blurred locked sections)
- Shareable link generation (UUID token)

**Weeks 8–10: Testing and polish**
- End-to-end test with 20 real Ontario properties — variety of types (condo, detached, semi, duplex)
- Fix accuracy issues in rental comp estimates
- Mobile responsiveness: scorecard and AI narrative must be readable on phone
- All error states working and tested
- Province gate (non-Ontario properties)

**Share with first users at Week 10.** Do not wait for perfection. Share when it works reliably for Ontario condos and detached houses.

### Not in MVP (Phase 2+)

- BC and Alberta province support
- AirDNA STR vs LTR data (placeholder shown at MVP)
- Teranet historical sales
- SunScout building obstruction (Mapbox 3D)
- White-label PDF branding (Professional tier — can sell the tier, deliver manually until feature ships)
- Portfolio tracker (add post-launch as a retention feature)
- Multi-user Team seats

---

## 17. SunScout module

SunScout calculates when each window of a property receives direct sunlight by hour, by month, across all seasons. Ships at MVP using sun path math only. Building obstruction via Mapbox 3D data is added in Phase 2.

> **TEMPLATE CODE** — Sun path calculation and light score functions below are reference implementations. Window weighting (40/35/25%), the 1,800-hour benchmark, and the monthly sampling approach (15th of each month) are starting assumptions. Adjust based on user feedback and accuracy testing against real properties.

### Dependency

```
pip install pvlib pandas
```

pvlib implements the full NREL SPA algorithm. No external API call — runs entirely in the Python calc engine.

### Core calculation

```python
import pvlib
import pandas as pd

def window_sun_hours_by_month(lat: float, lng: float, window_bearing: float) -> dict:
    """
    Returns hours of direct sun per month for a window at the given compass bearing.
    window_bearing: 0=North, 90=East, 180=South, 270=West
    """
    location = pvlib.location.Location(lat, lng, tz='America/Toronto')
    monthly_hours = {}

    for month in range(1, 13):
        sample_date = pd.Timestamp(f'2026-{month:02d}-15', tz='America/Toronto')
        times = pd.date_range(start=sample_date.replace(hour=5),
                              end=sample_date.replace(hour=21),
                              freq='1h', tz='America/Toronto')
        solar = location.get_solarposition(times)
        hours = 0
        for _, row in solar.iterrows():
            if row['apparent_elevation'] <= 0:
                continue
            angle_diff = abs((row['azimuth'] - window_bearing + 180) % 360 - 180)
            if angle_diff <= 90:
                hours += 1
        monthly_hours[month] = hours

    return monthly_hours


def annual_light_score(windows: dict) -> int:
    """
    windows: dict of window_name -> monthly_hours dict
    Weights: main bedroom 40%, living area 35%, other 25%
    Benchmark: 1,800 weighted annual hours = score of 100
    """
    weights = {'bedroom_main': 0.40, 'living': 0.35}
    weighted_annual = 0
    for name, monthly in windows.items():
        weight = weights.get(name, 0.25)
        weighted_annual += sum(monthly.values()) * weight
    return min(100, int(weighted_annual / 1800 * 100))
```

### What the user sees

1. Annual light score with a visual gauge
2. Seasonal grid: columns = Dec / Mar / Jun / Sep, rows = named windows, values = hours of direct sun
3. Sun arc SVG: summer day arc vs winter day arc over the property's location
4. Plain-English implication note (included in AI narrative input for Report A and B)

### Score interpretation

| Score | Meaning |
|---|---|
| 80–100 | Excellent — notably bright, strong tenant and buyer appeal |
| 60–79 | Good — above average |
| 40–59 | Average |
| 20–39 | Below average — worth noting in listing communications |
| 0–19 | Poor — affects tenant retention and rental demand over time |

### Phase 2 — building obstruction

When Mapbox 3D building tiles are added: for each hour where sun path math says the window is lit, check whether any neighboring building within 100m subtends a vertical angle larger than the sun's altitude. Deduct blocked hours. This makes the score accurate in dense urban environments where adjacent towers cast shadows.

---

## 18. Domain and naming

### Domain status (checked May 2026)

| Domain | Status |
|---|---|
| propscout.com | Taken — US real estate coaching platform (Vero Beach, FL) |
| propscout.ca | Appears available — no DNS record, no Canadian business using it |
| propscout.io | Taken |
| propscout.co | Taken |

### Recommendation

Register **propscout.ca** immediately (~$15/yr at Namecheap or GoDaddy). The .ca extension is actually ideal:
- Signals Canadian focus to users — appropriate for an Ontario-first product
- Creates clear separation from the US PropScout company
- Resonates better with Canadian buyers, investors, and agents

The US PropScout (propscout.ai) is a different product, different market, no legal conflict. The .ca makes the distinction clean.

### Before committing to the name

1. Check for Canadian trademark registration: Canadian Intellectual Property Office at cipo.ic.gc.ca — search "PropScout" in the software and real estate service categories
2. Confirm social handles available: @propscoutca on X, Instagram, LinkedIn
3. If changing the name: do it before Stripe, email templates, and Supabase auth setup — the name appears in billing descriptors, legal agreements, and user-facing emails

"PropScout" works well for all four user types: investors scouting deals, buyers scouting homes, tenants scouting rentals, agents scouting for clients. Keep it unless the trademark search surfaces a conflict.

---

## 19. Listing description extraction pipeline

> **TEMPLATE CODE** — All code snippets in this section are reference implementations showing the intended pattern and architecture. They are starting points only. Update regex patterns, flag types, confidence thresholds, model versions, and prompt wording as development progresses. The architecture pattern (regex → AI extraction → logic gate → calc engine → narrative) is fixed. Everything else evolves.

### The problem

Realtors are incentivised to obscure negatives. A glass-door den becomes "a versatile second bedroom." A basement unit becomes "a finished lower level retreat." A missing parking space becomes "parking available — inquire with management." If PropScout feeds raw listing descriptions directly into the deal score or AI narrative, it will eventually misread creative marketing language as factual property data — and users will lose trust in the score.

The solution is to treat the listing description as untrusted input that must pass through a structured extraction pipeline before any number is calculated or any flag is set. The deal score is always derived from validated structured data, never from an AI reading marketing copy directly.

### Pipeline architecture

```
Raw listing description (unstructured text)
        |
Step 1: Deterministic regex rules
        |  (catches obvious flags — never hallucinate)
        |
Step 2: Claude Haiku extraction
        |  (structured JSON output only — handles gray areas regex misses)
        |
Step 3: Logic gate
        |  (merges regex + AI results, applies confidence thresholds)
        |
Step 4: Python calc engine
        |  (runs all math on validated flags and structured data only)
        |
Step 5: Claude Sonnet narrative
           (writes verdict from hard numbers — never reads raw description)
```

Steps 1–3 run as a single pre-processing service before the calc engine is called. The calc engine and narrative prompt never receive the raw listing description — only the validated structured output from Step 3.

### Step 1 — Deterministic regex (runs first, always)

Regex never hallucinates. It catches the most common patterns before any AI is involved. Flags set by regex get confidence 100 and cannot be overridden by the AI result.

```python
import re

GLASS_DOOR_PATTERNS = [
    r'glass\s*(door|partition|wall|sliding)',
    r'sliding\s*(door|glass)',
    r'frosted\s*(glass|door)',
    r'french\s*door',
    r'barn\s*door',
]

BASEMENT_PATTERNS = [
    r'lower\s*level',
    r'basement',
    r'below\s*grade',
    r'walk[\s-]?out',
    r'ground\s*floor\s*unit',
]

PARKING_UNCLEAR_PATTERNS = [
    r'parking.*contact',
    r'parking.*available',
    r'parking.*inquire',
    r'parking.*manager',
    r'parking\s*n/?a',
]

UNVERIFIED_BEDROOM_PATTERNS = [
    r'den',
    r'study',
    r'flex\s*space',
    r'home\s*office',
    r'can\s*be\s*(used\s*as\s*)?a?\s*bedroom',
    r'convert(ed|ible)\s*(den|office|space)',
]

SPECIAL_ASSESSMENT_PATTERNS = [
    r'special\s*assessment',
    r'reserve\s*fund\s*(study|review|update)',
    r'upcoming\s*(repair|work|project)',
]

def deterministic_flags(description: str) -> dict:
    text = description.lower()
    return {
        "glass_door_bedroom": any(re.search(p, text) for p in GLASS_DOOR_PATTERNS),
        "is_basement_unit":   any(re.search(p, text) for p in BASEMENT_PATTERNS),
        "parking_unclear":    any(re.search(p, text) for p in PARKING_UNCLEAR_PATTERNS),
        "unverified_bedroom": any(re.search(p, text) for p in UNVERIFIED_BEDROOM_PATTERNS),
        "special_assessment_risk": any(re.search(p, text) for p in SPECIAL_ASSESSMENT_PATTERNS),
    }
```

### Step 2 — Claude Haiku extraction (handles gray areas only)

Claude Haiku runs on every listing description where at least one flag was not caught by regex, or where the property type is condo (higher risk of misrepresentation). Cost is approximately $0.00025 per call — negligible.

The extraction prompt instructs the model to output strict JSON only with no preamble, no explanation, and no markdown. It must default to false on ambiguity.

```python
EXTRACTION_PROMPT = """
Analyze this real estate listing description.
Output ONLY valid JSON. No explanation. No preamble. No markdown formatting.

For each field: if ambiguous or not clearly stated, default to false.
Include a confidence score 0-100 and a short reason for each flag.

Return exactly this structure:
{
  "unverified_bedroom":      {"value": bool, "confidence": int, "reason": str},
  "glass_door_bedroom":      {"value": bool, "confidence": int, "reason": str},
  "is_basement_unit":        {"value": bool, "confidence": int, "reason": str},
  "parking_unclear":         {"value": bool, "confidence": int, "reason": str},
  "illegal_unit_risk":       {"value": bool, "confidence": int, "reason": str},
  "special_assessment_risk": {"value": bool, "confidence": int, "reason": str},
  "no_exterior_window":      {"value": bool, "confidence": int, "reason": str}
}

Examples of language that should trigger flags:
- "versatile second room" or "perfect home office" -> unverified_bedroom: true
- "open concept sleeping area" -> unverified_bedroom: true
- "glass partition" or "barn door" -> glass_door_bedroom: true
- "finished lower level" -> is_basement_unit: true
- "parking available upon request" -> parking_unclear: true
- "separate entrance" on a unit described as lower level -> illegal_unit_risk: true

Listing description:
{description}
"""
```

```python
import anthropic
import json

client = anthropic.Anthropic()

def ai_extraction(description: str) -> dict:
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        temperature=0,
        messages=[{
            "role": "user",
            "content": EXTRACTION_PROMPT.format(description=description)
        }]
    )

    raw = response.content[0].text.strip()

    # Strip any accidental markdown fences
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # If JSON parsing fails, return all flags as false with confidence 0
        # and log the failure for review
        log_extraction_failure(description, raw)
        return {flag: {"value": False, "confidence": 0, "reason": "parse_error"}
                for flag in ["unverified_bedroom", "glass_door_bedroom", "is_basement_unit",
                             "parking_unclear", "illegal_unit_risk", "special_assessment_risk",
                             "no_exterior_window"]}
```

### Step 3 — Logic gate (merges results, applies confidence thresholds)

The logic gate merges regex and AI results. Regex always wins if it fired. AI results are accepted or downgraded based on confidence thresholds.

```python
RED_FLAG_THRESHOLD   = 85   # AI confident — red flag, deal score deduction applies
AMBER_FLAG_THRESHOLD = 60   # AI uncertain — amber soft warning only, no deduction

def resolve_flags(regex_flags: dict, ai_flags: dict) -> dict:
    final = {}

    all_flag_names = set(regex_flags.keys()) | set(ai_flags.keys())

    for flag_name in all_flag_names:
        regex_hit  = regex_flags.get(flag_name, False)
        ai_result  = ai_flags.get(flag_name, {"value": False, "confidence": 0, "reason": ""})
        confidence = ai_result.get("confidence", 0)
        ai_value   = ai_result.get("value", False)

        if regex_hit:
            # Deterministic rule fired — always red, always deducts from score
            final[flag_name] = {
                "active":     True,
                "severity":   "red",
                "source":     "deterministic",
                "confidence": 100,
                "reason":     "Matched keyword pattern in listing description",
                "deducts_score": True,
                "user_override": False,
            }

        elif ai_value and confidence >= RED_FLAG_THRESHOLD:
            # AI confident — red flag, deducts from deal score
            final[flag_name] = {
                "active":     True,
                "severity":   "red",
                "source":     "ai_high_confidence",
                "confidence": confidence,
                "reason":     ai_result.get("reason", ""),
                "deducts_score": True,
                "user_override": False,
            }

        elif ai_value and confidence >= AMBER_FLAG_THRESHOLD:
            # AI uncertain — soft warning only, no score deduction
            final[flag_name] = {
                "active":     True,
                "severity":   "amber",
                "source":     "ai_low_confidence",
                "confidence": confidence,
                "reason":     ai_result.get("reason", ""),
                "deducts_score": False,  # Never deduct on uncertain flags
                "user_override": False,
            }

        else:
            final[flag_name] = {"active": False}

    return final
```

**Confidence threshold rules:**

| Source | Confidence | Severity shown | Deducts deal score |
|---|---|---|---|
| Regex match | 100 (always) | Red flag | Yes |
| AI result | 85–100 | Red flag | Yes |
| AI result | 60–84 | Amber soft warning | No |
| AI result | 0–59 | Not shown | No |

### Step 4 — User override toggles (UI)

Every flag displayed in the report has a toggle next to it. If the user knows the AI got it wrong, they flip the toggle and the deal score recalculates instantly. No page reload. No re-running the AI.

UI behaviour:
- Red flag with toggle off → flag disappears from the risk section, deal score deduction removed, score updates live
- Amber warning with toggle off → warning disappears
- Toggle state is saved to the analysis record in Supabase so it persists if the user returns to the report

```typescript
// React — flag component with override toggle
interface FlagProps {
  name:        string
  severity:    'red' | 'amber'
  reason:      string
  confidence:  number
  deductsScore: boolean
  onOverride:  (flagName: string, overridden: boolean) => void
}

function RiskFlag({ name, severity, reason, confidence, deductsScore, onOverride }: FlagProps) {
  const [overridden, setOverridden] = useState(false)

  const handleToggle = () => {
    const next = !overridden
    setOverridden(next)
    onOverride(name, next)  // triggers deal score recalc in parent
  }

  if (overridden) return null  // hidden when user says AI was wrong

  return (
    <div className={`flag flag-${severity}`}>
      <div className="flag-content">
        <p className="flag-title">{name}</p>
        <p className="flag-reason">{reason}</p>
        {confidence < 85 && (
          <p className="flag-confidence">
            Confidence: {confidence}% — verify before acting on this
          </p>
        )}
      </div>
      <button
        className="flag-override-btn"
        onClick={handleToggle}
        title="Mark as incorrect"
      >
        This is wrong
      </button>
    </div>
  )
}
```

Every user override is logged to a `flag_overrides` table in Supabase. This becomes labelled training data to improve the extraction prompt over time.

```sql
flag_overrides (
  id uuid PK,
  analysis_id uuid FK,
  listing_id uuid FK,
  flag_name text,
  ai_value bool,
  ai_confidence int,
  user_override bool,
  created_at timestamptz
)
```

### Step 5 — What the narrative prompt receives

The Claude Sonnet narrative prompt (Section 12) never receives the raw listing description. It receives only the validated structured output from Steps 1–3 — hard numbers and confirmed flags.

```python
# What gets passed to the narrative prompt
narrative_input = {
    "address":             "5702-5 Buttermill Ave, Vaughan",
    "price":               729900,
    "cap_rate":            2.5,
    "cash_flow_monthly":   -1833,
    "dscr":                0.45,
    "deal_score":          9,
    "condo_fee_monthly":   761,
    "rent_trend":          "declining",
    "confirmed_flags": [
        "high_supply_pressure",    # from market data
        "condo_fee_high",          # from calc engine
    ],
    # No raw description. No unvalidated text. Never.
}
```

### Golden dataset — build before MVP ships

A regression test suite of 50–100 real Ontario listing descriptions with known correct outputs. Run automatically on every change to the extraction prompt or model version. If accuracy drops below 95%, the build fails and the change is reverted.

**Test structure:**

```python
# pytest
import pytest
from extraction import deterministic_flags, ai_extraction, resolve_flags

golden_cases = [
    {
        "description": "The second room works beautifully as a home office or creative studio.",
        "expected":    {"unverified_bedroom": True},
    },
    {
        "description": "Open concept den with glass partition — perfect flex space.",
        "expected":    {"unverified_bedroom": True, "glass_door_bedroom": True},
    },
    {
        "description": "Finished lower level with separate entrance and full kitchen.",
        "expected":    {"is_basement_unit": True, "illegal_unit_risk": True},
    },
    {
        "description": "Spacious primary bedroom with 4-piece ensuite and walk-in closet.",
        "expected":    {"unverified_bedroom": False, "is_basement_unit": False},
    },
    {
        "description": "Parking available — please inquire with building management.",
        "expected":    {"parking_unclear": True},
    },
    {
        "description": "Rare corner unit on the 37th floor. 2 true bedrooms, 2 full baths.",
        "expected":    {"unverified_bedroom": False, "is_basement_unit": False},
    },
]

@pytest.mark.parametrize("case", golden_cases)
def test_extraction_accuracy(case):
    regex   = deterministic_flags(case["description"])
    ai      = ai_extraction(case["description"])
    final   = resolve_flags(regex, ai)

    for flag, expected_value in case["expected"].items():
        actual = final.get(flag, {}).get("active", False)
        assert actual == expected_value, (
            f"Flag '{flag}' expected {expected_value}, got {actual}\n"
            f"Description: {case['description']}"
        )
```

**Accuracy target:** 95% or above across all golden dataset cases before MVP ships. Re-run the full suite whenever the extraction prompt changes, the Haiku model version changes, or new flag types are added.

**Building the golden dataset:** Search Realtor.ca and Zillow.ca for listings with known issues — glass-door dens marketed as bedrooms, basement units with creative descriptions, missing parking. Save the raw description and manually label the correct flags. Aim for at least 10 examples of each flag type, including negative examples (descriptions that should NOT trigger the flag).

### Summary — what this architecture guarantees

| Guarantee | How it's enforced |
|---|---|
| Deal score is never based on AI guessing | Calc engine only receives validated structured flags, never raw text |
| Obvious flags never missed | Regex runs first and cannot be overridden by AI |
| Uncertain flags don't punish the score | Confidence below 85% → amber warning only, zero score deduction |
| Users stay in control | Override toggle on every flag, instant score recalc |
| Accuracy is measurable and provable | Golden dataset + automated regression tests before every release |
| Failures are caught before users see them | JSON parse failures log and default to safe (all false) rather than crashing |


---

*PropScout · Platform Spec v3 · May 2026 · This document supersedes all prior drafts. All development decisions reference this version.*
