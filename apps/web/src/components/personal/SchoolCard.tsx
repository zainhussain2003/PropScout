/**
 * SchoolCard — single school card for the Personal Buyer report (§04 Schools).
 *
 * Shows EQAO score, Fraser percentile, in-catchment badge (accent border + badge),
 * distance/drive time, and grad rate (high schools only).
 *
 * Design source: personal-sections-2.jsx > SchoolCard
 */

import type { PersonalSchool } from '../../types/personal'

interface SchoolCardProps {
  school: PersonalSchool
}

function getEqaoTone(eqao: number): 'pass' | 'caution' | 'fail' {
  if (eqao >= 8.0) return 'pass'
  if (eqao >= 6.0) return 'caution'
  return 'fail'
}

function getFraserLabel(fraser: number): string {
  if (fraser >= 80) return 'Top 20%'
  if (fraser >= 60) return 'Above avg'
  if (fraser >= 40) return 'Average'
  return 'Below avg'
}

export function SchoolCard({ school }: SchoolCardProps): JSX.Element {
  const eqaoTone = getEqaoTone(school.eqao)
  const fraserLabel = getFraserLabel(school.fraser)

  const eqaoColor =
    eqaoTone === 'pass' ? 'var(--pass)' : eqaoTone === 'caution' ? 'var(--caution)' : 'var(--fail)'

  return (
    <div
      className="card col"
      style={{
        padding: 20,
        gap: 14,
        borderColor: school.inCatchment
          ? 'color-mix(in oklab, var(--accent) 35%, var(--line))'
          : 'var(--line)',
        background: school.inCatchment
          ? 'color-mix(in oklab, var(--accent) 4%, var(--surface))'
          : 'var(--surface)',
        position: 'relative',
      }}
    >
      {school.inCatchment && (
        <span
          className="mono"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            padding: '3px 8px',
            borderRadius: 999,
            border: '1px solid color-mix(in oklab, var(--accent) 35%, transparent)',
            background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
          }}
        >
          In catchment
        </span>
      )}

      {/* School name + board */}
      <div className="col" style={{ gap: 2 }}>
        <h4 className="serif" style={{ fontSize: 17, lineHeight: 1.2 }}>
          {school.name}
        </h4>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {school.board} · {school.grades}
        </div>
      </div>

      {/* EQAO + Fraser row */}
      <div className="row" style={{ gap: 16, marginTop: 4 }}>
        <div className="col" style={{ gap: 6, flex: 1 }}>
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            EQAO
          </span>
          {/* Bar track */}
          <div
            style={{
              position: 'relative',
              height: 6,
              background: 'var(--line)',
              borderRadius: 999,
            }}
          >
            {/* Filled bar — width reflects score out of 10 */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                borderRadius: 999,
                background: eqaoColor,
                width: `${Math.round((school.eqao / 10) * 100)}%`,
              }}
            />
          </div>
          {/* Numeric score to the right of the bar */}
          <div
            className="row"
            style={{ justifyContent: 'flex-end', alignItems: 'baseline', gap: 3 }}
          >
            <span
              className="serif tabular"
              style={{ fontSize: 18, lineHeight: 1, color: eqaoColor }}
            >
              {school.eqao.toFixed(1)}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>/ 10</span>
          </div>
        </div>
        <div className="col" style={{ gap: 2, flex: 1 }}>
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Fraser
          </span>
          <span
            className="serif tabular"
            style={{ fontSize: 22, lineHeight: 1, color: 'var(--ink)' }}
          >
            {school.fraser}
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>th %ile</span>
          </span>
        </div>
      </div>

      <div className="divider" />

      {/* Distance + grad rate / percentile label */}
      <div
        className="row"
        style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}
      >
        <span>
          {school.distance} · {school.driveTime} drive
        </span>
        {school.gradRate !== undefined ? (
          <span className="tabular">{Math.round(school.gradRate * 100)}% grad rate</span>
        ) : (
          <span>{fraserLabel}</span>
        )}
      </div>
    </div>
  )
}
