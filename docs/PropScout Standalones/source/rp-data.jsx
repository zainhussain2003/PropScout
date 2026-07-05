// rp-data.jsx — canonical demo fixtures for the four report surfaces.
//
// Data discipline (locked surfaces are the source of truth):
//   Buttermill (investor + personal): $729,900 · $761/mo fee · $3,326/yr taxes ·
//     cap 2.48% · cash flow −$1,833 · DSCR ~0.45 · OSFI @ 6.79% fails at $125K ·
//     deal score 8/100 "Hard pass"        — matches Landing v2 + Mode Modal.
//   Charles St E (tenant + landlord): Unit 2314 · 28 Charles Street East ·
//     $2,650/mo asking · building median $2,480 · 31 days listed · 2 bed · 2 bath
//     · 780 sqft                          — matches Mode Modal + Landing v2.
//
// Headline metrics are treated as the CALC-ENGINE RESPONSE (the live app never
// re-derives them on the frontend); enrichment extras (LTT rows, OSFI, expenses,
// equity curve) are derived exactly as ReportPage.tsx derives them.

// ── Buttermill — listing (ReportPage.toListingData shape) ─────────────────────

const BUTTERMILL_LISTING = {
  id: 'buttermill',
  addressLine1: 'Unit 5702 · 5 Buttermill Avenue',
  addressLine2: 'Vaughan · L4K · VMC Corridor',
  postal: 'L4K 5W4',
  province: 'ON',
  isToronto: false,
  propertyType: 'Condo apartment',
  beds: '3',
  baths: '2',
  sqft: 950,
  parking: '1',
  yearBuilt: 2020,
  yearBuiltKnown: true,
  rentControl: false, // built after Nov 15 2018
  price: 729900,
  annualTaxes: 3326,
  condoFeeMonthly: 761,
  rentEstimate: 2900,
  rentLow: 2700,
  rentHigh: 3200,
  // Honest default: the scraper found too few comps — low confidence, inset shown.
  compCount: 2,
  compConfidence: 'low',
  market: { cmhcVacancy: 0.018, rentalDOM: 18, rentTrend: 'declining' },
  riskFlags: [
    { id: 'condo_fee', tone: 'red', label: 'Condo-fee burden', detail: '$761/mo · 26% of estimated gross rent (threshold 20%)', deduct: 4 },
    { id: 'cash_flow', tone: 'red', label: 'Deeply negative cash flow', detail: 'Break-even rent $4,585 vs. market $2,900', deduct: 0 },
    { id: 'supply', tone: 'amber', label: 'Building supply pressure', detail: '24 active rentals in same building · trend declining', deduct: 2 },
  ],
  // ReportPage.buildChips() output for this listing
  chips: ['3 bed', '2 bath', '950 sqft', 'Built 2020', 'Condo apartment', '1 parking', '$761/mo condo fee'],
};

// Calc-engine response — headline metrics are canonical, never re-derived here.
const BUTTERMILL_METRICS = {
  cashFlowMonthly: -1833,
  cashFlowAnnual: -21996,
  capRate: 0.0248,
  cashOnCashReturn: -0.1374,
  dscr: 0.45,
  grm: 20.97,
  noi: 18113,
  mortgagePaymentMonthly: 3342,
  downPayment: 145980,
  mortgageAmount: 583920,
  amortizationYears: 25,
  mortgageRate: 0.0479,
  breakEvenRent: 4585,
  closingCostsTotal: 3000,
  lttProvincial: 11073,
  lttMunicipal: 0,
  hasSanityWarnings: false,
};

// Calc-engine deal score — gated, floored; frontend only decorates it.
const BUTTERMILL_DEAL_SCORE = {
  total: 8,
  displayTotal: 8,
  verdict: 'hard_pass',
  breakdown: {
    capRate: 0, cashFlow: 0, cashOnCash: 0, dscr: 0, demand: 3,
    subtotal: 3, deduction: 6,
    componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
  },
};

