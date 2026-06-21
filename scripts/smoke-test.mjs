/**
 * End-to-end smoke test — Fastify API + calc engine + Supabase.
 *
 * Inserts a known listing + pending analyses row into Supabase, calls
 * POST /analysis on the Fastify API, verifies the response shape, then
 * cleans up.
 *
 * Run prerequisites:
 *   - Calc engine on :8000
 *   - Fastify API on :3001
 *   - .env populated with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage: node scripts/smoke-test.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_URL = process.env.API_URL ?? 'http://localhost:3001'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const stamp = Date.now()
const TOKEN = `smoke-${stamp}`
const URL = `https://www.realtor.ca/smoke-test/${stamp}`

async function fail(msg, extra) {
  console.error(`✗ ${msg}`)
  if (extra) console.error(extra)
  await cleanup()
  process.exit(1)
}

async function cleanup() {
  await supabase.from('analyses').delete().eq('share_token', TOKEN)
  await supabase.from('listings').delete().eq('source_url', URL)
}

async function main() {
  console.log(`Smoke test — token: ${TOKEN}`)

  // 1. Insert listing
  console.log('1. Inserting listing...')
  const { data: listingData, error: listingError } = await supabase
    .from('listings')
    .insert({
      source_url: URL,
      source: 'manual',
      listing_type: 'for_sale',
      address: '5702 Buttermill Ave, Vaughan, ON L4K 0J2',
      postal_code: 'L4K0J2',
      province: 'ON',
      price: 729900,
      beds: 3,
      baths: 2,
      sqft: 1200,
      property_type: 'condo',
      annual_taxes: 3326,
      taxes_known: true,
      condo_fee_monthly: 761,
      condo_fee_known: true,
      year_built: 2015,
      year_built_known: true,
      listing_description: 'Beautiful 3-bed condo in Vaughan.',
      photo_urls: null,
      days_on_market: null,
    })
    .select('id')
    .single()

  if (listingError) await fail('Listing insert failed', listingError)
  console.log(`   listing id: ${listingData.id}`)

  // 2. Insert pending analyses row
  console.log('2. Inserting pending analysis row...')
  const { error: analysisError } = await supabase.from('analyses').insert({
    listing_id: listingData.id,
    report_mode: 'investment',
    share_token: TOKEN,
    share_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })
  if (analysisError) await fail('Analyses insert failed', analysisError)

  // 3. POST /analysis with the token
  console.log('3. Calling POST /analysis...')
  const res = await fetch(`${API_URL}/analysis/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: TOKEN, mode: 'investor' }),
  })

  const body = await res.json()
  if (res.status !== 200) {
    await fail(`Expected 200, got ${res.status}`, body)
  }

  // 4. Verify response shape
  console.log('4. Verifying response...')
  const checks = [
    ['token matches', body.token === TOKEN],
    ['analysis present', body.analysis != null],
    ['mode is investor', body.analysis?.mode === 'investor'],
    ['metrics.capRate is a number', typeof body.analysis?.metrics?.capRate === 'number'],
    ['dealScore present', body.analysis?.dealScore != null],
    ['narrative is string', typeof body.analysis?.narrative === 'string'],
  ]

  for (const [label, ok] of checks) {
    if (!ok) await fail(`Check failed: ${label}`, JSON.stringify(body).slice(0, 500))
    console.log(`   ✓ ${label}`)
  }

  // 5. Verify analyses row was updated
  console.log('5. Verifying DB persistence...')
  const { data: saved, error: fetchError } = await supabase
    .from('analyses')
    .select('calculated_metrics, ai_narrative, deal_score')
    .eq('share_token', TOKEN)
    .single()

  if (fetchError) await fail('Fetch saved analysis failed', fetchError)
  if (!saved.calculated_metrics) await fail('calculated_metrics not persisted', saved)
  if (typeof saved.deal_score !== 'number') await fail('deal_score not persisted', saved)
  console.log(`   ✓ deal_score persisted: ${saved.deal_score}`)
  console.log(`   ✓ calculated_metrics has ${Object.keys(saved.calculated_metrics).length} fields`)

  // 6. GET /analysis/:token round-trip
  console.log('6. Calling GET /analysis/:token...')
  const getRes = await fetch(`${API_URL}/analysis/${TOKEN}`)
  const getBody = await getRes.json()
  if (getRes.status !== 200) await fail(`GET expected 200, got ${getRes.status}`, getBody)
  if (getBody.status !== 'complete') await fail(`GET status: ${getBody.status}`, getBody)
  console.log(`   ✓ GET returned status=complete`)

  await cleanup()
  console.log('\n✓ Smoke test passed.')
}

main().catch(async (err) => {
  console.error('Unhandled error:', err)
  await cleanup()
  process.exit(1)
})
