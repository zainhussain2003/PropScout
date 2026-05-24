// investor-calc.jsx — pure calculation functions + property datasets.
//
// Two datasets — Vaughan (bad deal, ~9/100) and Hamilton (good deal, ~85/100).
// All numbers are derived live from purchase price + financing inputs.

// ── Property datasets ──────────────────────────────────────────
const PROPERTIES = {
  vaughan: {
    id: 'vaughan',
    addressLine1: 'Unit 5702 · 5 Buttermill Avenue',
    addressLine2: 'Vaughan · L4K · VMC Corridor',
    postal: 'L4K 5W4',
    province: 'ON',
    toronto: false,
    propertyType: 'Condo apartment',
    beds: '3',
    baths: '2',
    sqft: 950,
    parking: '1',
    yearBuilt: 2020,
    rentControl: false,                  // built after Nov 15 2018
    price: 729900,
    annualTaxes: 3326,
    condoFeeMonthly: 761,
    rentEstimate: 2900,                   // /mo from comps
    rentLow: 2700, rentHigh: 3200,
    compCount: 8,
    compConfidence: 'medium',
    market: {
      cmhcVacancy: 0.018,                 // 1.8%
      rentalDOM: 18,                      // days
      rentTrend: 'declining',             // declining | flat | rising
    },
    riskFlags: [
      { id: 'condo_fee',  tone: 'red',   label: 'Condo-fee burden',  detail: '$761/mo · 26% of estimated gross rent (threshold 20%)', deduct: 4 },
      { id: 'cash_flow',  tone: 'red',   label: 'Deeply negative cash flow', detail: 'Break-even rent $4,585 vs. market $2,900', deduct: 0 },
      { id: 'supply',     tone: 'amber', label: 'Building supply pressure',  detail: '24 active rentals in same building · trend declining', deduct: 2 },
    ],
    chips: ['Investment · For sale', 'Vaughan · L4K', 'Condo · 950 sqft', 'Built 2020 · No rent control'],
  },

  hamilton: {
    id: 'hamilton',
    addressLine1: '146 East 19th Street',
    addressLine2: 'Hamilton · L8V · Crown Point',
    postal: 'L8V 2P5',
    province: 'ON',
    toronto: false,
    propertyType: 'Detached duplex',
    beds: '4 (2+2)',
    baths: '2',
    sqft: 1820,
    parking: '3 driveway',
    yearBuilt: 1985,
    rentControl: true,                    // pre Nov 2018
    price: 449000,
    annualTaxes: 3800,
    condoFeeMonthly: 0,
    rentEstimate: 3600,                   // /mo combined (2 units)
    rentLow: 3400, rentHigh: 3800,
    compCount: 12,
    compConfidence: 'high',
    market: {
      cmhcVacancy: 0.025,
      rentalDOM: 22,
      rentTrend: 'rising',
    },
    riskFlags: [
      { id: 'rent_ctrl',  tone: 'red',   label: 'Ontario rent control', detail: 'Built pre-Nov 2018 — annual rent increases capped at provincial guideline', deduct: 5 },
      { id: 'age',        tone: 'amber', label: 'Mid-age building (1985)', detail: 'Maintenance reserve set to 1.0% of value annually', deduct: 0 },
    ],
    chips: ['Investment · For sale', 'Hamilton · L8V', 'Duplex · 1,820 sqft', 'Built 1985 · Rent-controlled'],
  },
};

// ── Pure calculation functions ─────────────────────────────────

// Maintenance reserve as a % of value, by year built.
function maintenanceRate(yearBuilt) {
  if (yearBuilt >= 2010) return 0.005;
  if (yearBuilt >= 1980) return 0.010;
  return 0.015;
}

// Ontario LTT (non-Toronto). Returns [{ band: '$0 – $55k', rate: 0.005, ltt: 275 }, ...] + total.
function ontarioLTT(price, isToronto) {
  const brackets = [
    { upTo:  55000, rate: 0.005 },
    { upTo: 250000, rate: 0.010 },
    { upTo: 400000, rate: 0.015 },
    { upTo: 2000000, rate: 0.020 },
    { upTo: Infinity, rate: 0.025 },
  ];
  let remaining = price;
  let prevCap = 0;
  const rows = [];
  let total = 0;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const span = Math.min(b.upTo, price) - prevCap;
    if (span > 0) {
      const lttBand = span * b.rate;
      rows.push({
        band: `$${prevCap.toLocaleString()} – ${b.upTo === Infinity ? '∞' : '$' + b.upTo.toLocaleString()}`,
        rate: b.rate,
        amount: span,
        ltt: lttBand,
      });
      total += lttBand;
      remaining -= span;
      prevCap = b.upTo;
    }
  }
  // Toronto stacking — double the provincial total for municipal LTT
  const finalTotal = isToronto ? total * 2 : total;
  return { rows, provincial: total, municipal: isToronto ? total : 0, total: finalTotal };
}

