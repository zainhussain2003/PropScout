/**
 * load-neighbourhood-stats.mjs — upsert FSA-level census stats into Supabase.
 *
 * CSV columns (header row required, any order):
 *   fsa, median_income, pop_growth_5y, data_year
 *
 * fsa is the 3-char Forward Sortation Area (e.g. "L5A"). median_income is an
 * integer ($), pop_growth_5y is a decimal (0.08 = 8%). Blank cells load as null.
 *
 * Run:   node scripts/load-neighbourhood-stats.mjs <path-to-csv>
 *
 * Upserts by fsa (primary key). Prerequisites: SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY in .env, and the neighbourhood_stats table
 * (supabase/migrations/20260707_add_neighbourhood_stats.sql) applied.
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
  console.error('Usage: node scripts/load-neighbourhood-stats.mjs <path-to-csv>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const CHUNK = 500

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const intOrNull = (v) => {
  if (v == null || v === '') return null
  const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10)
  return Number.isFinite(n) ? n : null
}
const numOrNull = (v) => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

async function main() {
  const rows = parseCsv(readFileSync(csvPath, 'utf8'))
  if (rows.length < 2) {
    console.error('CSV needs a header row and at least one data row')
    process.exit(1)
  }
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const idx = (c) => header.indexOf(c)
  if (idx('fsa') < 0) {
    console.error('Missing required column: fsa')
    process.exit(1)
  }

  const records = []
  let skipped = 0
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length === 1 && r[0] === '') continue
    const fsa = (r[idx('fsa')] ?? '').trim().toUpperCase()
    if (!/^[A-Z]\d[A-Z]$/.test(fsa)) {
      skipped++
      continue
    }
    records.push({
      fsa,
      median_income: idx('median_income') >= 0 ? intOrNull(r[idx('median_income')]) : null,
      pop_growth_5y: idx('pop_growth_5y') >= 0 ? numOrNull(r[idx('pop_growth_5y')]) : null,
      data_year: idx('data_year') >= 0 ? intOrNull(r[idx('data_year')]) : null,
    })
  }
  console.log(`Parsed ${records.length} FSA rows (skipped ${skipped})`)

  let done = 0
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const { error } = await supabase.from('neighbourhood_stats').upsert(chunk, { onConflict: 'fsa' })
    if (error) {
      console.error(`Chunk ${i / CHUNK} failed:`, error)
      process.exit(1)
    }
    done += chunk.length
    process.stdout.write(`\r  upserted ${done}/${records.length}`)
  }
  process.stdout.write('\n')
  console.log('Done.')
}

main().catch((e) => {
  console.error('Unhandled error:', e)
  process.exit(1)
})
