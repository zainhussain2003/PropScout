/**
 * SchoolColumn — column header + list of SchoolCards.
 *
 * Used three times in the §04 Schools section:
 *   <SchoolColumn label="Elementary" schools={schools.elementary}/>
 *   <SchoolColumn label="Middle"     schools={schools.middle}/>
 *   <SchoolColumn label="High school" schools={schools.high}/>
 *
 * Design source: personal-sections-2.jsx > SchoolColumn
 */

import type { PersonalSchool } from '../../types/personal'
import { SchoolCard } from './SchoolCard'

interface SchoolColumnProps {
  /** e.g. "Elementary", "Middle", "High school" */
  label: string
  schools: PersonalSchool[]
}

export function SchoolColumn({ label, schools }: SchoolColumnProps): JSX.Element {
  return (
    <div className="col" style={{ gap: 10 }}>
      <div
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
      </div>
      {schools.map((s) => (
        <SchoolCard key={s.name} school={s} />
      ))}
    </div>
  )
}
