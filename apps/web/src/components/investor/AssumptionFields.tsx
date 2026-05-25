/**
 * AssumptionFields — editable assumption inputs for the Investor Report.
 *
 * Renders every assumption the calc engine uses as a labelled, editable field
 * with a tooltip explaining the default. All fields are pre-filled with sensible
 * defaults but the user can override any value before (or after) running analysis.
 *
 * Wired into the financing section of the Investor Report. On every change it
 * calls onAssumptionsChange so the parent can re-run calculations live.
 *
 * Design rules applied:
 *   - All colours from CSS tokens — no raw hex values
 *   - Hover: border + label colour → --accent at 0.15s ease
 *   - No emoji anywhere — use plain text labels only
 *   - Geist for labels; Geist Mono for numeric values
 */

import { useState, useCallback } from 'react'
import { Tooltip } from '../shared/Tooltip'
import { RateBanner } from '../shared/RateBanner'
import {
  ASSUMPTION_FIELDS,
  DEFAULT_ASSUMPTIONS,
  BOOLEAN_ASSUMPTION_FIELDS,
  DEFAULT_BOOLEAN_ASSUMPTIONS,
  type AssumptionField,
  type BooleanAssumptionField,
} from '../../constants/assumptions'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AnalysisAssumptions {
  vacancyAllowance: number // % (e.g. 5 = 5%)
  insuranceRate: number // % (e.g. 0.35 = 0.35%)
  managementFee: number // % (e.g. 8 = 8%)
  maintenanceRate: number // % (e.g. 0.5 = 0.5%)
  appreciationRate: number // % (e.g. 3 = 3%)
  legalFees: number // $ (e.g. 1500)
  mortgageRate: number // % (e.g. 4.79 = 4.79%) — 0 = use live rate
  nonResident: boolean // default false — Ontario NRST (25%) when true
}

/** Metadata returned alongside the live rate from GET /rates/mortgage. */
export interface RateMetadata {
  /** Decimal rate (e.g. 0.052 = 5.20%). Converted to % before pre-filling. */
  rate: number
  /** "live" = fresh fetch; "cached" = stale cache used; "fallback" = hardcoded default. */
  source: 'live' | 'cached' | 'fallback'
  /** User-facing warning string. Non-null when source is "cached" or "fallback". */
  warning: string | null
}