// Scout AI narrative — first sentence is the Landing v2 verdict line.
const BUTTERMILL_NARRATIVE =
  'The $761 condo fee ends this deal before it starts — 26% of gross rent, gone before the mortgage. ' +
  'At $729,900 with market rent near $2,900, the unit clears \u2212$1,833 a month at 20% down, and a DSCR of 0.45 is less than half of what a lender wants to see. ' +
  'OSFI qualification at the 6.79% stress rate fails at a $125,000 household income. ' +
  'Nothing here is a data problem — the price simply does not pencil as a rental.';

// Default financing per spec — 20% down, 4.79%, 25-yr amort, $125K income.
const BUTTERMILL_FINANCING = {
  downPaymentPct: 0.2,
  mortgageRate: 0.0479,
  amortizationYears: 25,
  includeManagementFee: false,
  isToronto: false,
  appreciationRate: 0.03,
  assumedIncome: 125000,
};

// SunScout — geocode confirmed for this address; pvlib output (demo fixture).
const BUTTERMILL_SUNSCOUT = {
  annualPeakSunHours: 1512,
  summerDailyHours: 6.1,
  winterDailyHours: 1.8,
  seasonalGrid: { Dec: 52, Mar: 110, Jun: 184, Sep: 132 },
  monthlyHours: [62, 78, 110, 138, 168, 184, 188, 168, 132, 96, 64, 52],
  sunScore: 84,
  verdict: 'excellent',
};

// ── Buttermill — personal-buyer shim output (reportShims.shimToPersonalProperty)

const BUTTERMILL_PERSONAL = {
  addressLine1: 'Unit 5702 · 5 Buttermill Avenue',
  addressLine2: 'Vaughan · L4K',
  postal: 'L4K 5W4',
  province: 'ON',
  toronto: false,
  propertyType: 'Condo apartment',
  beds: '3',
  baths: '2',
  sqft: 950,
  parking: '1 spot',
  yearBuilt: 2020,
  lotSize: '',
  price: 729900,
  daysOnMarket: 0, // not scraped — "Listed N days ago" strip hidden
  priceChange: { abs: 0, direction: null },
  annualTaxes: 3326,
  condoFeeMonthly: 761,
  // Sqft-scaled utility estimates (shim behaviour)
  utilityEstMonthly: { hydro: 95, gas: 62, water: 40, internet: 65 },
  insuranceMonthlyEst: 213, // price × 0.35% / 12
  chips: ['Personal use · For sale', 'Vaughan · L4K', 'Condo apartment · 950 sqft', 'Built 2020'],
  // FMV pinned to asking ±5% — estimate, not comp-derived (isEstimated)
  fmv: { low: 693405, mid: 729900, high: 766395, askingVsMid: 0 },
  defaultDownPct: 0.2,
  defaultRate: 0.0479,
  defaultAmort: 25,
};

// Personal-mode risk flags (listing-text parse — no investor cash-flow flags)
const BUTTERMILL_PERSONAL_FLAGS = [
  { severity: 'amber', label: 'Condo-fee burden', evidence: '$761/mo — budget it into your monthly carry before comparing to rent' },
  { severity: 'amber', label: 'High supply in building', evidence: '24 active rentals and resales in the tower — competition if you ever need to exit' },
];

// Personal neighbourhood — shimToPersonalNeighbourhood(analysis): Walk Score is
// live; everything else honestly zeroed until Phase 2 data lands.
const BUTTERMILL_PERSONAL_NEIGH = {
  walkScore: 72,
  transitScore: 85,
  bikeScore: 58,
  walkSub: 'Very walkable',
  transitSub: '',
  bikeSub: '',
  avgIncome: 0,
  popGrowth5y: 0,
  ppsqftTrend: 'N/A',
  appreciation5y: 0,
  appreciation10y: 0,
  buildingPermits: 0,
  distances: [],
};

// Scout AI narrative — personal (home-buyer) mode.
const BUTTERMILL_PERSONAL_NARRATIVE =
  'At $729,900 this unit costs about $5,160 a month to own all-in — roughly $1,820 on top of the mortgage payment itself. ' +
  'We could not verify the asking price against comparable sales yet, so treat the value range below as the estimate it is. ' +
  'The light is genuinely good for a tower unit and the VMC subway is at your door; the monthly carry is the number to negotiate from.';

