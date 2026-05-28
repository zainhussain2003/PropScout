/**
 * Tenant demo dataset — Unit 3705 · 28 Charles Street East, Toronto M4Y.
 *
 * Matches the calibration fixture used in tenant-blocks.jsx and tenant-report.jsx.
 * Used for Report C (tenant evaluation) until the live scraper is wired.
 *
 * Key facts:
 *   - 1-bedroom + den listed as 2-bedroom (misrepresentation)
 *   - Asking $2,150/mo — $150–200 above comparable 1-beds in the building
 *   - Strong transit (VMC subway 2-min walk) · limited walkability
 *   - 22 days on market · 14 competing rentals in building → strong leverage
 *   - Target negotiation range: $1,950–$2,000/mo
 */

import type {
  TenantListingData,
  TenantFlag,
  TenantAmenity,
  TenantSchools,
  TenantMobilityScore,
  TenantDistanceRow,
  TenantLeverageRow,
  TenantCostLine,
  TenantRealityItem,
  TenantChecklistItem,
} from '../types/analysis'

// ── Listing ────────────────────────────────────────────────────────────────────

export const CHARLES_LISTING: TenantListingData = {
  id: 'charles',
  addressLine1: 'Unit 3705 · 28 Charles Street East',
  addressLine2: 'Toronto · M4Y · Bay Corridor',
  asking: 2150,
  beds: '1+den',
  baths: '1',
  sqft: '620',
  floor: '37th floor',
  utilities: 'Heat & water incl.',
  scoreNumber: 58,
  scoreTone: 'caution',
  verdictLabel: 'Negotiate first',
  verdictSub: 'Priced above market and listing may misrepresent the unit.',
  targetLow: 1950,
  targetHigh: 2000,
  chips: ['For rent', 'Available March 1', 'Pet-friendly', '12-mo lease', 'Furnished optional'],
}

// ── Listing accuracy flags (§02) ──────────────────────────────────────────────

export const CHARLES_FLAGS: TenantFlag[] = [
  {
    id: 'den_bedroom',
    tone: 'red',
    label: 'The "second bedroom" is likely a den',
    detail:
      'Listing description includes "sliding glass door" and "study/den" language. Toronto building code requires a private bedroom to have a window and a door — this room likely has neither.',
    evidence: '"Bright open-concept living with a sleek sliding glass den/2nd bedroom..."',
    ask: 'Ask the landlord to confirm in writing whether the room has a window and a solid door.',
  },
  {
    id: 'parking',
    tone: 'amber',
    label: 'Parking status unclear',
    detail:
      'Listing says "parking available — contact manager." That usually means parking is not included in rent. In this building, monthly parking is typically $150–200/mo.',
    evidence: '"Premium parking available — contact for details."',
    ask: 'Confirm whether parking is included or extra before signing.',
  },
  {
    id: 'utilities',
    tone: 'good',
    label: 'Utilities are clear',
    detail:
      'Heat, water, and central air are confirmed included. Hydro and internet are tenant-paid.',
    evidence: '"All utilities except hydro included. Tenant pays internet."',
  },
]

// ── Listed vs Reality (§03) ───────────────────────────────────────────────────

export const CHARLES_LISTED: string[] = [
  '2 bedrooms + study',
  '2 full bathrooms',
  '9ft ceilings throughout',
  'Expansive windows, filled with natural light',
  '105 sqft balcony, unobstructed views',
  'Ensuite laundry',
  'Parking — contact manager',
]

export const CHARLES_REALITY: TenantRealityItem[] = [
  { txt: '1 proper bedroom + 1 glass-door den', tone: 'bad' },
  { txt: '2 full bathrooms', tone: 'ok' },
  { txt: '9ft ceilings in main living area', tone: 'ok' },
  { txt: 'Floor-to-ceiling windows in living — den likely has none', tone: 'bad' },
  { txt: '105 sqft balcony — legitimate', tone: 'ok' },
  { txt: 'Ensuite laundry confirmed', tone: 'ok' },
  { txt: 'No parking confirmed — clarify urgently', tone: 'bad' },
]

// ── Amenities (§06) ───────────────────────────────────────────────────────────

export const CHARLES_AMENITIES: TenantAmenity[] = [
  { label: 'Heat', status: 'incl' },
  { label: 'Water', status: 'incl' },
  { label: 'Central air', status: 'incl' },
  { label: 'Internet · 1 Gbps', status: 'incl' },
  { label: 'Gym & fitness centre', status: 'incl' },
  { label: 'Rooftop pool & deck', status: 'incl' },
  { label: 'Sauna + yoga studio', status: 'incl' },
  { label: 'Party room & lounge', status: 'incl' },
  { label: '24-hr concierge', status: 'incl' },
  { label: 'YMCA membership', status: 'incl' },
  { label: 'Indoor running track', status: 'incl' },
  { label: 'Rooftop BBQ terrace', status: 'incl' },
  { label: 'Hydro / electricity', status: 'extra', note: '~$80–110/mo' },
  { label: 'Parking', status: 'unclear', note: 'confirm with landlord' },
]

// ── Schools (§08) ────────────────────────────────────────────────────────────