interface AssumptionFieldsProps {
  /** Called on every value change — parent should debounce if triggering API calls. */
  onAssumptionsChange: (assumptions: AnalysisAssumptions) => void
  /** Override any default values (e.g. if user has saved preferences). */
  initialValues?: Partial<AnalysisAssumptions>
  /**
   * Live rate metadata from GET /rates/mortgage.
   * When provided, pre-fills the mortgage rate field (rate × 100 → %).
   * Also controls whether the RateBanner is shown.
   */
  rateMetadata?: RateMetadata
  /** When true, renders fields in a compact single-column layout. */
  compact?: boolean
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AssumptionFields({
  onAssumptionsChange,
  initialValues = {},
  rateMetadata,
  compact = false,
}: AssumptionFieldsProps): JSX.Element {
  // When rateMetadata is provided, convert decimal → % and pre-fill mortgageRate.
  // initialValues takes precedence over rateMetadata (user may have a saved rate).
  const liveRatePct: Record<string, number> =
    rateMetadata && !('mortgageRate' in initialValues)
      ? { mortgageRate: parseFloat((rateMetadata.rate * 100).toFixed(4)) }
      : {}

  const [values, setValues] = useState<Record<string, number>>({
    ...DEFAULT_ASSUMPTIONS,
    ...liveRatePct,
    ...(Object.fromEntries(
      Object.entries(initialValues).filter(([, v]) => typeof v === 'number')
    ) as Record<string, number>),
  })

  const [boolValues, setBoolValues] = useState<Record<string, boolean>>({
    ...DEFAULT_BOOLEAN_ASSUMPTIONS,
    ...(initialValues.nonResident !== undefined ? { nonResident: initialValues.nonResident } : {}),
  })

  // Build the full assumptions object and fire the callback.
  const fireChange = useCallback(
    (numericState: Record<string, number>, boolState: Record<string, boolean>) => {
      onAssumptionsChange({
        ...(numericState as unknown as AnalysisAssumptions),
        ...boolState,
      } as AnalysisAssumptions)
    },
    [onAssumptionsChange]
  )

  const handleChange = useCallback(
    (key: string, raw: string) => {
      const parsed = parseFloat(raw)
      if (isNaN(parsed)) return // don't update on empty / mid-edit

      const field = ASSUMPTION_FIELDS.find((f) => f.key === key)
      if (!field) return

      const clamped = Math.min(field.max, Math.max(field.min, parsed))
      const next = { ...values, [key]: clamped }
      setValues(next)
      fireChange(next, boolValues)
    },
    [values, boolValues, fireChange]
  )

  const handleBoolChange = useCallback(
    (key: string, checked: boolean) => {
      const next = { ...boolValues, [key]: checked }
      setBoolValues(next)
      fireChange(values, next)
    },
    [boolValues, values, fireChange]
  )

  return (
    <div style={wrapperStyle}>
      {/* Rate banner spans the full width above the field grid */}
      <RateBanner warning={rateMetadata?.warning ?? null} />
      <div style={compact ? compactGridStyle : gridStyle}>
        {ASSUMPTION_FIELDS.map((field) => (
          <AssumptionRow
            key={field.key}
            field={field}
            value={values[field.key] ?? field.defaultValue}
            onChange={handleChange}
          />
        ))}
      </div>
      {/* Boolean fields render below the numeric grid — full width */}
      {BOOLEAN_ASSUMPTION_FIELDS.map((field) => (
        <BooleanAssumptionRow
          key={field.key}
          field={field}
          value={boolValues[field.key] ?? field.defaultValue}
          onChange={handleBoolChange}
        />
      ))}
    </div>
  )
}

// ── Single field row ───────────────────────────────────────────────────────────

interface AssumptionRowProps {
  field: AssumptionField
  value: number
  onChange: (key: string, raw: string) => void
}

function AssumptionRow({ field, value, onChange }: AssumptionRowProps): JSX.Element {
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const active = focused || hovered

  return (
    <label
      htmlFor={`assumption-${field.key}`}
      style={rowStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label + tooltip */}
      <span style={labelRowStyle}>
        <span style={{ ...labelStyle, color: active ? 'var(--accent)' : 'var(--ink-2)' }}>
          {field.label}
        </span>
        <Tooltip text={field.tooltip} />
      </span>

      {/* Input wrapper */}
      <span
        style={{
          ...inputWrapperStyle,
          borderColor: active ? 'var(--accent)' : 'var(--line)',
        }}
      >
        {field.unitPrefix && <span style={unitStyle}>{field.unit}</span>}
        <input
          id={`assumption-${field.key}`}
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
          aria-label={field.label}
        />
        {!field.unitPrefix && <span style={unitStyle}>{field.unit}</span>}
      </span>
    </label>
  )
}

// ── Boolean field row ──────────────────────────────────────────────────────────

interface BooleanAssumptionRowProps {
  field: BooleanAssumptionField
  value: boolean
  onChange: (key: string, checked: boolean) => void
}

function BooleanAssumptionRow({ field, value, onChange }: BooleanAssumptionRowProps): JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <label
      htmlFor={`assumption-bool-${field.key}`}
      style={{
        ...boolRowStyle,
        borderColor: hovered ? 'var(--accent)' : 'var(--line)',
        background: value ? 'color-mix(in srgb, var(--fail) 6%, transparent)' : 'var(--bg-elev)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <input
        id={`assumption-bool-${field.key}`}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(field.key, e.target.checked)}
        style={checkboxStyle}
        aria-label={field.label}
      />

      {/* Label + tooltip */}
      <span style={boolLabelRowStyle}>
        <span
          style={{
            ...labelStyle,
            color: hovered ? 'var(--accent)' : value ? 'var(--fail)' : 'var(--ink-2)',
            fontWeight: value ? 600 : 500,
          }}
        >
          {field.label}
        </span>
        <Tooltip text={field.tooltip} />
      </span>
    </label>
  )
}

// ── Styles — all values from CSS tokens ───────────────────────────────────────

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '12px 20px',
}

const compactGridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  cursor: 'default',
}

const labelRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans, "Geist", sans-serif)',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.01em',
  transition: 'color 0.15s ease',
  userSelect: 'none',
}

const inputWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'var(--bg-elev)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-sm)',
  paddingInline: 10,
  paddingBlock: 6,
  transition: 'border-color 0.15s ease',
}

const inputStyle: React.CSSProperties = {
  // Reset
  border: 'none',
  outline: 'none',
  background: 'transparent',
  padding: 0,
  width: '100%',
  minWidth: 0,

  // Typography — Geist Mono for numeric values per design system
  fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ink)',
  textAlign: 'right',

  // Hide browser spin buttons — design uses step controls only
  MozAppearance: 'textfield',
}

const unitStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
  fontSize: 12,
  fontWeight: 400,
  color: 'var(--ink-2)',
  flexShrink: 0,
}

const boolRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, background 0.15s ease',
  userSelect: 'none',
}

const boolLabelRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flex: 1,
}

const checkboxStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  flexShrink: 0,
  cursor: 'pointer',
  accentColor: 'var(--fail)',
}
