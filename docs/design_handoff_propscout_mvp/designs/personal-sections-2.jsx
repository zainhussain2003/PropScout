// personal-sections-2.jsx — §02 FMV · §03 Sales · §04 Schools · §05 Neighbourhood ·
//                            §06 SunScout · §07 Risks · §08 Map · §09 Checklist · Conversion

const { useState: useStatePs2 } = React;

// ══════════════════════════════════════════════════════════════════
//  § 02 · Fair market value positioning
// ══════════════════════════════════════════════════════════════════
function PBFMVSection({ property, score }) {
  const { fmv } = property;
  const askPos = ((property.price - fmv.low) / (fmv.high - fmv.low)) * 100;
  const verdictLabel =
    property.price <= fmv.low + (fmv.mid - fmv.low) * 0.3  ? 'Below market'  :
    property.price <= fmv.mid + (fmv.high - fmv.mid) * 0.3 ? 'At market'     :
                                                              'Above market';
  const verdictTone = verdictLabel === 'Above market' ? 'caution' : 'pass';

  return (
    <section className="container tr-section">
      <PBSectionHead
        n="02"
        topic="Fair market value"
        question={<>Is it priced <em>fairly</em>?</>}
        verdict={verdictLabel}
        verdictTone={verdictTone}
      />

      <div className="card" style={{ padding: 28 }}>
        {/* Header row */}
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>Asking</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
              <span className="serif tabular" style={{ fontSize: 32, lineHeight: 1 }}>{fmtMoney(property.price)}</span>
              <span className="mono" style={{ fontSize: 12, color: score.askVsMid <= 0 ? 'var(--pass)' : 'var(--caution)' }}>
                {score.askVsMid >= 0 ? '+' : '−'}{Math.abs(score.askVsMid * 100).toFixed(1)}% vs P50
              </span>
            </div>
          </div>
          <span className={`verdict-pill ${verdictTone}`}>{verdictLabel}</span>
        </div>

        {/* Range bar */}
        <div style={{ position: 'relative', height: 32, marginTop: 10, marginBottom: 18 }}>
          <div style={{
            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
            left: 0, right: 0, height: 6, borderRadius: 999,
            background: 'linear-gradient(90deg, color-mix(in oklab, var(--accent) 18%, var(--bg-elev)), color-mix(in oklab, var(--accent) 55%, transparent), color-mix(in oklab, var(--accent) 18%, var(--bg-elev)))',
          }}/>
          {[0, 50, 100].map((p) => (
            <div key={p} style={{
              position: 'absolute', left: `${p}%`, top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 1.5, height: 14, background: 'var(--ink)',
              opacity: p === 50 ? 0.4 : 0.18,
            }}/>
          ))}
          {/* Ask marker */}
          <div style={{
            position: 'absolute', left: `${askPos}%`, top: '50%',
            transform: 'translate(-50%, -50%)',
          }}>
            <div style={{
              width: 18, height: 18,
              background: 'var(--ink)',
              borderRadius: 4,
              transform: 'rotate(45deg)',
              border: '3px solid var(--surface)',
              boxShadow: '0 4px 10px rgba(14,19,32,0.2)',
            }}/>
          </div>
        </div>

        {/* Percentile labels */}
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
          {[
            { lbl: 'P25 · low',    val: fmv.low,  align: 'flex-start' },
            { lbl: 'P50 · median', val: fmv.mid,  align: 'center' },
            { lbl: 'P75 · high',   val: fmv.high, align: 'flex-end' },
          ].map((t) => (
            <div key={t.lbl} className="col" style={{ alignItems: t.align, gap: 2 }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)' }}>{t.lbl}</div>
              <div className="mono tabular" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{fmtMoney(t.val)}</div>
            </div>
          ))}
        </div>

        <div className="divider" style={{ marginBottom: 16 }}/>

        {/* Quick stats */}
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 13, color: 'var(--muted)' }}>
          <span className="row gap-8"><span>Comparable sales considered</span> <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>8 verified</span></span>
          <span className="row gap-8"><span>Average days on market</span>     <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>12 days</span></span>
          <span className="row gap-8"><span>Median $/sqft</span>                <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>$538</span></span>
          <span className="row gap-8"><span>This listing $/sqft</span>           <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>${Math.round(property.price / property.sqft)}</span></span>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  § 03 · Comparable sales (recent · within 1km)
