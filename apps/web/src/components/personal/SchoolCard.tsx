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

// EQAO score is a 0–100 composite (% of students meeting the provincial standard).
function getEqaoTone(eqao: number): 'pass' | 'caution' | 'fail' {
  if (eqao >= 75) return 'pass'
  if (eqao >= 60) return 'caution'
  return 'fail'
}

function getFraserLabel(fraser: number): string {
  if (fraser >= 80) return 'Top 20%'
  if (fraser >= 60) return 'Above avg'
  if (fraser >= 40) return 'Average'
  return 'Below avg'
}

export function SchoolCard({ school }: SchoolCardProps): JSX.Element {
  // EQAO is missing for many schools (French boards, alternative/tiny cohorts).
  // Treat null / 0 as "no score" and hide the figure rather than render a red
  // "0.0 / 100" that reads as a real failing result.
  const hasEqao = school.eqao != null && school.eqao > 0
  const eqaoValue = school.eqao ?? 0
  const eqaoTone = getEqaoTone(eqaoValue)
  // Fraser data isn't loaded for any school yet — hide the figure entirely rather
  // than show "0th %ile" / "Below avg" that would read as a real (bad) ranking.
  const hasFraser = school.fraser != null && school.fraser > 0
  const fraserLabel = hasFraser ? getFraserLabel(school.fraser as number) : null

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
          {school.board}
          {school.grades && school.grades !== '—' ? ` · ${school.grades}` : ''}
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
          {hasEqao ? (
            <>
              {/* Bar track */}
              <div
                style={{
                  position: 'relative',
                  height: 6,
                  background: 'var(--line)',
                  borderRadius: 999,
                }}
              >
                {/* Filled bar — width reflects score out of 100 */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    borderRadius: 999,
                    background: eqaoColor,
                    width: `${Math.min(100, Math.round(eqaoValue))}%`,
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
                  {eqaoValue.toFixed(1)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>/ 100</span>
              </div>
            </>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--muted)', paddingTop: 2 }}>
              No EQAO score
            </span>
          )}
        </div>
        {hasFraser && (
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
        )}
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
        ) : fraserLabel ? (
          <span>{fraserLabel}</span>
        ) : null}
      </div>
    </div>
  )
}
