/**
 * FinancingSliders — live financing assumption sliders for the Investor Report.
 *
 * Three sliders (exact specs — tests verify these values):
 *   Down payment:   min=20% max=50% step=5%   stored as decimal (0.20–0.50) — 20% is the
 *                   floor for a rental purchase (no insured mortgage), D-097
 *   Mortgage rate:  min=2%  max=10% step=0.25% stored as decimal (0.02–0.10)
 *   Amortization:   min=10  max=30  step=5     integer years
 *
 * Preset buttons: Base / OSFI / 35% down / Conservative
 * Toggles: management fee, Toronto LTT stacking
 * Select: appreciation rate (for equity projections)
 *
 * onChange fires with the complete FinancingInputs object on every interaction.
 * All sliders are keyboard-accessible (arrow keys, Home, End via native <input type=range>).
 */

import type { FinancingInputs } from '../../types/analysis'
import { DEFAULT_FINANCING_INPUTS } from '../../constants/demoData'
import { OSFI_STRESS } from '../../constants/osfi'
import { fmtMoney } from '../../lib/investorCalc'
import { FINANCING_SLIDER, EQUITY_SLIDER } from '../../constants/thresholds'
import { rateBaseNote } from '../../lib/rateProvenance'
import type { AssumptionEntry } from '../../types/analysis'

/** The three financing terms a preset is expressed relative to. */
export type FinancingBase = Pick<
  FinancingInputs,
  'downPaymentPct' | 'mortgageRate' | 'amortizationYears'
>

interface FinancingSlidersProps {
  financing: FinancingInputs
  /** Price of the property — used to show dollar value of down payment */
  price: number
  onChange: (financing: FinancingInputs) => void
  /**
   * The financing the analysis was actually computed with. Presets are
   * expressed against it and "vs Base" compares to it. Defaults to the demo
   * assumptions, which is right for the demo routes and wrong for a live
   * report: with a hardcoded 4.79% base, clicking "35% down" on a report the
   * engine ran at the live 4.45% Bank of Canada rate silently swapped the rate
   * too, and "vs Base +0.00%" then described a rate the analysis never used.
   */
  base?: FinancingBase
  /**
   * The ledger's mortgage-rate row (D-123): says under the slider what the
   * base rate is and when it was read. Absent on the demo routes.
   */
  rateRow?: AssumptionEntry | null
}

// ── Presets ────────────────────────────────────────────────────────────────────

const DEFAULT_BASE: FinancingBase = {
  downPaymentPct: DEFAULT_FINANCING_INPUTS.downPaymentPct,
  mortgageRate: DEFAULT_FINANCING_INPUTS.mortgageRate,
  amortizationYears: DEFAULT_FINANCING_INPUTS.amortizationYears,
}

/** OSFI B-20 qualifying rate: the greater of contract + 2% and the 5.25% floor. */
function osfiQualifyingRate(contractRate: number): number {
  return Math.max(contractRate + OSFI_STRESS.BUFFER, OSFI_STRESS.FLOOR)
}

function presetsFor(
  base: FinancingBase
): Array<{ label: string; patch: Partial<FinancingInputs> }> {
  return [
    { label: 'Base', patch: { ...base } },
    { label: 'OSFI', patch: { ...base, mortgageRate: osfiQualifyingRate(base.mortgageRate) } },
    { label: '35% down', patch: { ...base, downPaymentPct: 0.35 } },
    {
      label: 'Conservative',
      patch: {
        ...base,
        mortgageRate: osfiQualifyingRate(base.mortgageRate),
        amortizationYears: 30,
      },
    },
  ]
}

// ── Component ──────────────────────────────────────────────────────────────────

