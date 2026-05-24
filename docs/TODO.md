# PropScout — Full Backlog

Last updated: May 2026
Reference spec: `propscout_platform_spec.md`
For MVP scope only, see: `MVP_TODO.md`

---

## Phase 1 — MVP

See `MVP_TODO.md` for the granular task breakdown.
High-level MVP deliverables:

- [ ] Realtor.ca internal JSON API scraper
- [ ] Zillow.ca Playwright scraper
- [ ] Listing type detection (for-sale vs for-rent)
- [ ] Mode selection modal (investment / personal / tenant / landlord)
- [ ] Python calc engine — all Report A metrics + OSFI + Ontario LTT
- [ ] Rental comps scraper (nightly — Rentals.ca + Kijiji + PadMapper)
- [ ] Listing description extraction pipeline (Section 19)
- [ ] Golden dataset regression tests (50+ cases, 95% accuracy gate)
- [ ] Report A — Investment purchase (full)
- [ ] Report B — Personal purchase (full, including school rankings)
- [ ] Report C — Tenant evaluation (full, no login)
- [ ] Report D — Landlord rental analysis (full)
- [ ] Deal score formula (Section 10) — deterministic, tested
- [ ] SunScout — sun path + light score (no building obstruction)
- [ ] School rankings — EQAO + Fraser Institute + Google Places
- [ ] Claude Haiku extraction pipeline
- [ ] Claude Sonnet narrative (all 4 report modes, free + pro lengths)
- [ ] Supabase auth (email + Google)
- [ ] Stripe subscriptions (Free, Pro $10, Professional $59, Team $299)
- [ ] Free tier gates (10 analyses/month, PDF locked, portfolio locked)
- [ ] PDF export — Puppeteer, all 4 report types
- [ ] Shareable links (UUID token, 30-day expiry)
- [ ] Province gate (non-Ontario → waitlist)
- [ ] Manual entry fallback (when scraper fails)
- [ ] User override toggles on risk flags
- [ ] flag_overrides table logging
- [ ] Mobile responsiveness (scorecard + AI narrative minimum)
- [ ] Error states (all cases from spec Section 5)
- [ ] Vercel deployment (frontend)
- [ ] Railway deployment (Fastify API + Python calc engine + scrapers)

---

## Phase 2 — Post-launch additions

### Data and accuracy
- [ ] Teranet historical sale data integration (neighbourhood appreciation)
- [ ] Building obstruction for SunScout (Mapbox 3D tiles) — unlocks at Investor Pro
- [ ] MPAC year-built lookup (improves rent control detection accuracy)
- [ ] Municipal open data — flood zones, zoning, building permits (Toronto, Ottawa, Hamilton)
- [ ] Window direction auto-inference from satellite imagery (SunScout improvement)
- [ ] AirDNA STR revenue data integration (STR vs LTR module)

### Features
- [ ] STR vs LTR analysis — full module (spec Section 6, item 8)
- [ ] Portfolio tracker — full implementation (capped at 10 for Pro, unlimited for Professional+)
- [ ] Lease expiry tracker (60 and 90 day alerts)
- [ ] Performance vs projections (actual vs estimated rent at time of purchase)
- [ ] Comparable recent sales (Teranet-powered, replaces scraped estimates)
- [ ] White-label PDF branding (Professional tier — user logo + brokerage name)
- [ ] Permanent client sharing links (Professional tier)
- [ ] Bulk URL analysis via CSV upload (Professional tier)

### Geographic expansion
- [ ] BC province support — BC PTT closing costs, different landlord rules
- [ ] Alberta province support — no LTT, different market dynamics

### Platform
- [ ] Email notification system (rent drop alerts, lease expiry, waitlist)
- [ ] Analysis history page (full list, filterable)
- [ ] Saved searches / watchlist

---

## Phase 3 — Scale and revenue expansion

### Platform
- [ ] Multi-user Team seats (5–20+ users per account)
- [ ] Team admin dashboard (seat management, usage reporting)
- [ ] API access for external partners (Team tier add-on)
- [ ] CRM export (CSV, Excel)
- [ ] Quebec province support (civil law, different landlord rules — last province)

### Data licensing
- [ ] Anonymized rental comp data product (monthly exports by postal code)
- [ ] Institutional data licensing outreach (banks, pension funds, REITs, CMHC)
- [ ] Neighbourhood heat maps (publishable market reports)
- [ ] Weekly investor digest email (free tier acquisition driver)

### Partnerships
- [ ] CREA IDX partnership conversations (requires 500+ paying users first)
- [ ] Agent referral program
- [ ] Mortgage broker white-label integration

---

## Ongoing / never done

- [ ] Golden dataset expansion (add new cases as edge cases are discovered)
- [ ] Extraction prompt tuning (run regression tests after every change)
- [ ] Rental comps database quality monitoring
- [ ] Scraper maintenance (Realtor.ca and Zillow.ca break without warning)
- [ ] Model version updates (Haiku and Sonnet — test before upgrading)
- [ ] Spec document kept in sync with actual code
- [ ] API cost monitoring (Walk Score, Mapbox, Google Places, Claude, Stripe)
