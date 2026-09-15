/**
 * CMHC purpose-built rental apartment vacancy rates for Ontario centres.
 *
 * Source: CMHC Rental Market Survey, October 2025 — Rental Market Report
 * data tables, Ontario, Table 1.1.1 "Private Apartment Vacancy Rates (%),
 * by Bedroom Type — Ontario 10,000+", Total column, Oct-25. Released
 * 2025-12-11 (D-106; the table was placeholder values before that).
 * https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/housing-data/data-tables/rental-market/rental-market-report-data-tables
 *
 * Only rows CMHC rates a, b or c (excellent / very good / good) are copied;
 * "d — poor, use with caution" and suppressed rows are left out so the
 * lookup falls to the province aggregate rather than a figure CMHC itself
 * would not stand behind.
 *
 * Refresh every January against the new survey and update CMHC_VACANCY_SURVEY.
 */

/** The survey behind every figure below — the ledger's "as of". */
export const CMHC_VACANCY_SURVEY = {
  survey: 'October 2025',
  published: '2025-12-11',
  table: 'Rental Market Report data tables, Ontario, Table 1.1.1',
} as const

/** CMA / CA totals, exactly as published (decimal). */
const CMA = {
  toronto: 0.03,
  hamilton: 0.036,
  oshawa: 0.037,
  ottawa: 0.03, // Ottawa–Gatineau CMA, Ontario part
  kitchenerCambridgeWaterloo: 0.041,
  london: 0.04,
  windsor: 0.037,
  stCatharinesNiagara: 0.039,
  guelph: 0.031,
  barrie: 0.043,
  kingston: 0.024,
  peterborough: 0.031,
  brantford: 0.035,
  bellevilleQuinteWest: 0.034,
  greaterSudbury: 0.012,
  thunderBay: 0.04,
  chathamKent: 0.046,
  cornwall: 0.036,
  kawarthaLakes: 0.034,
  northBay: 0.015,
  sarnia: 0.047,
  saultSteMarie: 0.024,
  brockville: 0.044,
  centreWellington: 0.037,
  cobourg: 0.037,
  elliotLake: 0.019,
  ingersoll: 0.045,
  owenSound: 0.024,
  pembroke: 0.028,
  petawawa: 0.012,
  portHope: 0.029,
  stratford: 0.041,
  tillsonburg: 0.045,
  woodstock: 0.028,
} as const

/**
 * Vacancy rate by lowercase municipality name. A municipality maps to the
 * CMA / CA it belongs to in CMHC's survey geography (the GTA municipalities
 * are all Toronto CMA zones; Burlington is Hamilton CMA zone 8; Whitby and
 * Clarington are Oshawa CMA zones — see the zone descriptions in the
 * Rental Market Report, Fall 2025, pp. 41–42).
 */
