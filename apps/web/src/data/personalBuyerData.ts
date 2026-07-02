/**
 * personalBuyerData — Burlington semi-detached demo dataset for the
 * Personal Buyer report (248 Mountcrest Avenue).
 *
 * Ported from personal-data.jsx. These values match the design prototype exactly.
 * All computation functions are pure — no side effects, no API calls.
 */

import type {
  PersonalProperty,
  PersonalSchools,
  PersonalComp,
  PersonalNeighbourhood,
  PersonalMonthlyCost,
  HomeScore,
} from '../types/personal'
import type { RiskFlag } from '../types/analysis'
import { computeMonthlyPayment } from '../lib/investorCalc'
import { HOME_SCORE, SEVERE_FLAG_IDS } from '../constants/thresholds'

// ── Property ──────────────────────────────────────────────────────────────────

export const PB_PROPERTY: PersonalProperty = {
  addressLine1: '248 Mountcrest Avenue',
  addressLine2: 'Burlington · L7N · Roseland',
  postal: 'L7N 3K9',
  province: 'ON',
  toronto: false,
  propertyType: 'Semi-detached · 2-storey',
  beds: '3',
  baths: '2',
  sqft: 1610,
  parking: '2 driveway',
  yearBuilt: 1972,
  lotSize: '30 × 110 ft',
  price: 875000,
  daysOnMarket: 12,
  priceChange: { abs: 0, direction: null },

  annualTaxes: 4280,
  condoFeeMonthly: 0,
  utilityEstMonthly: { hydro: 145, gas: 110, water: 65, internet: 65 },
  insuranceMonthlyEst: 215,

  chips: [
    'Personal use · For sale',
    'Burlington · L7N',
    'Semi-detached · 1,610 sqft',
    'Built 1972 · 30 × 110 lot',
  ],

  fmv: { low: 845000, mid: 880000, high: 925000, askingVsMid: -5000 },

  defaultDownPct: 0.2,
  defaultRate: 0.0479,
  defaultAmort: 25,
}

// ── Schools ───────────────────────────────────────────────────────────────────

export const PB_SCHOOLS: PersonalSchools = {
  elementary: [
    {
      name: 'Tom Thomson Public School',
      board: 'HDSB · public',
      distance: '0.6 km',
      driveTime: '2 min',
      eqao: 9.1,
      fraser: 88,
      inCatchment: true,
      grades: 'JK–8',
    },
    {
      name: 'Lakeshore Public School',
      board: 'HDSB · public',
      distance: '1.2 km',
      driveTime: '4 min',
      eqao: 8.2,
      fraser: 71,
      inCatchment: false,
      grades: 'JK–8',
    },
    {
      name: 'St. Patrick Catholic School',
      board: 'HCDSB · catholic',
      distance: '1.8 km',
      driveTime: '5 min',
      eqao: 8.7,
      fraser: 79,
      inCatchment: false,
      grades: 'JK–8',
    },
  ],
  middle: [
    {
      name: 'Tom Thomson PS (Gr 7–8 wing)',
      board: 'HDSB · public',
      distance: '0.6 km',
      driveTime: '2 min',
      eqao: 8.8,
      fraser: 82,
      inCatchment: true,
      grades: '7–8',
    },
    {
      name: 'Pauline Johnson PS',
      board: 'HDSB · public',
      distance: '2.4 km',
      driveTime: '7 min',
      eqao: 7.9,
      fraser: 65,
      inCatchment: false,
      grades: '7–8',
    },
  ],
  high: [
    {
      name: 'Aldershot High School',
      board: 'HDSB · public',
      distance: '1.4 km',
      driveTime: '4 min',
      eqao: 8.4,
      fraser: 76,
      inCatchment: true,
      grades: '9–12',
      gradRate: 0.93,
    },
    {
      name: 'Notre Dame CSS',
      board: 'HCDSB · catholic',
      distance: '3.2 km',
      driveTime: '8 min',
      eqao: 8.6,
      fraser: 81,
      inCatchment: false,
      grades: '9–12',
      gradRate: 0.95,
    },
    {
      name: 'M.M. Robinson HS',
      board: 'HDSB · public',
      distance: '4.1 km',
      driveTime: '10 min',
      eqao: 7.8,
      fraser: 62,
      inCatchment: false,
      grades: '9–12',
      gradRate: 0.88,
    },
  ],
}

// ── Comparable sales ──────────────────────────────────────────────────────────