// Standard amortisation — monthly payment for a fixed-rate mortgage.
function monthlyPayment(principal, annualRate, years) {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * r / (1 - Math.pow(1 + r, -n));
}

// Remaining balance after `monthsElapsed` payments.
function remainingBalance(principal, annualRate, years, monthsElapsed) {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return Math.max(0, principal - (principal / n) * monthsElapsed);
  const pmt = monthlyPayment(principal, annualRate, years);
  return principal * Math.pow(1 + r, monthsElapsed) - pmt * (Math.pow(1 + r, monthsElapsed) - 1) / r;
}

// Closing costs estimate (legal, inspection, title etc.). Loose Ontario norm.
function closingCostsEstimate(price) {
  return 2200 + price * 0.001;
}

// OSFI stress test — qualifying rate = max(contract + 2%, 5.25%).
function osfiStressTest(input) {
  const { price, downPct, rate, amort, annualTaxes, condoFeeMonthly, assumedIncome = 125000 } = input;
  const principal = price * (1 - downPct);
  const qualifyingRate = Math.max(rate + 0.02, 0.0525);
  const qualifyingPmt = monthlyPayment(principal, qualifyingRate, amort);
  const monthlyTaxes = annualTaxes / 12;
  // GDS = (mortgage + property tax + 50% condo fee) / monthly gross income
  const gds = (qualifyingPmt + monthlyTaxes + 0.5 * condoFeeMonthly) / (assumedIncome / 12);
  return {
    qualifyingRate,
    qualifyingPmt,
    gds,
    pass: gds <= 0.44,
    threshold: 0.44,
  };
}

// Main calc — everything the report needs derived from property + financing.
function computeMetrics(property, financing) {
  const { price, annualTaxes, condoFeeMonthly, rentEstimate, yearBuilt, toronto, market } = property;
  const { downPct, rate, amort, includeManagement, appreciation, assumedIncome } = financing;

  // ── Cash invested ─────
  const downPayment = price * downPct;
  const ltt = ontarioLTT(price, toronto);
  const closingCosts = closingCostsEstimate(price);
  const totalCashInvested = downPayment + ltt.total + closingCosts;

  // ── Operating expenses (annual) ─────
  const grossRentAnnual = rentEstimate * 12;
  const insurance      = price * 0.0035;
  const maintenance    = price * maintenanceRate(yearBuilt);
  const vacancy        = grossRentAnnual * 0.05;
  const condo          = condoFeeMonthly * 12;
  const management     = includeManagement ? grossRentAnnual * 0.08 : 0;
  const totalOpex      = annualTaxes + insurance + maintenance + vacancy + condo + management;

  const noi = grossRentAnnual - totalOpex;

  // ── Mortgage ─────
  const principal = price - downPayment;
  const monthlyMortgage = monthlyPayment(principal, rate, amort);
  const annualDebtService = monthlyMortgage * 12;

  // ── Returns ─────
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;
  const capRate = noi / price;
  const coc = annualCashFlow / totalCashInvested;
  const dscr = annualDebtService === 0 ? Infinity : noi / annualDebtService;
  const grm = price / grossRentAnnual;
  const breakEvenRent = (totalOpex + annualDebtService) / 12;

  // ── OSFI ─────
  const osfi = osfiStressTest({
    price, downPct, rate, amort,
    annualTaxes, condoFeeMonthly,
    assumedIncome: assumedIncome || 140000,
  });

  // ── Equity build (monthly samples through year 20) ─────
  const equityCurve = [];
  for (let year = 0; year <= 20; year++) {
    const months = year * 12;
    const remaining = year === 0 ? principal : remainingBalance(principal, rate, amort, months);
    const appreciatedValue = price * Math.pow(1 + appreciation, year);
    const equity = Math.max(0, appreciatedValue - Math.max(0, remaining));
    equityCurve.push({
      year,
      value: appreciatedValue,
      remaining: Math.max(0, remaining),
      equity,
      cashOnCash: year === 0 ? 0 : (equity - downPayment) / totalCashInvested,
    });
  }

  return {
    downPayment, ltt, closingCosts, totalCashInvested,
    grossRentAnnual,
    expenses: { taxes: annualTaxes, insurance, maintenance, vacancy, condo, management, total: totalOpex },
    noi,
    monthlyMortgage, annualDebtService,
    capRate, monthlyCashFlow, annualCashFlow, coc, dscr, grm, breakEvenRent,
    osfi,
    equityCurve,
    principal,
  };
}

