// tenant-sections-3.jsx — Listed vs Reality, What's Included (amenities),
// Location & Commute, and the collapsible Unit Details breakdown.

const { useState: useStateTs3 } = React;

// ═════════════════════════════════════════════════════════════════
//  Listed vs Reality — punchy two-card comparison
// ═════════════════════════════════════════════════════════════════
function ListedVsRealitySection() {
  const listed = [
    '2 bedrooms + study',
    '2 full bathrooms',
    '9ft ceilings throughout',
    'Expansive windows, filled with natural light',
    '105 sqft balcony, unobstructed views',
    'Ensuite laundry',
    'Parking — contact manager',
  ];
  const reality = [
    { txt: '1 proper bedroom + 1 glass-door den', tone: 'bad' },
    { txt: '2 full bathrooms', tone: 'ok' },
    { txt: '9ft ceilings in main living area', tone: 'ok' },
    { txt: 'Floor-to-ceiling windows in living — den likely has none', tone: 'bad' },
    { txt: '105 sqft balcony — legitimate', tone: 'ok' },
    { txt: 'Ensuite laundry confirmed', tone: 'ok' },
    { txt: 'No parking confirmed — clarify urgently', tone: 'bad' },
  ];

  return (
    <section className="container tr-section">
      <SectionHead
        n="03"
        topic="Listed vs Reality"
        question={<>What the listing <em>says</em> · what you'll <em>actually</em> get.</>}
        verdict="3 mismatches"
        verdictTone="fail"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* LISTED */}
        <div className="card col" style={{ padding: 28, background: 'var(--bg-elev)' }}>
          <div className="row gap-8" style={{ marginBottom: 16 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 999,
              background: 'color-mix(in oklab, var(--muted) 12%, transparent)',
              color: 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}><Icon name="doc" size={14}/></span>
            <div className="col" style={{ gap: 2 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>How it's listed</span>
              <span className="serif" style={{ fontSize: 18 }}>Marketing copy</span>
            </div>
          </div>
          <div className="col">
            {listed.map((l, i) => (
              <div key={i} className="row gap-12" style={{
                fontSize: 14, color: 'var(--ink-2)',
                padding: '10px 0',
                borderBottom: i < listed.length - 1 ? '1px solid var(--line)' : 'none',
              }}>
                <span style={{ color: 'var(--muted)', flexShrink: 0 }}>·</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* REALITY */}
        <div className="card col" style={{ padding: 28, borderColor: 'color-mix(in oklab, var(--fail) 25%, var(--line))' }}>
          <div className="row gap-8" style={{ marginBottom: 16 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 999,
              background: 'color-mix(in oklab, var(--fail) 12%, transparent)',
              color: 'var(--fail)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13,
            }}><Icon name="flag" size={14}/></span>
            <div className="col" style={{ gap: 2 }}>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fail)' }}>What you'll actually get</span>
              <span className="serif" style={{ fontSize: 18 }}>After our analysis</span>
            </div>
          </div>
          <div className="col">
            {reality.map((r, i) => (
              <div key={i} className="row gap-12" style={{
                fontSize: 14, color: r.tone === 'bad' ? 'var(--fail)' : 'var(--ink)',
                padding: '10px 0',
                borderBottom: i < reality.length - 1 ? '1px solid var(--line)' : 'none',
                alignItems: 'flex-start',
              }}>
                <span style={{ color: r.tone === 'bad' ? 'var(--fail)' : 'var(--pass)', flexShrink: 0, marginTop: 2 }}>
                  {r.tone === 'bad' ? '✗' : '✓'}
                </span>
                <span style={{ fontWeight: r.tone === 'bad' ? 500 : 400 }}>{r.txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════
//  What's Included — building amenities
// ═════════════════════════════════════════════════════════════════
function WhatsIncludedSection() {
  // Each amenity: { label, value }
  // value 'incl' (in rent), 'extra' (added cost), 'unclear' (verify)
  const amenities = [
    { label: 'Heat',                  status: 'incl' },
    { label: 'Water',                 status: 'incl' },
    { label: 'Central air',           status: 'incl' },
    { label: 'Internet · 1 Gbps',     status: 'incl' },
    { label: 'Gym & fitness centre',  status: 'incl' },
    { label: 'Rooftop pool & deck',   status: 'incl' },
    { label: 'Sauna + yoga studio',   status: 'incl' },
    { label: 'Party room & lounge',   status: 'incl' },
    { label: '24-hr concierge',       status: 'incl' },
    { label: 'YMCA membership',       status: 'incl' },
    { label: 'Indoor running track',  status: 'incl' },
    { label: 'Rooftop BBQ terrace',   status: 'incl' },
    { label: 'Hydro / electricity',   status: 'extra', note: '~$80–110/mo' },
    { label: 'Parking',               status: 'unclear', note: 'confirm with landlord' },
  ];

  const totalValue = '~$320/mo';

  return (
    <section className="container tr-section">
      <SectionHead
        n="06"
        topic="What's included"
        question={<>What does <em>$2,150</em> actually buy you?</>}
        verdict={`+${totalValue} included`}
        verdictTone="pass"
      />

      <div className="card" style={{ padding: 28 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 560 }}>
            Tenant unions estimate the included amenities + utilities below would cost <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>$320/mo</span> to replace independently. That meaningfully shifts the value calculation — adjusted, you're paying closer to <span className="tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>$1,830/mo</span> for the unit itself.
          </p>
          <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
            <Legend swatch="pass"    label="Included"/>
            <Legend swatch="caution" label="Extra"/>
            <Legend swatch="fail"    label="Unclear"/>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 10,
        }}>
          {amenities.map((a) => <AmenityCell key={a.label} a={a}/>)}
        </div>
      </div>
    </section>
  );
}

function AmenityCell({ a }) {
  const color =
    a.status === 'incl'    ? 'var(--pass)' :
    a.status === 'extra'   ? 'var(--caution)' :
                              'var(--fail)';
  const glyph =
    a.status === 'incl'    ? '✓' :
    a.status === 'extra'   ? '$' :
                              '?';
  return (
    <div className="row gap-12" style={{
      padding: '12px 14px',
      borderRadius: 12,
      background: `color-mix(in oklab, ${color} 6%, var(--bg-elev))`,
      border: `1px solid color-mix(in oklab, ${color} 20%, var(--line))`,
      alignItems: 'center',
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 999,
        background: `color-mix(in oklab, ${color} 18%, transparent)`,
        color, fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{glyph}</span>
      <div className="col grow" style={{ gap: 0, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{a.label}</span>
        {a.note && <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{a.note}</span>}
      </div>
    </div>
  );
}

function Legend({ swatch, label }) {
  const color = swatch === 'pass' ? 'var(--pass)' : swatch === 'caution' ? 'var(--caution)' : 'var(--fail)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }}/>
      <span>{label}</span>
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Location & Commute
// ═════════════════════════════════════════════════════════════════
function LocationCommuteSection() {
  return (
    <section className="container tr-section">
      <SectionHead
        n="07"
        topic="Location & commute"
        question={<>What's it like to <em>live there</em>?</>}
        verdict="Excellent transit · limited walk"
        verdictTone="pass"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Scores card */}
        <div className="card col" style={{ padding: 28, gap: 24 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Mobility scores
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>via Walk Score · Mapbox</span>
          </div>

          {/* Score rows */}
          <div className="col gap-20">
            {[
              { label: 'Walk Score',    val: 72, sub: 'Mostly walkable for daily needs',    tone: 'caution' },
              { label: 'Transit Score', val: 85, sub: 'Excellent — VMC subway 2-min walk',  tone: 'pass' },
              { label: 'Bike Score',    val: 58, sub: 'Bikeable for some trips',            tone: 'caution' },
            ].map((s) => (
              <div key={s.label} className="col gap-8">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{s.label}</span>
                  <span className="serif tabular" style={{ fontSize: 28, lineHeight: 1, color: s.tone === 'pass' ? 'var(--pass)' : 'var(--caution)' }}>
                    {s.val}<span style={{ fontSize: 12, color: 'var(--muted)' }}>/100</span>
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ width: `${s.val}%`, height: '100%', background: s.tone === 'pass' ? 'var(--pass)' : 'var(--caution)', borderRadius: 999 }}/>
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.sub}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distances card */}
        <div className="card col gap-16" style={{ padding: 28 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            From this address
          </div>
          {[
            { k: 'VMC Subway (Line 1)',          v: '2 min',  unit: 'walk',  tone: 'pass' },
            { k: 'Downtown Toronto',              v: '~50 min', unit: 'no transfers', tone: 'pass' },
            { k: 'York University',               v: '7 min',  unit: 'subway', tone: 'pass' },
            { k: 'Hwy 400 / 407',                 v: '~1 km',  unit: 'on-ramp', tone: 'pass' },
            { k: 'Vaughan Mills · Costco · IKEA', v: '6 min',  unit: 'drive',  tone: 'pass' },
            { k: 'Pearson Airport',               v: '25 min', unit: 'drive',  tone: 'pass' },
            { k: 'Walkable cafés / restaurants',  v: 'Limited', unit: '',      tone: 'caution' },
            { k: 'Nearest grocery',               v: '8 min',  unit: 'walk',   tone: 'caution' },
            { k: 'Active construction nearby',    v: 'Yes',    unit: 'some noise', tone: 'caution' },
          ].map((d, i) => (
            <div key={d.k} className="row" style={{
              justifyContent: 'space-between',
              padding: '13px 0',
              borderBottom: i < 8 ? '1px solid var(--line)' : 'none',
              fontSize: 13,
              gap: 12,
            }}>
              <span style={{ color: 'var(--ink-2)' }}>{d.k}</span>
              <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
                <span className="mono tabular" style={{
                  color: d.tone === 'pass' ? 'var(--ink)' : 'var(--caution)',
                  fontWeight: 500,
                  fontSize: 13,
                }}>{d.v}</span>
                {d.unit && <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {d.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Unit Details — collapsible full breakdown
// ═════════════════════════════════════════════════════════════════
function UnitDetailsSection() {
  const [open, setOpen] = useStateTs3(false);

  const sections = [
    {
      title: 'The unit',
      rows: [
        ['Floor',           '37th of 55'],
        ['Total sqft',      'Not listed · est. 600–700'],
        ['Balcony',         '105 sqft · unobstructed', 'pass'],
        ['Bedroom 1',       'Proper bedroom · solid door', 'pass'],
        ['"Bedroom 2" / den', 'Sliding glass door · no privacy', 'fail'],
        ['Den window',      'Likely none · interior position', 'fail'],
        ['Bathrooms',       '2 full · ensuite', 'pass'],
        ['Kitchen',         'Built-in appliances · sleek cabinetry', 'pass'],
        ['Ceilings',        '9 ft', 'pass'],
        ['Windows',         'Floor-to-ceiling in living area', 'pass'],
        ['Laundry',         'Ensuite', 'pass'],
        ['Cooling',         'Central air'],
        ['Heating',         'Electric forced air'],
        ['Available',       'Now', 'pass'],
      ],
    },
    {
      title: 'The building',
      rows: [
        ['Building name',   'Transit City 2'],
        ['Year built',      '2022'],
        ['Storeys',         '55'],
        ['Total units',     '534'],
        ['Concierge',       '24-hr', 'pass'],
        ['Pets',            'Allowed · no size limit', 'pass'],
        ['Smoking',         'Non-smoking building'],
        ['Currently listed in building', '14 rental units · 8 for sale'],
        ['Median building rent (1-bed)', '$2,000/mo'],
        ['Average days on market', '17 days'],
      ],
    },
  ];

  return (
    <section className="container tr-section">
      <SectionHead
        n="11"
        topic="Unit & building details"
        question={<>The full <em>spec sheet</em>.</>}
        verdict={open ? 'Showing all' : '24 line items'}
        verdictTone="pass"
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: '100%', textAlign: 'left',
            padding: '20px 28px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: open ? '1px solid var(--line)' : 'none',
          }}
        >
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>Show all unit and building specs</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Floor, sqft, ceilings, windows, building stats, and more</span>
          </div>
          <span style={{ color: 'var(--muted)' }}>
            <Icon name={open ? 'minus' : 'plus'} size={18}/>
          </span>
        </button>

        {open && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {sections.map((sec, sIdx) => (
              <div key={sec.title} className="col" style={{
                padding: '24px 28px',
                borderRight: sIdx === 0 ? '1px solid var(--line)' : 'none',
              }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>
                  {sec.title}
                </div>
                <div className="col">
                  {sec.rows.map(([k, v, tone], i) => (
                    <div key={k} className="row" style={{
                      justifyContent: 'space-between',
                      padding: '9px 0',
                      borderBottom: i < sec.rows.length - 1 ? '1px solid var(--line)' : 'none',
                      fontSize: 13,
                      gap: 12,
                    }}>
                      <span style={{ color: 'var(--ink-2)' }}>{k}</span>
                      <span className="mono tabular" style={{
                        color: tone === 'pass' ? 'var(--pass)' : tone === 'fail' ? 'var(--fail)' : 'var(--ink)',
                        fontWeight: 500,
                        textAlign: 'right',
                      }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

Object.assign(window, {
  ListedVsRealitySection,
  WhatsIncludedSection,
  LocationCommuteSection,
  UnitDetailsSection,
});
