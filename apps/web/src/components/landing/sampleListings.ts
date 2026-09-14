/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import type { ListingPreviewData } from '../shared/ModeModal'

// ── Sample listings ───────────────────────────────────────────────────

export const SAMPLE_LISTINGS = [
  {
    key: 'toronto',
    label: 'Toronto rental',
    kind: 'rent' as const,
    url: 'https://www.realtor.ca/real-estate/27905412/unit-3705-28-charles-st-e-toronto',
    pretty: '… / listing / 27905412 / unit-3705 · 28 charles st e · toronto',
    preview: {
      kind: 'rent' as const,
      address: 'Unit 3705 · 28 Charles Street East, Toronto ON',
      price: '$2,150/mo',
      beds: '1+den · 1 bath',
      sqft: '620 sqft',
      extra: 'Heat & water incl.',
    } satisfies ListingPreviewData,
  },
  {
    key: 'hamilton',
    label: 'Hamilton duplex',
    kind: 'sale' as const,
    url: 'https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton',
    pretty: '… / listing / 27619830 / 146 east 19th st · hamilton',
    preview: {
      kind: 'sale' as const,
      address: '146 East 19th Street, Hamilton ON',
      price: '$749,900',
      beds: '4 beds · 2 baths',
      sqft: '1,620 sqft',
    } satisfies ListingPreviewData,
  },
]