// Sample comparables shown with the "Sample comparables" label (live behaviour:
// PBSalesSection receives the design fixture with isSampleData=true).
const PB_SAMPLE_COMPS = [
  { addr: '262 Mountcrest Avenue', beds: '3', baths: '2', sqft: 1640, sold: 882000, soldDate: 'Apr 2026', dom: 9, ppsqft: 538, distance: '0.05 km' },
  { addr: '124 Iroquois Avenue', beds: '3', baths: '2', sqft: 1580, sold: 868000, soldDate: 'Mar 2026', dom: 14, ppsqft: 549, distance: '0.4 km' },
  { addr: '17 Lakeland Drive', beds: '4', baths: '2', sqft: 1720, sold: 905000, soldDate: 'Mar 2026', dom: 7, ppsqft: 526, distance: '0.6 km' },
  { addr: '88 Sunnyhurst Crescent', beds: '3', baths: '3', sqft: 1610, sold: 891000, soldDate: 'Feb 2026', dom: 11, ppsqft: 553, distance: '0.8 km' },
  { addr: '305 Mountcrest Avenue', beds: '3', baths: '2', sqft: 1530, sold: 845000, soldDate: 'Feb 2026', dom: 18, ppsqft: 552, distance: '0.2 km' },
  { addr: '440 Plains Road East', beds: '3', baths: '2', sqft: 1680, sold: 858000, soldDate: 'Jan 2026', dom: 22, ppsqft: 511, distance: '1.1 km' },
  { addr: '76 Orchard Avenue', beds: '4', baths: '2', sqft: 1750, sold: 921000, soldDate: 'Jan 2026', dom: 6, ppsqft: 526, distance: '1.3 km' },
  { addr: '511 Stephenson Drive', beds: '3', baths: '2', sqft: 1560, sold: 836000, soldDate: 'Dec 2025', dom: 15, ppsqft: 536, distance: '0.9 km' },
];

// ── Charles Street East — shared identity (tenant + landlord) ─────────────────

const CHARLES_ADDRESS_1 = 'Unit 2314 · 28 Charles Street East';
const CHARLES_ADDRESS_2 = 'Toronto · M4Y · Bay Corridor';
const CHARLES_SLUG = 'unit-2314-28-charles-street-east';

const CHARLES_ASKING = 2650;       // /mo
const CHARLES_COMPS = {
  low: 2350,                       // building P25
  mid: 2480,                       // building P50 — "building median $2,480"
  high: 2620,                      // building P75
  compCount: 12,
  confidence: 'high',
};
const CHARLES_DOM = 31;            // "31 days listed"

// Tenant chips — ReportPage.buildChips() (year built not scraped → omitted)
const CHARLES_TENANT_CHIPS = ['2 bed', '2 bath', '780 sqft', 'Condo apartment'];

// Listing-accuracy flags (analysis.riskFlags, tenant mode)
const CHARLES_TENANT_FLAGS = [
  {
    id: 'den_bedroom', severity: 'red',
    label: 'Listed as 2 bed — second room may be a den',
    evidence: '"Versatile second bedroom/den with sliding doors" · a bedroom requires a window and a door',
  },
  {
    id: 'parking', severity: 'amber',
    label: 'Parking status unclear',
    evidence: '"Parking available — contact listing agent" · typically $150–200/mo extra in this building',
  },
];

// Scout AI narrative — tenant mode. Target figures match the Landing v2 mock
// ($2,450–2,500 target · $1,800–2,400 saved over a 12-mo lease).
const CHARLES_TENANT_NARRATIVE =
  'At $2,650 you would be paying $170 above the building median — and after 31 days on the market, this landlord knows it. ' +
  'Two-bed units in this building closed between $2,350 and $2,620 over the last 60 days. ' +
  'A documented offer at $2,450–2,500 is aggressive but defensible, and over a 12-month lease it keeps $1,800–2,400 in your pocket.';