// ══════════════════════════════════════════════════════════════════
function PBSalesSection({ comps }) {
  const median = comps.slice().sort((a, b) => a.sold - b.sold)[Math.floor(comps.length / 2)];
  return (
    <section className="container tr-section">
      <PBSectionHead
        n="03"
        topic="Comparable sales"
        question={<>What's <em>actually</em> selling around here?</>}
        verdict={`${comps.length} sales · last 6 mo`}
        verdictTone="pass"
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr',
          padding: '14px 24px',
          background: 'var(--bg-elev)',
          borderBottom: '1px solid var(--line)',
        }}>
          {['Address', 'Beds', 'Sqft', 'Sold for', '$/sqft', 'DOM'].map((h, i) => (
            <div key={h} className="mono" style={{
              fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--muted)',
              textAlign: i === 0 ? 'left' : 'right',
            }}>{h}</div>
          ))}
        </div>

        {comps.map((c, i) => (
          <div key={c.addr} style={{
            display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr',
            padding: '14px 24px',
            borderBottom: i < comps.length - 1 ? '1px solid var(--line)' : 'none',
            fontSize: 13.5,
            alignItems: 'center',
          }}>
            <div className="col" style={{ gap: 2 }}>
              <span style={{ color: 'var(--ink)' }}>{c.addr}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.distance} · sold {c.soldDate}</span>
            </div>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink)' }}>{c.beds}</span>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink)' }}>{c.sqft.toLocaleString()}</span>
            <span className="serif tabular" style={{ textAlign: 'right', fontSize: 16 }}>{fmtMoney(c.sold)}</span>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>${c.ppsqft}</span>
            <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{c.dom}d</span>
          </div>
        ))}

        {/* Summary footer */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 1fr 0.8fr 0.8fr',
          padding: '16px 24px',
          background: 'color-mix(in oklab, var(--accent) 5%, var(--bg-elev))',
          borderTop: '1px solid var(--line-strong)',
          alignItems: 'center',
        }}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Median · last 6 mo</span>
          <span/>
          <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{median.sqft}</span>
          <span className="serif tabular" style={{ textAlign: 'right', fontSize: 18, color: 'var(--accent)' }}>{fmtMoney(median.sold)}</span>
          <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--accent)' }}>${median.ppsqft}</span>
          <span className="mono tabular" style={{ textAlign: 'right', color: 'var(--accent)' }}>12d</span>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════
//  § 04 · School rankings — the unique personal-buyer section
// ══════════════════════════════════════════════════════════════════
function PBSchoolsSection({ schools }) {
  const topRanked = [...schools.elementary, ...schools.middle, ...schools.high]
    .filter((s) => s.inCatchment)
    .sort((a, b) => b.eqao - a.eqao)[0];

  return (
    <section className="container tr-section">
      <PBSectionHead
        n="04"
        topic="Schools"
        question={<>Where will the <em>kids</em> go?</>}
        verdict={topRanked ? `${topRanked.name.split(' ').slice(0, 2).join(' ')} · EQAO ${topRanked.eqao.toFixed(1)}` : 'No catchment data'}
        verdictTone="pass"
      />

      {/* Three columns: Elementary | Middle | High */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <SchoolColumn label="Elementary"   schools={schools.elementary}/>
        <SchoolColumn label="Middle"       schools={schools.middle}/>
        <SchoolColumn label="High school"  schools={schools.high}/>
      </div>

      {/* Methodology footnote */}
      <p style={{ marginTop: 24, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>
        EQAO scores (out of 10) are 2024 results from the Ontario Education Quality and Accountability Office. Fraser percentile is from the Fraser Institute's 2025 school report card. Catchment boundaries pulled live from board GIS data. <span style={{ color: 'var(--accent)' }}>Highlighted</span> = this property is inside the school's attendance boundary.
      </p>
    </section>
  );
}

function SchoolColumn({ label, schools }) {
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
        {label}
      </div>
      {schools.map((s) => <SchoolCard key={s.name} school={s}/>)}
    </div>
  );
}

function SchoolCard({ school }) {
  const eqao = school.eqao;
  const eqaoTone = eqao >= 9.0 ? 'pass' : eqao >= 8.0 ? 'pass' : eqao >= 7.0 ? 'caution' : 'fail';
  const fraserTop = school.fraser >= 80 ? 'Top 20%' : school.fraser >= 60 ? 'Above avg' : school.fraser >= 40 ? 'Average' : 'Below avg';

  return (
    <div className="card col" style={{
      padding: 20,
      gap: 14,
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

      <div className="col" style={{ gap: 2 }}>
        <h4 className="serif" style={{ fontSize: 17, lineHeight: 1.2 }}>{school.name}</h4>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {school.board} · {school.grades}
        </div>
      </div>

      {/* EQAO + Fraser */}
      <div className="row" style={{ gap: 16, marginTop: 4 }}>
        <div className="col" style={{ gap: 2, flex: 1 }}>
          <span className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>EQAO</span>
          <span className="serif tabular" style={{
            fontSize: 22, lineHeight: 1,
            color: eqaoTone === 'pass' ? 'var(--pass)' : eqaoTone === 'caution' ? 'var(--caution)' : 'var(--fail)',
          }}>{school.eqao.toFixed(1)}<span style={{ fontSize: 11, color: 'var(--muted)' }}> / 10</span></span>
        </div>
        <div className="col" style={{ gap: 2, flex: 1 }}>
          <span className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Fraser</span>
          <span className="serif tabular" style={{ fontSize: 22, lineHeight: 1, color: 'var(--ink)' }}>{school.fraser}<span style={{ fontSize: 11, color: 'var(--muted)' }}>th %ile</span></span>
        </div>
      </div>

      <div className="divider"/>

      <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
        <span>{school.distance} · {school.driveTime} drive</span>
        {school.gradRate && <span className="tabular">{Math.round(school.gradRate * 100)}% grad rate</span>}
        {!school.gradRate && <span>{fraserTop}</span>}
      </div>
    </div>
  );
}

Object.assign(window, { PBFMVSection, PBSalesSection, PBSchoolsSection, SchoolColumn, SchoolCard });
