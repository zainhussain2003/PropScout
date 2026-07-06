/**
 * load-schools.mjs — upsert school records into Supabase from a CSV.
 *
 * Expected CSV columns (header row required, in any order):
 *   name, school_type, address, postal_code, lat, lng,
 *   eqao_score, fraser_rank_pct, graduation_rate, board, data_year
 *
 * school_type must be one of: elementary, middle, high
 *
 * Run:   node scripts/load-schools.mjs <path-to-csv>
 *
 * Conflict handling: upserts by (name, postal_code). Existing rows are
 * overwritten — design assumption is the CSV represents the latest snapshot.
 *
 * The CSV is not bundled — you supply it. Recommended sources:
 *   - EQAO results:    https://www.eqao.com/results-and-data
 *   - Fraser Institute: https://www.fraserinstitute.org/school-performance
 *
 * Prerequisites: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node scripts/load-schools.mjs <path-to-csv>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const VALID_TYPES = new Set(['elementary', 'middle', 'high'])
const CHUNK_SIZE = 500

/** Minimal CSV parser — handles quoted fields with embedded commas. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else if (c === '\r') {
        // skip
      } else {
        field += c
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function num(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function int(v) {
  if (v == null || v === '') return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

function normalizePostal(v) {
  if (!v) return null
  return String(v).replace(/\s+/g, '').toUpperCase().slice(0, 6)
}

async function main() {
  console.log(`Reading ${csvPath}`)
  const text = readFileSync(csvPath, 'utf8')
  const rows = parseCsv(text)
  if (rows.length < 2) {
    console.error('CSV needs a header row and at least one data row')
    process.exit(1)
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const required = ['name', 'school_type']
  for (const r of required) {
    if (!header.includes(r)) {
      console.error(`Missing required column: ${r}`)
      process.exit(1)
    }
  }
  const idx = (col) => header.indexOf(col)

  const records = []
  let skipped = 0
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length === 1 && r[0] === '') continue

    const schoolType = (r[idx('school_type')] ?? '').trim().toLowerCase()
    const name = (r[idx('name')] ?? '').trim()
    if (!name || !VALID_TYPES.has(schoolType)) {
      skipped++
      continue
    }

    records.push({
      name,
      school_type: schoolType,
      address: idx('address') >= 0 ? (r[idx('address')] ?? '').trim() || null : null,
      postal_code:
        idx('postal_code') >= 0 ? normalizePostal(r[idx('postal_code')]) : null,
      lat: idx('lat') >= 0 ? num(r[idx('lat')]) : null,
      lng: idx('lng') >= 0 ? num(r[idx('lng')]) : null,
      eqao_score: idx('eqao_score') >= 0 ? num(r[idx('eqao_score')]) : null,
      fraser_rank_pct:
        idx('fraser_rank_pct') >= 0 ? int(r[idx('fraser_rank_pct')]) : null,
      graduation_rate:
        idx('graduation_rate') >= 0 ? num(r[idx('graduation_rate')]) : null,
      board: idx('board') >= 0 ? (r[idx('board')] ?? '').trim() || null : null,
      data_year: idx('data_year') >= 0 ? int(r[idx('data_year')]) : null,
    })
  }

  console.log(`Parsed ${records.length} valid rows (skipped ${skipped})`)

  let inserted = 0
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase
      .from('schools')
      .upsert(chunk, { onConflict: 'name,postal_code' })
    if (error) {
      console.error(`Chunk ${i / CHUNK_SIZE} failed:`, error)
      process.exit(1)
    }
    inserted += chunk.length
    process.stdout.write(`\r  upserted ${inserted}/${records.length}`)
  }
  process.stdout.write('\n')
  console.log('Done.')
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
