/**
 * Landing page — split out of pages/LandingPage.tsx (J-04, D-093).
 */

import { useState } from 'react'
import { Icon } from '../shared/Icon'
import { SectionHeader } from './SectionHeader'

// ── FAQSection ────────────────────────────────────────────────────────

export function FAQSection(): JSX.Element {
  const items = [
    {
      q: 'Why Ontario only at launch?',
      a: 'LTT, rent control, and the comp database are all province-specific. Running Ontario rules on a BC property overstates closing costs by tens of thousands. We gate non-Ontario URLs cleanly, take your email, and notify you when BC and Alberta ship.',
    },
    {
      q: 'Where do your rental comps come from?',
      a: 'A nightly scrape of Rentals.ca, Kijiji, and PadMapper. We dedupe, geocode, and timestamp every record. The time-series database accumulates from day one — after six months, it exists nowhere else in Canada.',
    },
    {
      q: 'How is the verdict produced?',
      a: 'The backend assembles the verdict deterministically from validated calculations, comparable data, and structured risk flags. The same inputs produce the same prose every time. Raw listing marketing text never directly changes a score or verdict.',
    },
    {
      q: 'Can I export to PDF?',
      a: 'Yes — Pro includes branded PDF export of the report, including the full verdict. Custom white-label branding is not available. Shared links follow the viewer’s plan; use the exported PDF to share the complete paid report.',
    },
    {
      q: 'Do you support short-term rentals?',
      a: 'STR legality (Toronto and Vancouver investment STR is prohibited) is flagged today. STR revenue modelling via AirDNA ships in Phase 2.',
    },
    {
      q: 'Is this financial advice?',
      a: 'No. PropScout is an analysis tool. The numbers are sourced and the methodology is published, but every decision is yours. Always confirm with a mortgage broker, lawyer, and accountant.',
    },
  ]

  const [open, setOpen] = useState(-1)

  return (
    <section id="faq" className="container" style={{ paddingTop: 'var(--pad-y)' }}>
      <div
        className="grid-1col-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: 60,
          alignItems: 'flex-start',
        }}
      >
        <SectionHeader
          tag="Common questions"
          title={<>Questions people ask before trusting a verdict.</>}
        >
          The methodology behind every number, and the honest limits of what a report can tell you.
        </SectionHeader>

        <div className="col" style={{ borderTop: '1px solid var(--line-strong)' }}>
          {items.map((it, i) => (
            <div key={it.q} style={{ borderBottom: '1px solid var(--line)' }}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="row"
                style={{
                  width: '100%',
                  padding: '22px 0',
                  justifyContent: 'space-between',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--ink)',
                  font: 'inherit',
                }}
              >
                <span className="serif" style={{ fontSize: 22, lineHeight: 1.2 }}>
                  {it.q}
                </span>
                <span style={{ color: 'var(--muted)' }}>
                  <Icon name={open === i ? 'minus' : 'plus'} size={18} />
                </span>
              </button>
              {open === i && (
                <div style={{ paddingBottom: 22, paddingRight: 40 }}>
                  <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 640 }}>{it.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