export const CHARLES_SCHOOLS: TenantSchools = {
  elementary: [
    {
      board: 'public',
      boardLabel: 'Public · TDSB',
      name: 'Jesse Ketchum Jr & Sr PS',
      grades: 'JK–8',
      distance: '0.6 km',
      walk: '8 min',
      quality: 'above',
      inCatchment: true,
    },
    {
      board: 'catholic',
      boardLabel: 'Catholic · TCDSB',
      name: "St. Michael's Catholic School",
      grades: 'JK–8',
      distance: '0.9 km',
      walk: '11 min',
      quality: 'avg',
      inCatchment: false,
    },
    {
      board: 'french',
      boardLabel: 'French Immersion · TDSB',
      name: 'Lord Lansdowne French Immersion',
      grades: 'SK–6',
      distance: '1.4 km',
      walk: '17 min',
      quality: 'above',
      inCatchment: false,
    },
  ],
  middle: [
    {
      board: 'public',
      boardLabel: 'Public · TDSB',
      name: 'Lord Dufferin PS · Gr 7–8',
      grades: '7–8',
      distance: '0.9 km',
      walk: '11 min',
      quality: 'avg',
      inCatchment: true,
    },
    {
      board: 'catholic',
      boardLabel: 'Catholic · TCDSB',
      name: 'St. Paul Catholic · Gr 7–8',
      grades: '7–8',
      distance: '1.2 km',
      walk: '14 min',
      quality: 'avg',
      inCatchment: false,
    },
  ],
  high: [
    {
      board: 'public',
      boardLabel: 'Public · TDSB',
      name: 'Jarvis Collegiate Institute',
      grades: '9–12',
      distance: '0.8 km',
      walk: '10 min',
      quality: 'above',
      inCatchment: true,
    },
    {
      board: 'catholic',
      boardLabel: 'Catholic · TCDSB',
      name: "St. Michael's Choir School",
      grades: '9–12',
      distance: '0.7 km',
      walk: '9 min',
      quality: 'above',
      inCatchment: false,
    },
    {
      board: 'french',
      boardLabel: 'French · CSDCSO',
      name: 'Étienne-Brûlé Secondary',
      grades: '9–12',
      distance: '8.4 km',
      walk: '32 min · TTC',
      quality: 'avg',
      inCatchment: false,
    },
  ],
}

// ── Location & Commute (§07) ─────────────────────────────────────────────────

export const CHARLES_MOBILITY_SCORES: TenantMobilityScore[] = [
  { label: 'Walk Score', val: 72, sub: 'Mostly walkable for daily needs', tone: 'caution' },
  { label: 'Transit Score', val: 85, sub: 'Excellent — VMC subway 2-min walk', tone: 'pass' },
  { label: 'Bike Score', val: 58, sub: 'Bikeable for some trips', tone: 'caution' },
]

export const CHARLES_DISTANCES: TenantDistanceRow[] = [
  { k: 'VMC Subway (Line 1)', v: '2 min', unit: 'walk', tone: 'pass' },
  { k: 'Downtown Toronto', v: '~50 min', unit: 'no transfers', tone: 'pass' },
  { k: 'York University', v: '7 min', unit: 'subway', tone: 'pass' },
  { k: 'Hwy 400 / 407', v: '~1 km', unit: 'on-ramp', tone: 'pass' },
  { k: 'Vaughan Mills · Costco · IKEA', v: '6 min', unit: 'drive', tone: 'pass' },
  { k: 'Pearson Airport', v: '25 min', unit: 'drive', tone: 'pass' },
  { k: 'Walkable cafés / restaurants', v: 'Limited', unit: '', tone: 'caution' },
  { k: 'Nearest grocery', v: '8 min', unit: 'walk', tone: 'caution' },
  { k: 'Active construction nearby', v: 'Yes', unit: 'some noise', tone: 'caution' },
]

// ── Negotiation (§04) ────────────────────────────────────────────────────────

export const CHARLES_LEVERAGE_FACTORS: TenantLeverageRow[] = [
  { k: 'Competing rentals in this building', v: '14 listings', tone: 'pass' },
  { k: 'Days on market for this unit', v: '22 days', tone: 'pass' },
  { k: 'Price drops since listing', v: '1 · –$50', tone: 'pass' },
  { k: 'Documented misrepresentation', v: 'Glass-door bedroom (§02)', tone: 'pass' },
  { k: '12-month rent trend in this FSA', v: '–1.4%', tone: 'pass' },
]

export const CHARLES_SUGGESTED_MESSAGE =
  "Hi — thanks for showing the unit at 28 Charles. We'd love to move forward, but the listing " +
  'markets it as a 2-bedroom and the second room appears to be a den with a sliding glass door. ' +
  'Comparable true 1-bedrooms in the building are at $1,950–2,050. We can sign this week at ' +
  '$1,975, parking confirmed in writing. Let me know.'

export const CHARLES_MESSAGE_REASONS: string[] = [
  'Names the specific misrepresentation (anchors the conversation in their problem)',
  'Cites the building comp range (shows you did the research)',
  'Offers a concrete number, not a request to "negotiate"',
  'Signals readiness ("we can sign this week") to reduce their risk',
]

// ── Cost breakdown (§05) ─────────────────────────────────────────────────────

export const CHARLES_COST_LINES: TenantCostLine[] = [
  { k: 'Rent', asking: 2150, target: 1975, included: false },
  { k: 'Hydro (est.)', asking: 65, target: 65, included: false, note: 'tenant-paid' },
  { k: 'Internet (est.)', asking: 70, target: 70, included: false, note: 'tenant-paid' },
  { k: 'Heat + water + A/C', asking: 0, target: 0, included: true, note: 'included in rent' },
  { k: 'Parking', asking: 150, target: 0, included: 'maybe', note: 'unclear — confirm' },
]

// ── Confirm-before-signing checklist (§12) ───────────────────────────────────

export const CHARLES_CHECKLIST: TenantChecklistItem[] = [
  { label: 'Does the second room have an exterior window?', critical: true },
  { label: 'Is parking included or extra ($/mo)?', critical: true },
  { label: 'Is the AC central or wall-unit?', critical: false },
  { label: 'Are pets allowed (size limit / deposit)?', critical: false },
  { label: 'When does heat get turned on (RTA Sept–May)?', critical: false },
  { label: 'Lease term — 12 months or month-to-month after?', critical: true },
]
