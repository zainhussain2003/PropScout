/**
 * DueDiligenceSection — §11 of the investor / landlord report.
 *
 * A property-agnostic, interactive due-diligence checklist (title/legal, physical
 * inspection, tenancy/income, financing/insurance). The items are generic buyer
 * guidance — NOT fabricated property data — so this section is safe to render live
 * for any real listing. Mirrors the demo InvestorReport's checklist so the live
 * and demo reports match.
 */

import { useState, useCallback } from 'react'
import { SectionHead } from '../shared/SectionHead'

const DUE_DILIGENCE_ITEMS = [
  {
    category: 'Title & legal',
    items: [
      'Order title search — confirm no liens, encumbrances, or work orders',
      'Review status certificate (condos) — check for pending special assessments and reserve fund health',
      'Verify zoning and permitted uses with the municipality',
      'Confirm HST treatment with your accountant (new construction vs resale)',
    ],
  },
  {
    category: 'Physical inspection',
    items: [
      'Schedule a licensed home inspector — attend the inspection yourself',
      'Request HVAC service records; confirm system age and warranty status',
      'Check electrical panel — knob-and-tube and 60A panels affect insurability',
      'Inspect roof (freehold): ask for age and any recent repairs',
    ],
  },
  {
    category: 'Tenancy & income',
    items: [
      'Obtain copy of current lease(s) — confirm term, rent, last increase date',
      'Verify rent is at or below guideline maximum if property is rent-controlled',
      'Request last 12 months of utility bills to validate expense estimates',
      'Confirm no outstanding N1 (rent increase) or N12 (personal use) notices',
    ],
  },
  {
    category: 'Financing & insurance',
    items: [
      'Get mortgage pre-approval with a DSCR lender (not just your primary bank)',
      'Confirm property insurability — high-rise condos above 10 floors need specialist',
      'Get fire insurance quote before waiving conditions',
      'Ask lender about rental property surcharge on rate and down-payment minimum',
    ],
  },
] as const

export function DueDiligenceSection(): JSX.Element {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const toggle = useCallback((key: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const totalItems = DUE_DILIGENCE_ITEMS.reduce((s, g) => s + g.items.length, 0)
  const doneCount = checked.size
  const pct = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0

  return (
    <section className="container tr-section" data-section="11">
      <SectionHead
        n="11"
        topic="Due diligence"
        question={
          <>
            Get these <em>answered</em> first.
          </>
        }
        verdict={`${doneCount} / ${totalItems} complete`}
        tone={pct === 100 ? 'pass' : pct > 50 ? 'caution' : 'fail'}
      />

      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: 'var(--line)',
          marginBottom: 28,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 999,
            background: pct === 100 ? 'var(--pass)' : 'var(--accent)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div
        className="grid-1col-mobile"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}
      >
        {DUE_DILIGENCE_ITEMS.map((group) => (
          <div key={group.category} className="card col" style={{ padding: 24, gap: 16 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              {group.category}
            </div>
            <div className="col" style={{ gap: 10 }}>
              {group.items.map((item, idx) => {
                const key = `${group.category}-${idx}`
                const done = checked.has(key)
                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: done ? 'var(--muted)' : 'var(--ink)',
                      textDecoration: done ? 'line-through' : 'none',
                      transition: 'color 0.12s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggle(key)}
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        accentColor: 'var(--pass)',
                        width: 15,
                        height: 15,
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ lineHeight: 1.5 }}>{item}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