// Schools near 28 Charles St E — from the schools table (nearest by distance).
// Attendance boundaries are NOT ingested — no catchment claims (honest default).
const CHARLES_SCHOOLS = {
  elementary: [
    { board: 'public', boardLabel: 'Public · TDSB', name: 'Jesse Ketchum Jr & Sr PS', grades: 'JK–8', distance: '0.6 km', walk: '8 min', quality: 'above', inCatchment: false },
    { board: 'catholic', boardLabel: 'Catholic · TCDSB', name: "St. Michael's Catholic School", grades: 'JK–8', distance: '0.9 km', walk: '11 min', quality: 'avg', inCatchment: false },
    { board: 'french', boardLabel: 'French · CSViamonde', name: 'Lord Lansdowne French Immersion', grades: 'SK–6', distance: '1.4 km', walk: '17 min', quality: 'above', inCatchment: false },
  ],
  middle: [
    { board: 'public', boardLabel: 'Public · TDSB', name: 'Lord Dufferin PS · Gr 7–8', grades: '7–8', distance: '0.9 km', walk: '11 min', quality: 'avg', inCatchment: false },
    { board: 'catholic', boardLabel: 'Catholic · TCDSB', name: 'St. Paul Catholic · Gr 7–8', grades: '7–8', distance: '1.2 km', walk: '14 min', quality: 'avg', inCatchment: false },
  ],
  high: [
    { board: 'public', boardLabel: 'Public · TDSB', name: 'Jarvis Collegiate Institute', grades: '9–12', distance: '0.8 km', walk: '10 min', quality: 'above', inCatchment: false },
    { board: 'catholic', boardLabel: 'Catholic · TCDSB', name: "St. Michael's Choir School", grades: '9–12', distance: '0.7 km', walk: '9 min', quality: 'above', inCatchment: false },
    { board: 'french', boardLabel: 'French · CSDCSO', name: 'Étienne-Brûlé Secondary', grades: '9–12', distance: '8.4 km', walk: '32 min · TTC', quality: 'avg', inCatchment: false },
  ],
};

// SunScout — same unit, same data on tenant AND landlord surfaces.
const CHARLES_SUNSCOUT = {
  annualPeakSunHours: 1418,
  summerDailyHours: 5.8,
  winterDailyHours: 1.6,
  seasonalGrid: { Dec: 48, Mar: 104, Jun: 176, Sep: 126 },
  monthlyHours: [58, 74, 104, 132, 160, 176, 180, 160, 126, 90, 60, 48],
  sunScore: 81,
  verdict: 'excellent',
};

// ── Charles Street East — landlord fixture (LandlordProperty shape) ───────────
// Ownership figures are LANDLORD-ENTERED values (purchase history is not in
// scraped data) — plausible placeholders, flagged for review in the delivery note.

const CHARLES_LANDLORD = {
  id: 'charles-2314',
  addressLine1: CHARLES_ADDRESS_1,
  addressLine2: CHARLES_ADDRESS_2,
  postal: 'M4Y 1V5',
  province: 'ON',
  toronto: true,
  propertyType: 'Condo apartment',
  beds: '2',
  baths: '2',
  sqft: 780,
  parking: '1 underground',
  yearBuilt: 2018,
  rentControl: false, // first occupied after Nov 15 2018
  price: 645000,      // landlord-entered value estimate
  purchasedFor: 585000,
  purchasedYear: 2019,
  appreciation: 0.103, // (645 − 585) / 585
  annualTaxes: 2890,
  condoFeeMonthly: 598,
  askingRent: CHARLES_ASKING,
  rentEstimate: CHARLES_COMPS.mid,
  rentLow: CHARLES_COMPS.low,
  rentHigh: CHARLES_COMPS.high,
  compCount: CHARLES_COMPS.compCount,
  compConfidence: CHARLES_COMPS.confidence,
  market: { cmhcVacancy: 0.022, rentalDOM: 24, rentTrend: 'flat' },
  ownership: {
    owned: true,
    mortgageBalance: 404000,
    contractRate: 0.0349,
    yearsLeftOnAmort: 18,
    daysOnMarket: CHARLES_DOM,
    priceChanges: 1,
    lastDropAmount: 50,
  },
  riskFlags: [
    { id: 'overpriced', tone: 'red', label: 'Asking rent above market range', detail: `$2,650 vs building median $2,480 · ${CHARLES_DOM} days on market with one $50 drop already`, deduct: 3 },
    { id: 'condo_fee', tone: 'amber', label: 'High condo fee for the unit size', detail: '$598/mo · 23% of asking gross rent (threshold 20%)', deduct: 2 },
  ],
  chips: ['Landlord · For rent', 'Toronto · M4Y', 'Condo · 780 sqft', 'Built 2018 · No rent control'],
};

