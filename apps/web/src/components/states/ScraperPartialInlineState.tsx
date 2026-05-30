/**
 * ScraperPartialInlineState — inline callout card rendered when the scraper
 * successfully read some but not all listing fields.
 * Shows the missing fields as labelled inputs so the user can fill them in.
 *
 * Design source: error-states.jsx::ScraperPartialInlineState
 */

import { Icon } from '../shared/Icon'

interface ScraperPartialInlineStateProps {
  /** Number of fields successfully scraped. */
  scraped: number
  /** Total expected fields. */
  total: number
  /** Names of the fields that could not be extracted. */
  missing: string[]
}

export function ScraperPartialInlineState({
  scraped,
  total,
  missing,
}: ScraperPartialInlineStateProps): JSX.Element {
  return (
    <div
      className="card col"
      style={{
        padding: 28,
        gap: 18,
        borderColor: 'color-mix(in oklab, var(--accent) 30%, var(--line))',
        background: 'color-mix(in oklab, var(--accent) 4%, var(--surface))',
      }}
    >
      <div className="row gap-10">
        <span style={{ color: 'var(--accent)', flexShrink: 0 }}>
          <Icon name="doc" size={20} />
        </span>
        <div className="col" style={{ gap: 2 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>
            <em>
              {scraped} of {total}
            </em>{' '}
            fields found
          </h3>
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}
          >
            Auto-filled · {scraped} of {total}
          </span>
        </div>
      </div>

      <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 620, lineHeight: 1.55 }}>
        Some details could not be extracted. Fill in the missing fields below to get a complete
        analysis.
      </p>

      {/* Missing field inputs */}
      <div className="col gap-10">
        {missing.map((fieldName) => (
          <div
            key={fieldName}
            className="row"
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px dashed var(--accent)',
              gap: 16,
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <div className="col" style={{ gap: 2, minWidth: 160 }}>
              <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
                {fieldName}
              </span>
            </div>
            <input
              placeholder={fieldName}
              className="pr-input"
              style={{ minWidth: 200, maxWidth: 280 }}
            />
          </div>
        ))}
      </div>

      <div className="row gap-12">
        <button className="btn btn-primary">
          Run analysis <Icon name="arrow" size={13} />
        </button>
        <button className="btn btn-ghost">Save and finish later</button>
      </div>
    </div>
  )
}