export const PB_COMPS: PersonalComp[] = [
  {
    addr: '262 Mountcrest Avenue',
    beds: '3',
    baths: '2',
    sqft: 1640,
    sold: 882000,
    soldDate: 'Apr 2026',
    dom: 9,
    ppsqft: 538,
    distance: '0.05 km',
  },
  {
    addr: '124 Iroquois Avenue',
    beds: '3',
    baths: '2',
    sqft: 1580,
    sold: 868000,
    soldDate: 'Mar 2026',
    dom: 14,
    ppsqft: 549,
    distance: '0.4 km',
  },
  {
    addr: '17 Lakeland Drive',
    beds: '4',
    baths: '2',
    sqft: 1720,
    sold: 905000,
    soldDate: 'Mar 2026',
    dom: 7,
    ppsqft: 526,
    distance: '0.6 km',
  },
  {
    addr: '88 Sunnyhurst Crescent',
    beds: '3',
    baths: '3',
    sqft: 1610,
    sold: 891000,
    soldDate: 'Feb 2026',
    dom: 11,
    ppsqft: 553,
    distance: '0.8 km',
  },
  {
    addr: '305 Mountcrest Avenue',
    beds: '3',
    baths: '2',
    sqft: 1530,
    sold: 845000,
    soldDate: 'Feb 2026',
    dom: 18,
    ppsqft: 552,
    distance: '0.2 km',
  },
  {
    addr: '440 Plains Road East',
    beds: '3',
    baths: '2',
    sqft: 1680,
    sold: 858000,
    soldDate: 'Jan 2026',
    dom: 22,
    ppsqft: 511,
    distance: '1.1 km',
  },
  {
    addr: '76 Orchard Avenue',
    beds: '4',
    baths: '2',
    sqft: 1750,
    sold: 921000,
    soldDate: 'Jan 2026',
    dom: 6,
    ppsqft: 526,
    distance: '1.3 km',
  },
  {
    addr: '511 Stephenson Drive',
    beds: '3',
    baths: '2',
    sqft: 1560,
    sold: 836000,
    soldDate: 'Dec 2025',
    dom: 15,
    ppsqft: 536,
    distance: '0.9 km',
  },
]

// ── Neighbourhood ─────────────────────────────────────────────────────────────

export const PB_NEIGHBOURHOOD: PersonalNeighbourhood = {
  walkScore: 64,
  transitScore: 48,
  bikeScore: 56,
  walkSub: 'Some daily errands by foot',
  transitSub: 'Burlington Transit + GO connection',
  bikeSub: 'Bikeable for some trips',
  avgIncome: 96400,
  popGrowth5y: 0.062,
  ppsqftTrend: 'Up 5.4% YoY',
  appreciation5y: 0.246,
  appreciation10y: 0.581,
  buildingPermits: 6,
  distances: [
    { k: 'Aldershot GO Station', v: '4 min', unit: 'drive', tone: 'pass' },
    { k: 'Downtown Toronto (peak GO)', v: '56 min', unit: 'door-to-door', tone: 'pass' },
    { k: 'McMaster University', v: '15 min', unit: 'drive', tone: 'pass' },
    { k: 'Mapleview Centre · Costco', v: '6 min', unit: 'drive', tone: 'pass' },
    { k: 'Burlington Beach', v: '7 min', unit: 'drive', tone: 'pass' },
    { k: 'Toronto Pearson Airport', v: '40 min', unit: 'drive', tone: 'pass' },
    { k: 'Nearest grocery (Fortinos)', v: '8 min', unit: 'walk', tone: 'caution' },
    { k: 'Walkable cafés / shops', v: 'Limited', unit: '', tone: 'caution' },
    { k: 'QEW on-ramp', v: '~1 km', unit: '', tone: 'pass' },
  ],
}

// ── Calculation functions ─────────────────────────────────────────────────────

/**
 * Maintenance reserve rate by year built — matches Python calc engine rates.py.
 */
function personalMaintenanceRate(yearBuilt: number): number {
  if (yearBuilt >= 2010) return 0.005
  if (yearBuilt >= 1980) return 0.01
  return 0.015
}

/**
 * Computes the all-in monthly cost of owning a personal-use property.
 * Uses computeMonthlyPayment from investorCalc for the mortgage amount.
 */
export function computeMonthlyCost(
  property: PersonalProperty,
  financing: { downPct: number; rate: number; amort: number }
): PersonalMonthlyCost {
  const { price, annualTaxes, condoFeeMonthly, utilityEstMonthly, insuranceMonthlyEst, yearBuilt } =
    property
  const { downPct, rate, amort } = financing

  const principal = price * (1 - downPct)
  const mortgage = computeMonthlyPayment(principal, rate, amort)
  const maintenanceMonthly = (price * personalMaintenanceRate(yearBuilt)) / 12
  const utilTotal =
    (utilityEstMonthly.hydro ?? 0) +
    (utilityEstMonthly.gas ?? 0) +
    (utilityEstMonthly.water ?? 0) +
    (utilityEstMonthly.internet ?? 0)
  const tax = annualTaxes / 12
  const total =
    mortgage + tax + condoFeeMonthly + insuranceMonthlyEst + utilTotal + maintenanceMonthly

  return {
    mortgage,
    tax,
    condo: condoFeeMonthly,
    insurance: insuranceMonthlyEst,
    utilities: { ...utilityEstMonthly, total: utilTotal },
    maintenance: maintenanceMonthly,
    total,
    principal,
  }
}

