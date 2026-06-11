/**
 * AnalyzingPage — shown at /analyzing after the user picks a report mode.
 *
 * URL params:
 *   url   — the Realtor.ca / Rentals.ca URL to scrape
 *   mode  — 'investor' | 'personal' | 'tenant' | 'landlord'
 *   kind  — 'sale' | 'rent'
 *
 * States:
 *   progress  — scraping + analysis running; shows 8-step progress animation
 *   manual    — scrape failed; shows pre-fillable manual entry form
 *   done      — analysis complete; auto-navigates to report
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Wordmark } from '../components/shared/Wordmark'
import { Icon } from '../components/shared/Icon'
import { ProvinceGate } from '../components/states/ProvinceGate'
import { HardLimitGate } from '../components/paywall/HardLimitGate'
import {
  scrapeUrl,
  runAnalysis,
  postWaitlist,
  type ScrapedListing,
  ApiRequestError,
} from '../lib/services/analysisService'
import { useAuth } from '../hooks/useAuth'
import { FREE_TIER } from '../constants/tiers'
import type { ReportMode } from '../types/analysis'
import type { PropertyInput, FinancingInput, RentalInput } from '../types/api'

// Ontario FSA prefix check — K, L, M, N, P
function isOntarioPostal(postalCode: string | null): boolean {
  if (!postalCode) return true // unknown → assume Ontario, let backend decide
  return ['K', 'L', 'M', 'N', 'P'].includes(postalCode.trim().toUpperCase().charAt(0))
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_FINANCING: FinancingInput = {
  downPaymentPct: 0.2,
  mortgageRate: 0.0479,
  amortizationYears: 25,
  includeManagementFee: false,
}

const DEFAULT_RENTAL: RentalInput = {
  low: 2200,
  mid: 2600,
  high: 3000,
  compCount: 0,
  confidence: 'low',
  postalCode: '',
}

const STEPS = [
  { label: 'Fetching listing', threshold: 8 },
  { label: 'Reading address', threshold: 22 },
  { label: 'Reading price', threshold: 36 },
  { label: 'Reading unit details', threshold: 50 },
  { label: 'Detecting building', threshold: 62 },
  { label: 'Pulling rental comps', threshold: 76 },
  { label: 'Scanning description', threshold: 88 },
  { label: 'Generating Scout AI verdict', threshold: 96 },
] as const

type View = 'progress' | 'manual' | 'done' | 'province_gate' | 'limit_gate'

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  address: string
  propertyType: string
  yearBuilt: string
  beds: string
  baths: string
  sqft: string
  parkingSpots: string
  price: string
  annualTaxes: string
  condoFeeMonthly: string
}

function blankForm(): FormState {
  return {
    address: '',
    propertyType: 'condo',
    yearBuilt: '',
    beds: '',
    baths: '',
    sqft: '',
    parkingSpots: '',
    price: '',
    annualTaxes: '',
    condoFeeMonthly: '',
  }
}

function fromScrape(listing: ScrapedListing): FormState {
  return {
    address: listing.address,
    propertyType: listing.propertyType,
    yearBuilt: listing.yearBuilt != null ? String(listing.yearBuilt) : '',
    beds: listing.beds != null ? String(listing.beds) : '',
    baths: listing.baths != null ? String(listing.baths) : '',
    sqft: listing.sqft != null ? String(listing.sqft) : '',
    parkingSpots: listing.parkingSpots > 0 ? String(listing.parkingSpots) : '',
    price: listing.price != null ? String(listing.price) : '',
    annualTaxes: listing.annualTaxes != null ? String(listing.annualTaxes) : '',
    condoFeeMonthly: listing.condoFeeMonthly != null ? String(listing.condoFeeMonthly) : '',
  }
}

function countFilled(f: FormState): number {
  return Object.values(f).filter((v) => v !== '').length
}

function buildPropertyInput(
  f: FormState,
  kind: 'sale' | 'rent',
  scrape: ScrapedListing | null,
  sourceUrl: string
): PropertyInput {
  return {
    address: f.address,
    province: scrape?.province ?? 'ON',
    price: Number(f.price) || 0,
    annualTaxes: Number(f.annualTaxes) || 0,
    condoFeeMonthly: f.condoFeeMonthly !== '' ? Number(f.condoFeeMonthly) : null,
    condoFeeKnown: scrape?.condoFeeKnown ?? f.condoFeeMonthly !== '',
    beds: Number(f.beds) || 0,
    baths: Number(f.baths) || 0,
    sqft: f.sqft !== '' ? Number(f.sqft) : null,
    yearBuilt: f.yearBuilt !== '' ? Number(f.yearBuilt) : null,
    propertyType: f.propertyType,
    isToronto: scrape?.isToronto ?? false,
    postalCode: scrape?.postalCode ?? '',
    sourceUrl: sourceUrl || undefined,
    listingType: kind === 'rent' ? 'for-rent' : 'for-sale',
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniNav({ onCancel }: { onCancel: () => void }): JSX.Element {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Wordmark height={24} />
      <button
        onClick={onCancel}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          color: 'var(--muted)',
          padding: '6px 12px',
          borderRadius: 8,
          font: 'inherit',
        }}
      >
        Cancel &amp; start over
      </button>
    </nav>
  )
}

function StepIcon({ status }: { status: 'done' | 'active' | 'pending' }): JSX.Element {
  if (status === 'done') {
    return (
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          background: 'var(--pass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#fff',
        }}
      >
        <Icon name="check" size={11} stroke={2.5} />
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          border: '2px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          animation: 'spin 1s linear infinite',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            border: '2px solid var(--accent)',
            borderTopColor: 'transparent',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      </span>
    )
  }
  return (
    <span
      style={{
        width: 20,
        height: 20,
        borderRadius: 999,
        border: '1.5px solid var(--line-strong)',
        flexShrink: 0,
      }}
    />
  )
}

interface ProgressViewProps {
  pct: number
  url: string
  scrape: ScrapedListing | null
}

function ProgressView({ pct, url, scrape }: ProgressViewProps): JSX.Element {
  const secsLeft = Math.max(1, Math.round(((100 - pct) / 100) * 12))

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 64px' }}>
      {/* URL strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 10,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          marginBottom: 32,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: 'var(--pass)',
            flexShrink: 0,
          }}
        />
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--pass)',
            flexShrink: 0,
          }}
        >
          Analyzing
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {url}
        </span>
      </div>

      {/* Headline */}
      <h1
        className="serif"
        style={{
          fontSize: 'clamp(28px, 3.5vw, 44px)',
          lineHeight: 1.1,
          letterSpacing: '-0.025em',
          marginBottom: 28,
        }}
      >
        Reading the listing and pulling{' '}
        <em style={{ color: 'var(--accent)' }}>
          {scrape != null ? 'rental comps' : 'comparable data'}
        </em>
      </h1>

      {/* Progress bar */}
      <div style={{ marginBottom: 36 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span
            className="mono"
            style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.12em' }}
          >
            {pct}% complete
          </span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            ~{secsLeft}s remaining
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: 'var(--line)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 999,
              transition: 'width .4s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Shimmer */}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                animation: 'shimmer 1.4s ease infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left: steps */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 16,
            border: '1px solid var(--line)',
            padding: '20px 22px',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 16,
            }}
          >
            What we&apos;re doing
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {STEPS.map((step, i) => {
              const active =
                pct >= step.threshold && (i === STEPS.length - 1 || pct < STEPS[i + 1].threshold)
              const done = pct >= (STEPS[i + 1]?.threshold ?? 100)
              const status = done ? 'done' : active ? 'active' : 'pending'
              return (
                <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StepIcon status={status} />
                  <span
                    style={{
                      fontSize: 13,
                      color: done || active ? 'var(--ink)' : 'var(--muted)',
                      transition: 'color .3s ease',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: preview cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Listing preview card */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 16,
              border: '1px solid var(--line)',
              padding: '16px 18px',
              opacity: pct > 50 ? 1 : 0.3,
              transition: 'opacity .6s ease',
            }}
          >
            <div
              style={{
                height: 100,
                borderRadius: 10,
                background: 'var(--bg-elev)',
                marginBottom: 12,
              }}
            />
            {scrape != null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{scrape.address}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {scrape.beds != null && `${scrape.beds} bed`}
                  {scrape.baths != null && ` · ${scrape.baths} bath`}
                  {scrape.sqft != null && ` · ${scrape.sqft.toLocaleString()} sqft`}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[80, 60, 40].map((w) => (
                  <div
                    key={w}
                    style={{
                      height: 10,
                      width: `${w}%`,
                      borderRadius: 999,
                      background: 'var(--line)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Comps found card */}
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 16,
              border: '1px solid var(--line)',
              padding: '16px 18px',
              opacity: pct > 76 ? 1 : 0.3,
              transition: 'opacity .6s ease',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 10,
              }}
            >
              Rental comps
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {['P25', 'P50', 'P75'].map((label) => (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      height: 32,
                      background: 'var(--bg-elev)',
                      borderRadius: 8,
                      marginBottom: 4,
                    }}
                  />
                  <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reassurance row */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginTop: 28,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {['Realtor.ca · live data', 'No data leaves your account', 'Takes ~12 seconds'].map(
          (text) => (
            <span
              key={text}
              className="mono"
              style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em' }}
            >
              {text}
            </span>
          )
        )}
      </div>
    </div>
  )
}

// ── Manual entry form ─────────────────────────────────────────────────────────

interface ManualViewProps {
  form: FormState
  filled: number
  kind: 'sale' | 'rent'
  submitting: boolean
  error: string | null
  onChange: (key: keyof FormState, val: string) => void
  onSubmit: () => void
}

function ManualView({
  form,
  filled,
  kind,
  submitting,
  error,
  onChange,
  onSubmit,
}: ManualViewProps): JSX.Element {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 64px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div
          className="mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: filled > 0 ? 'var(--pass)' : 'var(--muted)',
            padding: '4px 10px',
            borderRadius: 999,
            background:
              filled > 0 ? 'color-mix(in oklab, var(--pass) 10%, transparent)' : 'var(--bg-elev)',
            border: '1px solid',
            borderColor:
              filled > 0 ? 'color-mix(in oklab, var(--pass) 30%, transparent)' : 'var(--line)',
            marginBottom: 12,
          }}
        >
          {filled > 0 ? (
            <>
              <Icon name="check" size={11} stroke={2.5} />
              Auto-filled · {filled} of 10 fields
            </>
          ) : (
            'Enter listing details manually'
          )}
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(24px, 3vw, 36px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {filled > 0
            ? 'We pre-filled what we could — confirm and run'
            : "We couldn't read that listing automatically"}
        </h1>
        {filled === 0 && (
          <p style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 14 }}>
            Enter the key details and we&apos;ll run the full analysis.
          </p>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left: form cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Property basics */}
          <FormCard title="Property basics">
            <FormField
              label="Address"
              value={form.address}
              onChange={(v) => onChange('address', v)}
              placeholder="123 Main St, Toronto, ON"
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormSelect
                label="Type"
                value={form.propertyType}
                onChange={(v) => onChange('propertyType', v)}
                options={[
                  { value: 'condo', label: 'Condo' },
                  { value: 'house', label: 'House' },
                  { value: 'townhouse', label: 'Townhouse' },
                  { value: 'semi', label: 'Semi-detached' },
                  { value: 'duplex', label: 'Duplex' },
                ]}
              />
              <FormField
                label="Year built"
                value={form.yearBuilt}
                onChange={(v) => onChange('yearBuilt', v)}
                placeholder="2010"
                type="number"
                warn={form.yearBuilt === ''}
                warnMsg="Used in maintenance reserves"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <FormField
                label="Beds"
                value={form.beds}
                onChange={(v) => onChange('beds', v)}
                placeholder="2"
                type="number"
                required
              />
              <FormField
                label="Baths"
                value={form.baths}
                onChange={(v) => onChange('baths', v)}
                placeholder="1"
                type="number"
              />
              <FormField
                label="Sqft"
                value={form.sqft}
                onChange={(v) => onChange('sqft', v)}
                placeholder="850"
                type="number"
              />
            </div>
            <FormField
              label="Parking spots"
              value={form.parkingSpots}
              onChange={(v) => onChange('parkingSpots', v)}
              placeholder="0"
              type="number"
            />
          </FormCard>

          {/* Money */}
          {kind === 'sale' && (
            <FormCard title="Money">
              <FormField
                label="Asking price"
                value={form.price}
                onChange={(v) => onChange('price', v)}
                placeholder="699000"
                type="number"
                prefix="$"
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField
                  label="Annual property taxes"
                  value={form.annualTaxes}
                  onChange={(v) => onChange('annualTaxes', v)}
                  placeholder="4200"
                  type="number"
                  prefix="$"
                  required
                />
                <FormField
                  label="Condo fee / mo"
                  value={form.condoFeeMonthly}
                  onChange={(v) => onChange('condoFeeMonthly', v)}
                  placeholder="0"
                  type="number"
                  prefix="$"
                />
              </div>
            </FormCard>
          )}
        </div>

        {/* Right: run button */}
        <div style={{ position: 'sticky', top: 72 }}>
          {error != null && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'color-mix(in oklab, var(--fail) 8%, var(--surface))',
                border: '1px solid color-mix(in oklab, var(--fail) 25%, transparent)',
                color: 'var(--fail)',
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}
          <button
            onClick={onSubmit}
            disabled={submitting || form.address === '' || (kind === 'sale' && form.price === '')}
            style={{
              width: '100%',
              padding: '18px 24px',
              background: 'var(--ink)',
              color: 'var(--surface)',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              cursor:
                submitting || form.address === '' || (kind === 'sale' && form.price === '')
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                submitting || form.address === '' || (kind === 'sale' && form.price === '')
                  ? 0.5
                  : 1,
              transition: 'opacity .15s ease, transform .15s ease',
              font: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {submitting ? 'Running analysis…' : 'Run analysis'}
            {!submitting && <Icon name="arrow" size={16} />}
          </button>
          <p
            style={{
              marginTop: 10,
              fontSize: 12,
              color: 'var(--muted)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            We&apos;ll pull live comps and run the full analysis.
            <br />
            Takes about 12 seconds.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Form primitives ───────────────────────────────────────────────────────────

function FormCard({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 16,
        border: '1px solid var(--line)',
        padding: '20px 22px',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

interface FormFieldProps {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  type?: 'text' | 'number'
  prefix?: string
  required?: boolean
  warn?: boolean
  warnMsg?: string
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  prefix,
  required,
  warn,
  warnMsg,
}: FormFieldProps): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>{label}</label>
        {required === true && <span style={{ fontSize: 11, color: 'var(--muted)' }}>required</span>}
        {warn === true && value === '' && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--caution)',
              background: 'color-mix(in oklab, var(--caution) 12%, transparent)',
              padding: '1px 6px',
              borderRadius: 999,
            }}
          >
            {warnMsg ?? 'missing'}
          </span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        {prefix != null && (
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 13,
              color: 'var(--muted)',
              pointerEvents: 'none',
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: prefix != null ? '10px 12px 10px 24px' : '10px 12px',
            borderRadius: 10,
            border: '1.5px solid var(--line)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            fontSize: 13,
            font: 'inherit',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border-color .15s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--line)'
          }}
        />
      </div>
    </div>
  )
}

interface FormSelectProps {
  label: string
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
}

function FormSelect({ label, value, onChange, options }: FormSelectProps): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          border: '1.5px solid var(--line)',
          background: 'var(--surface)',
          color: 'var(--ink)',
          fontSize: 13,
          font: 'inherit',
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          transition: 'border-color .15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--line)'
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── AnalyzingPage ─────────────────────────────────────────────────────────────

export function AnalyzingPage(): JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session } = useAuth()

  const sourceUrl = decodeURIComponent(searchParams.get('url') ?? '')
  const mode = (searchParams.get('mode') ?? 'investor') as ReportMode
  const kind = (searchParams.get('kind') ?? 'sale') as 'sale' | 'rent'

  const [view, setView] = useState<View>('progress')
  const [pct, setPct] = useState(0)
  const [scrape, setScrape] = useState<ScrapedListing | null>(null)
  const [form, setForm] = useState<FormState>(blankForm())
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const apiDoneRef = useRef(false)
  const navigatedRef = useRef(false)

  const handleCancel = useCallback((): void => {
    if (timerRef.current != null) clearInterval(timerRef.current)
    navigate('/')
  }, [navigate])

  const navigateToReport = useCallback(
    (token: string): void => {
      if (navigatedRef.current) return
      navigatedRef.current = true
      if (timerRef.current != null) clearInterval(timerRef.current)
      if (token) {
        navigate(`/r/${token}`)
      } else {
        // Token save failed — fall through to demo report
        const route =
          mode === 'investor'
            ? '/investor-report'
            : mode === 'personal'
              ? '/personal-report'
              : mode === 'tenant'
                ? '/tenant-report'
                : '/landlord-report'
        navigate(route)
      }
    },
    [navigate, mode]
  )

  const runFullAnalysis = useCallback(
    async (scrapeResult: ScrapedListing | null, formOverride?: FormState): Promise<void> => {
      const f = formOverride ?? (scrapeResult != null ? fromScrape(scrapeResult) : blankForm())
      const property = buildPropertyInput(f, kind, scrapeResult, sourceUrl)
      const rental: RentalInput = {
        ...DEFAULT_RENTAL,
        postalCode: scrapeResult?.postalCode ?? '',
      }
      try {
        const analysis = await runAnalysis(property, DEFAULT_FINANCING, rental, mode, {
          accessToken: session?.access_token,
          listingDescription: scrapeResult?.description ?? undefined,
        })
        navigateToReport(analysis.token ?? '')
      } catch (err) {
        // Province gate — show waitlist screen without falling back to manual
        if (err instanceof ApiRequestError && err.code === 'PROVINCE_NOT_SUPPORTED') {
          setView('province_gate')
          return
        }
        // Free tier monthly limit — show upgrade overlay without falling back to manual
        if (err instanceof ApiRequestError && err.code === 'FREE_LIMIT_REACHED') {
          if (timerRef.current != null) clearInterval(timerRef.current)
          setView('limit_gate')
          return
        }
        const msg =
          err instanceof ApiRequestError ? err.message : 'Analysis failed — please try again.'
        if (view === 'manual') {
          setFormError(msg)
          setSubmitting(false)
        } else {
          setView('manual')
          setForm(scrapeResult != null ? fromScrape(scrapeResult) : blankForm())
          setFormError(msg)
        }
      }
    },
    [kind, sourceUrl, mode, navigateToReport, view, session]
  )

  // ── Start the progress animation + background API calls ──────────────────
  useEffect(() => {
    let p = 0
    timerRef.current = setInterval(() => {
      p = Math.min(p + 2, 96)
      setPct(p)
    }, 240)

    const runPipeline = async (): Promise<void> => {
      if (!sourceUrl) {
        setView('manual')
        if (timerRef.current != null) clearInterval(timerRef.current)
        return
      }

      const result = await scrapeUrl(sourceUrl)

      if (!result.success || result.listing == null) {
        apiDoneRef.current = true
        if (timerRef.current != null) clearInterval(timerRef.current)
        setView('manual')
        setForm(blankForm())
        return
      }

      setScrape(result.listing)

      // Province gate — block non-Ontario listings before hitting the API
      if (result.listing.province !== 'ON' || !isOntarioPostal(result.listing.postalCode)) {
        if (timerRef.current != null) clearInterval(timerRef.current)
        setView('province_gate')
        return
      }

      await runFullAnalysis(result.listing)
    }

    void runPipeline()

    return () => {
      if (timerRef.current != null) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFormChange = (key: keyof FormState, val: string): void => {
    setForm((prev) => ({ ...prev, [key]: val }))
    setFormError(null)
  }

  const handleFormSubmit = async (): Promise<void> => {
    setSubmitting(true)
    setFormError(null)
    await runFullAnalysis(scrape, form)
  }

  return (
    <>
      {/* Inline keyframe animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <MiniNav onCancel={handleCancel} />

        {view === 'progress' && <ProgressView pct={pct} url={sourceUrl} scrape={scrape} />}

        {view === 'manual' && (
          <ManualView
            form={form}
            filled={countFilled(form)}
            kind={kind}
            submitting={submitting}
            error={formError}
            onChange={handleFormChange}
            onSubmit={() => void handleFormSubmit()}
          />
        )}

        {view === 'province_gate' && (
          <ProvinceGate
            onSubmit={(email) => void postWaitlist(email, scrape?.province ?? 'other')}
          />
        )}

        {view === 'limit_gate' && (
          <HardLimitGate
            onClose={() => navigate('/')}
            monthlyLimit={FREE_TIER.MONTHLY_ANALYSIS_LIMIT}
            used={FREE_TIER.MONTHLY_ANALYSIS_LIMIT}
            resetsIn="end of month"
          />
        )}
      </div>
    </>
  )
}