// ── Deal score (spec Section 10) ──────────────────────────────────
function computeDealScore(metrics, property) {
  let cap = 0;
  if      (metrics.capRate >= 0.060) cap = 25;
  else if (metrics.capRate >= 0.050) cap = 20;
  else if (metrics.capRate >= 0.040) cap = 15;
  else if (metrics.capRate >= 0.030) cap = 10;
  else if (metrics.capRate >= 0.020) cap = 5;

  let cf = 0;
  if      (metrics.monthlyCashFlow >=  500) cf = 25;
  else if (metrics.monthlyCashFlow >=  200) cf = 20;
  else if (metrics.monthlyCashFlow >=    0) cf = 13;
  else if (metrics.monthlyCashFlow >= -300) cf = 6;
  else if (metrics.monthlyCashFlow >= -700) cf = 2;

  let coc = 0;
  if      (metrics.coc >= 0.08) coc = 20;
  else if (metrics.coc >= 0.06) coc = 16;
  else if (metrics.coc >= 0.04) coc = 12;
  else if (metrics.coc >= 0.02) coc = 8;
  else if (metrics.coc >= 0.00) coc = 4;

  let dscr = 0;
  if      (metrics.dscr >= 1.25) dscr = 15;
  else if (metrics.dscr >= 1.10) dscr = 12;
  else if (metrics.dscr >= 1.00) dscr = 7;
  else if (metrics.dscr >= 0.85) dscr = 3;

  // Demand: vacancy + DOM + trend
  let demand = 0;
  const v = property.market.cmhcVacancy;
  if      (v < 0.02)  demand += 4;
  else if (v < 0.03)  demand += 3;
  else if (v < 0.05)  demand += 1;
  const dom = property.market.rentalDOM;
  if      (dom < 14)  demand += 3;
  else if (dom <= 30) demand += 2;
  const trend = property.market.rentTrend;
  if      (trend === 'rising')   demand += 3;
  else if (trend === 'flat')     demand += 2;

  const subtotal = cap + cf + coc + dscr + demand;
  const totalDeduction = Math.min(15, (property.riskFlags || []).reduce((s, f) => s + (f.deduct || 0), 0));
  const total = Math.max(0, subtotal - totalDeduction);

  const verdict =
    total >= 80 ? { label: 'Strong deal', tone: 'pass', tagline: 'Proceed — fundamentals are solid.' } :
    total >= 65 ? { label: 'Good deal', tone: 'pass', tagline: 'Proceed with standard due diligence.' } :
    total >= 50 ? { label: 'Caution', tone: 'caution', tagline: 'Real issues — model the risks carefully.' } :
    total >= 35 ? { label: 'Marginal', tone: 'caution', tagline: 'Significant headwinds — need a specific thesis.' } :
    total >= 20 ? { label: 'Do not buy', tone: 'fail', tagline: 'Numbers don\'t pencil as a rental.' } :
                   { label: 'Hard pass',  tone: 'fail', tagline: 'Fails on multiple fundamentals.' };

  return {
    components: { cap, cf, coc, dscr, demand },
    componentMaxes: { cap: 25, cf: 25, coc: 20, dscr: 15, demand: 10 },
    deductions: totalDeduction,
    subtotal,
    total,
    verdict,
  };
}

// ── Formatting helpers ──────────────────────────────────────────
function fmtMoney(n, opts = {}) {
  const { sign = true, decimals = 0 } = opts;
  const abs = Math.abs(n);
  const s = '$' + abs.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return n < 0 ? (sign ? `−${s}` : s) : s;
}
function fmtPct(n, decimals = 2) {
  return (n * 100).toFixed(decimals) + '%';
}

Object.assign(window, {
  PROPERTIES, computeMetrics, computeDealScore,
  ontarioLTT, osfiStressTest, monthlyPayment, remainingBalance, closingCostsEstimate, maintenanceRate,
  fmtMoney, fmtPct,
});