export const CMHC_VACANCY_RATES_BY_CITY: Record<string, number> = {
  // Toronto CMA
  toronto: CMA.toronto,
  mississauga: CMA.toronto,
  brampton: CMA.toronto,
  vaughan: CMA.toronto,
  markham: CMA.toronto,
  'richmond hill': CMA.toronto,
  oakville: CMA.toronto,
  milton: CMA.toronto,
  'halton hills': CMA.toronto,
  pickering: CMA.toronto,
  ajax: CMA.toronto,
  uxbridge: CMA.toronto,
  newmarket: CMA.toronto,
  aurora: CMA.toronto,
  'whitchurch-stouffville': CMA.toronto,
  stouffville: CMA.toronto,
  king: CMA.toronto,
  'east gwillimbury': CMA.toronto,
  georgina: CMA.toronto,
  caledon: CMA.toronto,
  'bradford west gwillimbury': CMA.toronto,
  bradford: CMA.toronto,
  'new tecumseth': CMA.toronto,
  orangeville: CMA.toronto,
  mono: CMA.toronto,

  // Hamilton CMA
  hamilton: CMA.hamilton,
  burlington: CMA.hamilton,
  grimsby: CMA.hamilton,

  // Oshawa CMA
  oshawa: CMA.oshawa,
  whitby: CMA.oshawa,
  clarington: CMA.oshawa,
  bowmanville: CMA.oshawa,
  courtice: CMA.oshawa,

  // Ottawa–Gatineau CMA (Ontario part)
  ottawa: CMA.ottawa,
  'clarence-rockland': CMA.ottawa,
  rockland: CMA.ottawa,
  russell: CMA.ottawa,
  'north grenville': CMA.ottawa,
  kemptville: CMA.ottawa,
  arnprior: CMA.ottawa,

  // Kitchener–Cambridge–Waterloo CMA
  kitchener: CMA.kitchenerCambridgeWaterloo,
  cambridge: CMA.kitchenerCambridgeWaterloo,
  waterloo: CMA.kitchenerCambridgeWaterloo,
  woolwich: CMA.kitchenerCambridgeWaterloo,
  elmira: CMA.kitchenerCambridgeWaterloo,

  // London CMA
  london: CMA.london,
  'st. thomas': CMA.london,
  'st thomas': CMA.london,
  strathroy: CMA.london,
  'strathroy-caradoc': CMA.london,

  // Windsor CMA
  windsor: CMA.windsor,
  lasalle: CMA.windsor,
  tecumseh: CMA.windsor,
  amherstburg: CMA.windsor,
  lakeshore: CMA.windsor,

  // St. Catharines–Niagara CMA
  'st. catharines': CMA.stCatharinesNiagara,
  'st catharines': CMA.stCatharinesNiagara,
  'niagara falls': CMA.stCatharinesNiagara,
  welland: CMA.stCatharinesNiagara,
  thorold: CMA.stCatharinesNiagara,
  'niagara-on-the-lake': CMA.stCatharinesNiagara,
  lincoln: CMA.stCatharinesNiagara,
  pelham: CMA.stCatharinesNiagara,
  'port colborne': CMA.stCatharinesNiagara,
  'fort erie': CMA.stCatharinesNiagara,

  // Single-municipality CMAs and CAs
  guelph: CMA.guelph,
  barrie: CMA.barrie,
  innisfil: CMA.barrie,
  springwater: CMA.barrie,
  kingston: CMA.kingston,
  peterborough: CMA.peterborough,
  brantford: CMA.brantford,
  brant: CMA.brantford,
  paris: CMA.brantford,
  belleville: CMA.bellevilleQuinteWest,
  'quinte west': CMA.bellevilleQuinteWest,
  trenton: CMA.bellevilleQuinteWest,
  'greater sudbury': CMA.greaterSudbury,
  sudbury: CMA.greaterSudbury,
  'thunder bay': CMA.thunderBay,
  'chatham-kent': CMA.chathamKent,
  chatham: CMA.chathamKent,
  cornwall: CMA.cornwall,
  'kawartha lakes': CMA.kawarthaLakes,
  lindsay: CMA.kawarthaLakes,
  'north bay': CMA.northBay,
  sarnia: CMA.sarnia,
  'sault ste. marie': CMA.saultSteMarie,
  'sault ste marie': CMA.saultSteMarie,
  brockville: CMA.brockville,
  'centre wellington': CMA.centreWellington,
  fergus: CMA.centreWellington,
  cobourg: CMA.cobourg,
  'elliot lake': CMA.elliotLake,
  ingersoll: CMA.ingersoll,
  'owen sound': CMA.owenSound,
  pembroke: CMA.pembroke,
  petawawa: CMA.petawawa,
  'port hope': CMA.portHope,
  stratford: CMA.stratford,
  tillsonburg: CMA.tillsonburg,
  woodstock: CMA.woodstock,
}

/**
 * Used when a municipality is not in the table: the published Ontario
 * aggregate ("Ontario 10,000+", Total, Oct-25, quality a) from the same
 * table — a sourced province-wide figure, not the old unsourced 5% (D-106).
 */
export const DEFAULT_VACANCY_RATE = 0.032
