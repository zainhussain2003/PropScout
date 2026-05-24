// landlord-data.jsx — Landlord-specific property + extra calc functions.
// Reuses computeMetrics / computeDealScore from investor-calc.jsx.
//
// Default scenario: Toronto downtown 2-bed condo · landlord OWNS · listed at
// $3,400/mo but unit has been sitting 38 days because the rent is above market.

const LL_PROPERTY = {
  id: 'harbour-3208',
  addressLine1: 'Unit 3208 · 88 Harbour Street',
  addressLine2: 'Toronto · M5J · South Core',
  postal: 'M5J 0C3',
  province: 'ON',
  toronto: true,
  propertyType: 'Condo apartment',
  beds: '1+den', baths: '2', sqft: 745, parking: '1 underground',
  yearBuilt: 2018,
  rentControl: false,                 // built after Nov 2018
  // Pretend-purchase price for calc engine (this is the landlord's current value)
  price: 949000,
  purchasedFor: 720000,                // 2019
  purchasedYear: 2019,
  appreciation: 0.318,                 // (949-720)/720
  annualTaxes: 4420,
  condoFeeMonthly: 890,
  // The landlord's asking rent — this is the variable they control
  askingRent: 3400,
  // Market data (what comps say)
  rentEstimate: 3100,                  // building median for 1+1
  rentLow: 2950, rentHigh: 3350,
  compCount: 12,
  compConfidence: 'high',
  market: {
    cmhcVacancy: 0.022,
    rentalDOM: 24,
    rentTrend: 'flat',
  },
  // Landlord-specific extra signals
  ownership: {
    owned: true,
    mortgageBalance: 478000,
    contractRate: 0.0349,              // locked in 2019
    yearsLeftOnAmort: 20,
    daysOnMarket: 38,
    priceChanges: 1,                   // dropped from $3,500
    lastDropAmount: 100,
  },
  riskFlags: [
    { id: 'overpriced',  tone: 'red',   label: 'Asking rent above market range', detail: '$3,400 vs building median $3,100 · 38 days on market with one $100 drop already', deduct: 3 },
    { id: 'condo_fee',   tone: 'amber', label: 'High condo fee for the unit size', detail: '$890/mo · 26% of asking gross rent (threshold 20%)', deduct: 2 },
  ],
  chips: ['Landlord · For rent', 'Toronto · M5J', 'Condo · 745 sqft', 'Built 2018 · No rent control'],
};

// Building-level rent positioning data for the rent-positioning section
const LL_RENT_COMPS = {
  // Where the market actually transacts
  buildingP25: 2950,
  buildingP50: 3100,
  buildingP75: 3350,
  fsaP50:     3050,
  // Other units in the same building actively listed
  liveListings: [
    { unit: '#1208', beds: '1+1', sqft: 690, askedAt: 3050, status: 'rented · 7d', tone: 'pass' },
    { unit: '#2604', beds: '1+1', sqft: 710, askedAt: 3100, status: 'rented · 11d', tone: 'pass' },
    { unit: '#3416', beds: '1+1', sqft: 720, askedAt: 3175, status: 'active · 4d',  tone: 'caution' },
    { unit: '#4108', beds: '1+1', sqft: 770, askedAt: 3250, status: 'active · 18d', tone: 'caution' },
    { unit: '#2912', beds: '1+1', sqft: 740, askedAt: 3475, status: 'active · 42d · price dropped', tone: 'fail' },
  ],
};

// Compute the rent-positioning verdict + dollar-gap
function computeRentPositioning(askingRent, comps) {
  const { buildingP25, buildingP50, buildingP75 } = comps;
  let label, tone, gap;
  if (askingRent <= buildingP25) {
    label = 'Below market';
    tone = 'caution';                  // landlord-side: under-pricing leaves $$$ on table
    gap = buildingP50 - askingRent;
  } else if (askingRent <= buildingP50 + (buildingP75 - buildingP50) * 0.4) {
    label = 'At market';
    tone = 'pass';
    gap = askingRent - buildingP50;
  } else if (askingRent <= buildingP75 + (buildingP75 - buildingP50) * 0.3) {
    label = 'Top of range';
    tone = 'caution';
    gap = askingRent - buildingP50;
  } else {
    label = 'Above market';
    tone = 'fail';
    gap = askingRent - buildingP50;
  }
  return { label, tone, gap };
}

// Project what the unit would yield at different rent levels (used by the
// rent slider). Returns annual cash flow + DSCR for the input rent.
function rentScenario(property, financing, rentOverride) {
  const propWithRent = { ...property, rentEstimate: rentOverride };
  return computeMetrics(propWithRent, financing);
}

Object.assign(window, { LL_PROPERTY, LL_RENT_COMPS, computeRentPositioning, rentScenario });