/**
 * Computes the Personal Buyer home score (0–100).
 * Components: pricing (25), schools (20), light (15), walk+transit (15),
 *             lot value-add (15), risks (10).
 *
 * Risk flags (optional, for live analyses): standard red flags deduct
 * HOME_SCORE.RED_FLAG_DEDUCTION each from riskPts (floor 0); severe
 * dealbreakers (SEVERE_FLAG_IDS) don't deduct — they GATE the total via
 * HOME_SCORE.SEVERE_CEILINGS (34/20/10 by count, floor 5). Ambers do nothing.
 * Order: sum components → apply severe ceiling → apply floor.
 */
export function computeHomeScore(
  property: PersonalProperty,
  schools: PersonalSchools,
  neigh: PersonalNeighbourhood,
  lightScore: number,
  flags?: readonly Pick<RiskFlag, 'id' | 'severity' | 'tier'>[]
): HomeScore {
  // 1. Pricing vs FMV
  const askVsMid = (property.price - property.fmv.mid) / property.fmv.mid
  let pricing = 0
  if (askVsMid <= -0.05) pricing = 25
  else if (askVsMid <= -0.02) pricing = 22
  else if (askVsMid <= 0.0) pricing = 18
  else if (askVsMid <= 0.03) pricing = 14
  else if (askVsMid <= 0.06) pricing = 8

  // 2. Schools — average EQAO of in-catchment schools.
  // When no school data is available (EMPTY_SCHOOLS passed for real listings),
  // all arrays are empty so inCatch.length === 0 → schoolPts = 0, not 7.5 fallback.
  const allSchools = [...schools.elementary, ...schools.middle, ...schools.high]
  const inCatch = allSchools.filter((s) => s.inCatchment)
  let schoolPts = 0
  let avgEqao = 0
  if (allSchools.length > 0) {
    avgEqao = inCatch.length ? inCatch.reduce((s, x) => s + x.eqao, 0) / inCatch.length : 7.5
    if (avgEqao >= 9.0) schoolPts = 20
    else if (avgEqao >= 8.5) schoolPts = 17
    else if (avgEqao >= 8.0) schoolPts = 14
    else if (avgEqao >= 7.0) schoolPts = 10
    else schoolPts = 5
  }

  // 3. Light score
  let lightPts = 0
  if (lightScore >= 80) lightPts = 15
  else if (lightScore >= 60) lightPts = 12
  else if (lightScore >= 40) lightPts = 8
  else lightPts = 4

  // 4. Walk + transit
  const wt = (neigh.walkScore + neigh.transitScore) / 2
  let walkPts = 0
  if (wt >= 80) walkPts = 15
  else if (wt >= 65) walkPts = 12
  else if (wt >= 50) walkPts = 9
  else if (wt >= 35) walkPts = 5
  else walkPts = 2

  // 5. Lot / value-add (baseline)
  const lotPts = 8

  // 6. Risks — standard reds deduct; severe dealbreakers gate the total below.
  // Prefer the calc engine's per-mode tier (flag matrix); analyses stored
  // before the matrix shipped fall back to the SEVERE_FLAG_IDS mirror.
  const reds = (flags ?? []).filter((f) => f.severity === 'red')
  const severeCount = reds.filter((f) =>
    f.tier != null ? f.tier === 'severe' : SEVERE_FLAG_IDS.has(f.id)
  ).length
  const standardRedCount = reds.length - severeCount
  const riskPts = Math.max(
    0,
    HOME_SCORE.RISK_MAX - standardRedCount * HOME_SCORE.RED_FLAG_DEDUCTION
  )

  let total = Math.min(100, pricing + schoolPts + lightPts + walkPts + lotPts + riskPts)
  if (severeCount > 0) {
    const ceiling =
      HOME_SCORE.SEVERE_CEILINGS[Math.min(severeCount, HOME_SCORE.SEVERE_CEILINGS.length) - 1] ??
      HOME_SCORE.FLOOR
    total = Math.min(total, ceiling)
  }
  total = Math.max(HOME_SCORE.FLOOR, total)

  const verdict =
    total >= 80
      ? {
          label: 'Make an offer',
          tone: 'pass' as const,
          tagline: 'Strong fit — proceed with confidence.',
        }
      : total >= 65
        ? {
            label: 'Worth pursuing',
            tone: 'pass' as const,
            tagline: 'Solid home — standard due diligence applies.',
          }
        : total >= 50
          ? {
              label: 'Negotiate first',
              tone: 'caution' as const,
              tagline: 'A few concerns — bring them up before bidding.',
            }
          : total >= 35
            ? {
                label: 'Look further',
                tone: 'caution' as const,
                tagline: 'Mixed signals — explore alternatives.',
              }
            : {
                label: 'Probably not',
                tone: 'fail' as const,
                tagline: 'Significant headwinds for personal use.',
              }

  return {
    components: { pricing, schoolPts, lightPts, walkPts, lotPts, riskPts },
    componentMaxes: {
      pricing: 25,
      schoolPts: 20,
      lightPts: 15,
      walkPts: 15,
      lotPts: 15,
      riskPts: 10,
    },
    total,
    verdict,
    avgEqao,
    askVsMid,
  }
}
