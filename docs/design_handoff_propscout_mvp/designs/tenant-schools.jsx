// tenant-schools.jsx — slim schools section for the Tenant Report.
// One card per board type (public · catholic · french) for each level (elementary · middle · high).
// Empty board slots are omitted entirely — no placeholder cards.

// Toronto M4Y · Bay Corridor — realistic mix of TDSB / TCDSB / CSDCSO
const TR_SCHOOLS = {
  elementary: [
    { board: 'public',   boardLabel: 'Public · TDSB',          name: 'Jesse Ketchum Jr & Sr PS',  grades: 'JK–8',  distance: '0.6 km', walk: '8 min', quality: 'above', inCatchment: true  },
    { board: 'catholic', boardLabel: 'Catholic · TCDSB',       name: "St. Michael's Catholic School", grades: 'JK–8',  distance: '0.9 km', walk: '11 min', quality: 'avg',   inCatchment: false },
    { board: 'french',   boardLabel: 'French Immersion · TDSB', name: 'Lord Lansdowne French Immersion', grades: 'SK–6', distance: '1.4 km', walk: '17 min', quality: 'above', inCatchment: false },
  ],
  middle: [
    // In Toronto, middle is mostly the 7-8 wing of a K-8. Sometimes there's no nearby French middle.
    { board: 'public',   boardLabel: 'Public · TDSB',     name: 'Lord Dufferin PS · Gr 7–8', grades: '7–8',  distance: '0.9 km', walk: '11 min', quality: 'avg',   inCatchment: true  },
    { board: 'catholic', boardLabel: 'Catholic · TCDSB',  name: "St. Paul Catholic · Gr 7–8", grades: '7–8', distance: '1.2 km', walk: '14 min', quality: 'avg',   inCatchment: false },
    // No nearby French middle programme — that card is intentionally omitted.
  ],
  high: [
    { board: 'public',   boardLabel: 'Public · TDSB',     name: 'Jarvis Collegiate Institute',   grades: '9–12', distance: '0.8 km', walk: '10 min', quality: 'above', inCatchment: true  },
    { board: 'catholic', boardLabel: 'Catholic · TCDSB',  name: "St. Michael's Choir School",    grades: '9–12', distance: '0.7 km', walk: '9 min',  quality: 'above', inCatchment: false },
    { board: 'french',   boardLabel: 'French · CSDCSO',    name: 'Étienne-Brûlé Secondary',       grades: '9–12', distance: '8.4 km', walk: '32 min · TTC', quality: 'avg',   inCatchment: false },
  ],
};

const BOARD_GLYPH = {
  public:   { letter: 'P', color: 'var(--pass)' },
  catholic: { letter: 'C', color: 'var(--accent)' },
  french:   { letter: 'F', color: 'var(--caution)' },
};

function TenantSchoolCard({ school }) {
  const glyph = BOARD_GLYPH[school.board];
  const qualityColor =
    school.quality === 'above' ? 'var(--pass)' :
    school.quality === 'below' ? 'var(--fail)' :
                                 'var(--ink-2)';
  const qualityLabel =
    school.quality === 'above' ? 'Above avg' :
    school.quality === 'below' ? 'Below avg' :
                                 'Average';

  return (
    <div className="card col" style={{
      padding: 18,
      gap: 12,
      borderColor: school.inCatchment ? 'color-mix(in oklab, var(--accent) 35%, var(--line))' : 'var(--line)',
      background: school.inCatchment ? 'color-mix(in oklab, var(--accent) 4%, var(--surface))' : 'var(--surface)',
      position: 'relative',
    }}>
      {school.inCatchment && (
        <span className="mono" style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--accent)',
          padding: '3px 8px', borderRadius: 999,
          border: '1px solid color-mix(in oklab, var(--accent) 35%, transparent)',
          background: 'color-mix(in oklab, var(--accent) 10%, transparent)',
        }}>In catchment</span>
      )}

      {/* Board chip */}
      <div className="row gap-10" style={{ alignItems: 'center' }}>
        <span style={{
          width: 26, height: 26, borderRadius: 8,
          background: `color-mix(in oklab, ${glyph.color} 14%, transparent)`,
          color: glyph.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 600, fontFamily: "'Geist Mono', monospace",
        }}>{glyph.letter}</span>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {school.boardLabel}
        </div>
      </div>

      {/* Name + grades */}
      <div className="col" style={{ gap: 2 }}>
        <div className="serif" style={{ fontSize: 16, lineHeight: 1.2, color: 'var(--ink)' }}>{school.name}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{school.grades}</div>
      </div>

      <div className="divider"/>

      {/* Distance + quality */}
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--muted)' }}>{school.distance} · {school.walk}</span>
        <span style={{ color: qualityColor, fontWeight: 500 }}>{qualityLabel}</span>
      </div>
    </div>
  );
}

function TenantSchoolColumn({ label, schools }) {
  if (!schools || schools.length === 0) return null;
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
        {label}
      </div>
      {schools.map((s) => <TenantSchoolCard key={s.name} school={s}/>)}
    </div>
  );
}

function TenantSchoolsSection() {
  const totalCards = [TR_SCHOOLS.elementary, TR_SCHOOLS.middle, TR_SCHOOLS.high]
    .reduce((sum, arr) => sum + (arr ? arr.length : 0), 0);
  const inCatchCount = [TR_SCHOOLS.elementary, TR_SCHOOLS.middle, TR_SCHOOLS.high]
    .reduce((sum, arr) => sum + (arr ? arr.filter((s) => s.inCatchment).length : 0), 0);

  return (
    <section className="container tr-section">
      <SectionHead
        n="08"
        topic="Schools nearby"
        question={<>What <em>schools</em> will your kids walk to?</>}
        verdict={`${inCatchCount} in catchment · ${totalCards} total`}
        verdictTone="pass"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'flex-start' }}>
        <TenantSchoolColumn label="Elementary" schools={TR_SCHOOLS.elementary}/>
        <TenantSchoolColumn label="Middle"      schools={TR_SCHOOLS.middle}/>
        <TenantSchoolColumn label="High school" schools={TR_SCHOOLS.high}/>
      </div>

      <p style={{ marginTop: 22, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        Quality is a tenant-friendly summary — Above / Average / Below — drawn from EQAO and Fraser Institute. <span style={{ color: 'var(--accent)' }}>Highlighted</span> = this address sits inside the school's attendance boundary. Boards with no nearby school for a level are skipped — for example, no nearby French middle program exists for this unit.
      </p>
    </section>
  );
}

Object.assign(window, { TR_SCHOOLS, TenantSchoolCard, TenantSchoolColumn, TenantSchoolsSection });
