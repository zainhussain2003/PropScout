/**
 * ListingVisual — the image at the top of a report.
 *
 * ## Why this exists
 *
 * Every report opened with a four-frame photo grid: one large "exterior ·
 * condo" tile, three thumbnails labelled "living", "kitchen", "floorplan", and
 * a "+ 18 more" badge. All of it rendered whether or not the listing had a
 * single photo — and a listing entered by address never has any, because there
 * is no page to take them from.
 *
 * So the first thing a reader saw was 360px of empty grey claiming the report
 * had eighteen photos it did not have. It made a finished report look broken,
 * and it invented content, which is the one thing this product must not do.
 *
 * When there are photos, this shows them. When there are none it shows the
 * property on a real map instead — true, useful, and the same visual weight,
 * so the page still opens on something worth looking at rather than a hole.
 */

import { MiniMap } from './MiniMap'

/** Height of the hero visual, in px. Pins the row so photos of any aspect
 *  ratio cannot grow it and push into the address heading below. */
export const LISTING_VISUAL_HEIGHT_PX = 360

interface ListingVisualProps {
  /** Photo URLs from the scraper. Empty or undefined for address-entered listings. */
  photoUrls?: string[]
  /** Shown as the image alt text and the map's label. */
  address: string
  /** Subject coordinates — renders the real Mapbox map when photos are absent. */
  center?: { lat: number; lng: number } | null
  /** e.g. "condo" — used in alt text only. */
  propertyType?: string
}

export function ListingVisual({
  photoUrls,
  address,
  center,
  propertyType = 'property',
}: ListingVisualProps): JSX.Element {
  const photos = photoUrls ?? []

  // ── No photos: show where it is, and say why there are none ───────────────
  if (photos.length === 0) {
    return (
      <div className="col" style={{ gap: 8 }}>
        <div
          style={{
            borderRadius: 18,
            overflow: 'hidden',
            height: LISTING_VISUAL_HEIGHT_PX,
          }}
        >
          <MiniMap
            height={LISTING_VISUAL_HEIGHT_PX}
            address={address}
            pins={[]}
            center={center}
            // The address heading sits immediately below this map; captioning
            // the map with the same text looked like a duplicated element.
            showAddressLabel={false}
          />
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10.5,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          No listing photos · report built from the address
        </div>
      </div>
    )
  }

  // ── One photo: let it fill the width rather than sit beside empty frames ──
  if (photos.length === 1) {
    return (
      <div style={{ borderRadius: 18, overflow: 'hidden', height: LISTING_VISUAL_HEIGHT_PX }}>
        <img
          src={photos[0]}
          alt={`Exterior of ${address}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  // ── Several photos: main image plus however many thumbnails we actually have.
  // The stack is built from the photos that exist, never from fixed room labels,
  // so a three-photo listing shows three frames rather than three grey holes.
  const thumbs = photos.slice(1, 4)
  const remaining = photos.length - 1 - thumbs.length

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 8,
        gridTemplateRows: LISTING_VISUAL_HEIGHT_PX + 'px',
        height: LISTING_VISUAL_HEIGHT_PX,
        overflow: 'hidden',
      }}
    >
      <div style={{ borderRadius: 18, height: '100%', overflow: 'hidden' }}>
        <img
          src={photos[0]}
          alt={`Exterior of ${address}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* minHeight:0 lets the flex children shrink below their intrinsic image
          height instead of forcing the pinned row taller. */}
      <div className="col" style={{ gap: 8, minHeight: 0 }}>
        {thumbs.map((url, idx) => (
          <div
            key={url}
            style={{
              borderRadius: 14,
              flex: 1,
              minHeight: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img
              src={url}
              alt={`${propertyType} interior ${idx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Only claim more photos when more actually exist. */}
            {idx === thumbs.length - 1 && remaining > 0 && (
              <div
                className="mono"
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 10,
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  padding: '3px 8px',
                  background: 'color-mix(in oklab, var(--surface) 90%, transparent)',
                  borderRadius: 999,
                  color: 'var(--ink)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                + {remaining} more
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