const CHARLES_RENT_COMPS = {
  buildingP25: CHARLES_COMPS.low,
  buildingP50: CHARLES_COMPS.mid,
  buildingP75: CHARLES_COMPS.high,
  fsaP50: 2510,
  liveListings: [
    { unit: '#1809', beds: '2 bed', sqft: 745, askedAt: 2450, status: 'rented · 6d', tone: 'pass' },
    { unit: '#2711', beds: '2 bed', sqft: 760, askedAt: 2480, status: 'rented · 10d', tone: 'pass' },
    { unit: '#1204', beds: '2 bed', sqft: 800, askedAt: 2550, status: 'active · 12d', tone: 'caution' },
    { unit: '#3302', beds: '2 bed', sqft: 795, askedAt: 2600, status: 'active · 21d', tone: 'caution' },
    { unit: '#2905', beds: '2 bed', sqft: 810, askedAt: 2750, status: 'active · 44d · price dropped', tone: 'fail' },
  ],
};

// Landlord's locked-in mortgage (their 2019 terms, not a purchase scenario)
const CHARLES_LANDLORD_FINANCING = {
  downPaymentPct: 0.3,
  mortgageRate: 0.0349,
  amortizationYears: 20,
  includeManagementFee: false,
  isToronto: true,
  appreciationRate: 0.03,
  assumedIncome: 165000,
};

// Landlord neighbourhood — honest shim (Walk Score live, the rest pending)
const CHARLES_LANDLORD_NEIGH = {
  avgIncome: 0,
  popGrowth5y: 0,
  walkScore: 97,
  transitScore: 95,
  bikeScore: 82,
  buildingPermits: 0,
  appreciation5y: 0,
  appreciation10y: 0,
  ppsqftTrend: 'N/A',
  comps: [],
};

// ── Landlord score (computeLandlordDealScore — spec Section 10 formula) ───────

function computeRentPositioning(askingRent, comps) {
  const { buildingP25, buildingP50, buildingP75 } = comps;
  if (askingRent <= buildingP25) {
    return { label: 'Below market', tone: 'caution', gap: buildingP50 - askingRent };
  }
  if (askingRent <= buildingP50 + (buildingP75 - buildingP50) * 0.4) {
    return { label: 'At market', tone: 'pass', gap: askingRent - buildingP50 };
  }
  if (askingRent <= buildingP75 + (buildingP75 - buildingP50) * 0.3) {
    return { label: 'Top of range', tone: 'caution', gap: askingRent - buildingP50 };
  }
  return { label: 'Above market', tone: 'fail', gap: askingRent - buildingP50 };
}

function computeLandlordStable(property, rent, includeManagementFee) {
  const grossRentAnnual = rent * 12;
  const expenses = computeExpenses(
    property.price, property.annualTaxes, property.condoFeeMonthly,
    grossRentAnnual, property.yearBuilt, includeManagementFee
  );
  const noi = grossRentAnnual - expenses.total;
  const capRate = noi / property.price;
  const grm = property.price / grossRentAnnual;
  return { noi, capRate, grm, closingCostsTotal: 3000 };
}