export function FinancingSliders({
  financing,
  price,
  onChange,
  base = DEFAULT_BASE,
  rateRow,
}: FinancingSlidersProps): JSX.Element {
  const set = (patch: Partial<FinancingInputs>): void => onChange({ ...financing, ...patch })
  const presets = presetsFor(base)
  const vsBase = (financing.mortgageRate - base.mortgageRate) * 100

  return (
    <div className="card" style={{ padding: 28 }}>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 22,
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <div className="col" style={{ gap: 6 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Financing assumptions
          </span>
          <h3 className="serif" style={{ fontSize: 24 }}>
            Adjust live — every metric updates.
          </h3>
        </div>

        {/* Preset buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => set(p.patch)}
              className="btn btn-ghost"
              style={{ padding: '7px 12px', fontSize: 11 }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Three sliders */}
      <div
        className="grid-1col-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
        }}
      >
        {/* Down payment — or, for a property already owned, the equity share (D-108) */}
        {financing.owned === true ? (
          <SliderRow
            id="slider-down-payment"
            label="Equity share"
            unit="of value"
            display={`${Math.round(financing.downPaymentPct * 100)}%`}
            secondary={fmtMoney(financing.downPaymentPct * price)}
            min={EQUITY_SLIDER.MIN * 100}
            max={EQUITY_SLIDER.MAX * 100}
            step={EQUITY_SLIDER.STEP * 100}
            value={Math.max(EQUITY_SLIDER.MIN, financing.downPaymentPct) * 100}
            onChange={(v) => set({ downPaymentPct: v / 100 })}
            ticks={['5%', '25%', '50%', '75%', '100%']}
            note="Value minus mortgage balance, from what you entered. 100% is owned outright — no mortgage payment, no DSCR."
          />
        ) : (
          <SliderRow
            id="slider-down-payment"
            label="Down payment"
            unit="of price"
            display={`${Math.round(financing.downPaymentPct * 100)}%`}
            secondary={fmtMoney(financing.downPaymentPct * price)}
            min={FINANCING_SLIDER.MIN_DOWN_PAYMENT * 100}
            max={FINANCING_SLIDER.MAX_DOWN_PAYMENT * 100}
            step={FINANCING_SLIDER.DOWN_PAYMENT_STEP * 100}
            value={Math.max(FINANCING_SLIDER.MIN_DOWN_PAYMENT, financing.downPaymentPct) * 100}
            onChange={(v) => set({ downPaymentPct: v / 100 })}
            ticks={['20%', '30%', '40%', '50%']}
            note="20% is the floor for a rental purchase — insured (high-ratio) mortgages are not available for non-owner-occupied properties."
          />
        )}

        {/* Mortgage rate */}
        <SliderRow
          id="slider-mortgage-rate"
          label="Mortgage rate"
          unit="annual"
          display={`${(financing.mortgageRate * 100).toFixed(2)}%`}
          secondary={`vs Base ${(vsBase >= 0 ? '+' : '') + vsBase.toFixed(2)}%`}
          min={2}
          max={10}
          step={0.25}
          value={financing.mortgageRate * 100}
          onChange={(v) => set({ mortgageRate: v / 100 })}
          ticks={['2%', '4.79%', '6.79%', '10%']}
          note={
            rateBaseNote(rateRow ?? null, `${(base.mortgageRate * 100).toFixed(2)}%`) ?? undefined
          }
        />

        {/* Amortization */}
        <SliderRow
          id="slider-amortization"
          label="Amortization"
          unit="years"
          display={`${financing.amortizationYears} yrs`}
          secondary={
            financing.amortizationYears >= 30
              ? 'Longest standard'
              : financing.amortizationYears === 25
                ? 'Default'
                : financing.amortizationYears <= 15
                  ? 'Aggressive'
                  : 'Shorter term'
          }
          min={10}
          max={30}
          step={5}
          value={financing.amortizationYears}
          onChange={(v) => set({ amortizationYears: v })}
          ticks={['10', '15', '20', '25', '30']}
        />
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'var(--line)',
          margin: '24px 0 18px',
        }}
      />

      {/* Toggles + appreciation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <ToggleRow
            label="Include 8% management fee"
            value={financing.includeManagementFee}
            onChange={(v) => set({ includeManagementFee: v })}
          />
          {/* No land-transfer tax is payable on a property already owned (D-108). */}
          {financing.owned !== true && (
            <ToggleRow
              label="Toronto LTT stacking"
              value={financing.isToronto}
              onChange={(v) => set({ isToronto: v })}
              hint="Adds Toronto municipal LTT using the city's bracket schedule"
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          <span>Appreciation:</span>
          <select
            value={financing.appreciationRate}
            onChange={(e) => set({ appreciationRate: parseFloat(e.target.value) })}
            aria-label="Annual appreciation rate"
            style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              fontFamily: 'inherit',
              color: 'var(--ink)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value={0.0}>0% / yr (flat)</option>
            <option value={0.02}>2% / yr (conservative)</option>
            <option value={0.03}>3% / yr (default)</option>
            <option value={0.05}>5% / yr (optimistic)</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface SliderRowProps {
  id: string
  label: string
  unit: string
  display: string
  secondary: string
  min: number
  max: number
  step: number
  value: number
  ticks: string[]
  onChange: (value: number) => void
  /** One line under the ticks explaining a bound the user may push against. */
  note?: string
}

function SliderRow({
  id,
  label,
  unit,
  display,
  secondary,
  min,
  max,
  step,
  value,
  ticks,
  onChange,
  note,
}: SliderRowProps): JSX.Element {
  return (
    <div className="col" style={{ gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label
          htmlFor={id}
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {label}
        </label>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {unit}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span
          className="serif tabular"
          style={{ fontSize: 28, lineHeight: 1, letterSpacing: '-0.02em' }}
        >
          {display}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
          {secondary}
        </span>
      </div>

      <input
        id={id}
        type="range"
        className="scout-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%' }}
        aria-label={label}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {ticks.map((t, i) => (
          <span key={i} className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>
            {t}
          </span>
        ))}
      </div>
      {note && (
        <p style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--muted)', margin: '4px 0 0' }}>
          {note}
        </p>
      )}
    </div>
  )
}

interface ToggleRowProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  hint?: string
}

function ToggleRow({ label, value, onChange, hint }: ToggleRowProps): JSX.Element {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        fontSize: 13,
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          background: value ? 'var(--accent)' : 'var(--line-strong)',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background-color .15s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: 'var(--surface)',
            transition: 'left .18s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          }}
        />
      </button>
      <span style={{ color: 'var(--ink)' }}>{label}</span>
      {hint && <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {hint}</span>}
    </label>
  )
}
