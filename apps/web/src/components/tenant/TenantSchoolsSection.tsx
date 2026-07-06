/**
 * TenantSchoolsSection — §08 of the tenant report.
 *
 * Three-column grid: Elementary · Middle · High school.
 * Each column renders one card per school board (public, catholic, french).
 * Columns with no schools are omitted entirely — no placeholder cards shown.
 *
 * Each card shows:
 *   - Board glyph (P / C / F) with colour coding
 *   - School name + grade range
 *   - Distance + walk time
 *   - Quality badge (Above avg / Average / Below avg)
 *   - "In catchment" tag if the address is within the school's boundary
 *
 * Quality labels are tenant-friendly summaries drawn from EQAO + Fraser.
 */

import type { TenantSchools, TenantSchool, SchoolBoard } from '../../types/analysis'
import { SectionHead } from '../shared/SectionHead'

interface TenantSchoolsSectionProps {
  schools: TenantSchools
  /** Section number in the host report (default '08' — the tenant demo). */
  sectionNumber?: string
}

// ── Board glyph configuration ─────────────────────────────────────────────────

const BOARD_GLYPH: Record<SchoolBoard, { letter: string; color: string }> = {
  public: { letter: 'P', color: 'var(--pass)' },
  catholic: { letter: 'C', color: 'var(--accent)' },
  french: { letter: 'F', color: 'var(--caution)' },
}

// ── School card ───────────────────────────────────────────────────────────────

function TenantSchoolCard({ school }: { school: TenantSchool }): JSX.Element {
  const glyph = BOARD_GLYPH[school.board]

  const qualityColor =
    school.quality === 'above'
      ? 'var(--pass)'
      : school.quality === 'below'
        ? 'var(--fail)'
        : 'var(--ink-2)'

  const qualityLabel =
    school.quality === 'above' ? 'Above avg' : school.quality === 'below' ? 'Below avg' : 'Average'

  return (
    <div
      className="card col"
      style={{
        padding: 18,
        gap: 12,
        borderColor: school.inCatchment
          ? 'color-mix(in oklab, var(--accent) 35%, var(--line))'
          : 'var(--line)',
        background: school.inCatchment
          ? 'color-mix(in oklab, var(--accent) 4%, var(--surface))'
          : 'var(--surface)',
        position: 'relative',
      }}
    >
      {/* In catchment badge */}
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

      {/* Board glyph + label */}
      <div className="row" style={{ alignItems: 'center', gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: `color-mix(in oklab, ${glyph.color} 14%, transparent)`,
            color: glyph.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Geist Mono', monospace",
          }}
        >
          {glyph.letter}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {school.boardLabel}
        </span>
      </div>

      {/* School name + grades */}
      <div className="col" style={{ gap: 2 }}>
        <div className="serif" style={{ fontSize: 16, lineHeight: 1.2, color: 'var(--ink)' }}>
          {school.name}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
          {school.grades}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--line)' }} />

      {/* Distance + quality */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
        }}
      >
        <span style={{ color: 'var(--muted)' }}>
          {school.distance} · {school.walk}
        </span>
        <span style={{ color: qualityColor, fontWeight: 500 }}>{qualityLabel}</span>
      </div>
    </div>
  )
}

// ── Column (one level: Elementary / Middle / High) ────────────────────────────

function TenantSchoolColumn({
  label,
  schools,
}: {
  label: string
  schools: TenantSchool[]
}): JSX.Element | null {
  if (!schools || schools.length === 0) return null

  return (
    <div className="col" style={{ gap: 10 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      {schools.map((s) => (
        <TenantSchoolCard key={s.name} school={s} />
      ))}
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

export function TenantSchoolsSection({
  schools,
  sectionNumber = '08',
}: TenantSchoolsSectionProps): JSX.Element {
  const allSchools = [...schools.elementary, ...schools.middle, ...schools.high]
  const totalCards = allSchools.length
  const inCatchCount = allSchools.filter((s) => s.inCatchment).length

  // Real data never claims catchment (boundaries not ingested) — show the
  // honest count-only verdict instead of "0 catchment".
  const verdictLabel =
    inCatchCount > 0 ? `${inCatchCount} catchment · ${totalCards} total` : `${totalCards} nearby`

  return (
    <section className="container tr-section" data-section={sectionNumber}>
      <SectionHead
        n={sectionNumber}
        topic="Schools nearby"
        question={
          <>
            What <em>schools</em> will your kids walk to?
          </>
        }
        verdict={verdictLabel}
        tone="pass"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        <TenantSchoolColumn label="Elementary" schools={schools.elementary} />
        <TenantSchoolColumn label="Middle" schools={schools.middle} />
        <TenantSchoolColumn label="High school" schools={schools.high} />
      </div>

      <p
        style={{
          marginTop: 22,
          fontSize: 13,
          color: 'var(--muted)',
          maxWidth: 720,
        }}
      >
        Quality is a tenant-friendly summary — Above / Average / Below — drawn from EQAO and Fraser
        Institute. <span style={{ color: 'var(--accent)' }}>Highlighted</span> = this address sits
        inside the school's attendance boundary. Boards with no nearby school for a level are
        skipped.
      </p>
    </section>
  )
}