function computeLandlordDealScore(metrics, property) {
  let capRatePts = 0;
  if (metrics.capRate >= 0.06) capRatePts = 25;
  else if (metrics.capRate >= 0.05) capRatePts = 20;
  else if (metrics.capRate >= 0.04) capRatePts = 15;
  else if (metrics.capRate >= 0.03) capRatePts = 10;
  else if (metrics.capRate >= 0.02) capRatePts = 5;

  let cashFlowPts = 0;
  if (metrics.cashFlowMonthly >= 500) cashFlowPts = 25;
  else if (metrics.cashFlowMonthly >= 200) cashFlowPts = 20;
  else if (metrics.cashFlowMonthly >= 0) cashFlowPts = 13;
  else if (metrics.cashFlowMonthly >= -300) cashFlowPts = 6;
  else if (metrics.cashFlowMonthly >= -700) cashFlowPts = 2;

  let cocPts = 0;
  if (metrics.cashOnCashReturn >= 0.08) cocPts = 20;
  else if (metrics.cashOnCashReturn >= 0.06) cocPts = 16;
  else if (metrics.cashOnCashReturn >= 0.04) cocPts = 12;
  else if (metrics.cashOnCashReturn >= 0.02) cocPts = 8;
  else if (metrics.cashOnCashReturn >= 0.0) cocPts = 4;

  let dscrPts = 0;
  if (metrics.dscr >= 1.25) dscrPts = 15;
  else if (metrics.dscr >= 1.1) dscrPts = 12;
  else if (metrics.dscr >= 1.0) dscrPts = 7;
  else if (metrics.dscr >= 0.85) dscrPts = 3;

  let demandPts = 0;
  const v = property.market.cmhcVacancy;
  if (v < 0.02) demandPts += 4;
  else if (v < 0.03) demandPts += 3;
  else if (v < 0.05) demandPts += 1;
  const dom = property.market.rentalDOM;
  if (dom < 14) demandPts += 3;
  else if (dom <= 30) demandPts += 2;
  const trend = property.market.rentTrend;
  if (trend === 'rising') demandPts += 3;
  else if (trend === 'flat') demandPts += 2;

  const subtotal = capRatePts + cashFlowPts + cocPts + dscrPts + demandPts;
  const totalDeduction = Math.min(15, property.riskFlags.reduce((s, f) => s + (f.deduct || 0), 0));
  const total = Math.max(0, subtotal - totalDeduction);

  const VERDICT_TABLE = [
    { min: 80, verdict: 'strong_buy' },
    { min: 65, verdict: 'good_deal' },
    { min: 50, verdict: 'caution' },
    { min: 35, verdict: 'marginal' },
    { min: 20, verdict: 'do_not_buy' },
    { min: 0, verdict: 'hard_pass' },
  ];
  const row = VERDICT_TABLE.find((r) => total >= r.min) || VERDICT_TABLE[VERDICT_TABLE.length - 1];
  const display = VERDICT_DISPLAY[row.verdict];

  return {
    total,
    displayTotal: Math.round((Math.max(5, total) * 100) / 95),
    verdict: row.verdict,
    label: display.label,
    tagline: display.tagline,
    tone: display.tone,
    breakdown: {
      capRate: capRatePts, cashFlow: cashFlowPts, cashOnCash: cocPts,
      dscr: dscrPts, demand: demandPts, subtotal, deduction: totalDeduction,
      componentMaxes: { capRate: 25, cashFlow: 25, cashOnCash: 20, dscr: 15, demand: 10 },
    },
    deductions: totalDeduction,
  };
}

Object.assign(window, {
  BUTTERMILL_LISTING, BUTTERMILL_METRICS, BUTTERMILL_DEAL_SCORE,
  BUTTERMILL_NARRATIVE, BUTTERMILL_FINANCING, BUTTERMILL_SUNSCOUT,
  BUTTERMILL_PERSONAL, BUTTERMILL_PERSONAL_FLAGS, BUTTERMILL_PERSONAL_NEIGH,
  BUTTERMILL_PERSONAL_NARRATIVE, PB_SAMPLE_COMPS,
  CHARLES_ADDRESS_1, CHARLES_ADDRESS_2, CHARLES_SLUG, CHARLES_ASKING,
  CHARLES_COMPS, CHARLES_DOM, CHARLES_TENANT_CHIPS, CHARLES_TENANT_FLAGS,
  CHARLES_TENANT_NARRATIVE, CHARLES_SCHOOLS, CHARLES_SUNSCOUT,
  CHARLES_LANDLORD, CHARLES_RENT_COMPS, CHARLES_LANDLORD_FINANCING,
  CHARLES_LANDLORD_NEIGH,
  computeRentPositioning, computeLandlordStable, computeLandlordDealScore,
});
