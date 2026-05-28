/**
 * EquityChart — 20-year equity build line chart with hover tooltip.
 *
 * X axis: Year 0–20 (one data point per year, 21 total)
 * Y axis: Dollar value (auto-scaled to max of equity + property value)
 *
 * Lines:
 *   Property value — solid ink line
 *   Your equity    — accent fill area + accent line
 *
 * Milestone markers at year 5, 10, 20 (circles on equity line).
 * Hover: crosshair + tooltip with year, property value, mortgage remaining,
 *        equity, vs-cash-in percentage.
 *
 * Handles all-zero data cleanly. Safe when totalCashInvested === 0.
 */

import { useState } from 'react'
import type { EquityDataPoint } from '../../types/analysis'
import { fmtMoney } from '../../lib/investorCalc'

interface EquityChartProps {
  equityCurve: EquityDataPoint[]
  totalCashInvested: number
}

const W = 720
const H = 280
const PAD = { l: 60, r: 24, t: 18, b: 40 }
const INNER_W = W - PAD.l - PAD.r
const INNER_H = H - PAD.t - PAD.b
const MAX_YEARS = 20

export function EquityChart({
  equityCurve,
  totalCashInvested: _totalCashInvested,
}: EquityChartProps): JSX.Element {
  const [hover, setHover] = useState<number | null>(null)

  // Guard: need at least 2 points
  if (equityCurve.length < 2) return <div style={{ height: H }} />

  // Y axis range
  const yMax = Math.max(
    ...equityCurve.map((p) => Math.max(p.propertyValue, p.equity)),
    1 // avoid yMax=0
  )
  const yMin = 0

  const toX = (year: number): number => PAD.l + (year / MAX_YEARS) * INNER_W

  const toY = (val: number): number => PAD.t + (1 - (val - yMin) / (yMax - yMin)) * INNER_H

  // Build SVG path strings
  const valuePath = equityCurve
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.year)} ${toY(p.propertyValue)}`)
    .join(' ')

  const equityPath = equityCurve
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.year)} ${toY(p.equity)}`)
    .join(' ')

  const lastPoint = equityCurve[equityCurve.length - 1]
  const equityArea = `${equityPath} L ${toX(lastPoint.year)} ${toY(0)} L ${toX(0)} ${toY(0)} Z`

  // Y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    v: yMin + (yMax - yMin) * t,
    y: toY(yMin + (yMax - yMin) * t),
  }))

  const milestoneYears = [5, 10, 20]
  const milestones = milestoneYears
    .map((yr) => equityCurve.find((p) => p.year === yr))
    .filter((p): p is EquityDataPoint => p !== undefined)

  const hoverPoint = hover !== null ? (equityCurve[hover] ?? null) : null

  return (
    <div className="card col" style={{ padding: 28, gap: 20 }}>
      {/* Legend header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div className="col" style={{ gap: 4 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Equity build · 20 yr horizon
          </span>
          <h4 className="serif" style={{ fontSize: 24 }}>
            Where your money sits over time.
          </h4>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: 12,
            color: 'var(--muted)',
            alignItems: 'center',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 14,
                height: 2,
                background: 'var(--ink)',
                display: 'inline-block',
              }}
            />
            Property value
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 14,
                height: 6,
                background: 'color-mix(in oklab, var(--accent) 50%, transparent)',
                borderRadius: 2,
                display: 'inline-block',
              }}
            />
            Your equity
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          aria-label="20-year equity build chart"
        >
          {/* Y axis grid + labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={tick.y}
                y2={tick.y}
                stroke="var(--line)"
                strokeWidth={1}
              />
              <text
                x={PAD.l - 10}
                y={tick.y + 4}
                textAnchor="end"
                fontSize={10}
                fontFamily="Geist Mono, monospace"
                fill="var(--muted)"
              >
                {tick.v >= 1e6
                  ? `$${(tick.v / 1e6).toFixed(1)}m`
                  : `$${Math.round(tick.v / 1000)}k`}
              </text>
            </g>
          ))}

          {/* X axis ticks */}
          {[0, 5, 10, 15, 20].map((yr) => (
            <g key={yr}>
              <line
                x1={toX(yr)}
                x2={toX(yr)}
                y1={H - PAD.b}
                y2={H - PAD.b + 5}
                stroke="var(--line-strong)"
                strokeWidth={1}
              />
              <text
                x={toX(yr)}
                y={H - PAD.b + 20}
                textAnchor="middle"
                fontSize={11}
                fontFamily="Geist Mono, monospace"
                fill="var(--muted)"
              >
                Yr {yr}
              </text>
            </g>
          ))}

          {/* Equity area fill */}
          <path d={equityArea} fill="color-mix(in oklab, var(--accent) 16%, transparent)" />

          {/* Equity line */}
          <path d={equityPath} fill="none" stroke="var(--accent)" strokeWidth={2} />

          {/* Property value line */}
          <path d={valuePath} fill="none" stroke="var(--ink)" strokeWidth={2} />

          {/* Milestone markers */}
          {milestones.map((m) => (
            <circle
              key={m.year}
              cx={toX(m.year)}
              cy={toY(m.equity)}
              r={4}
              fill="var(--accent)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          ))}

          {/* Invisible hover hit areas */}
          {equityCurve.map((p, i) => (
            <rect
              key={i}
              x={toX(p.year) - 16}
              y={PAD.t}
              width={32}
              height={INNER_H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'crosshair' }}
            />
          ))}

          {/* Hover crosshair */}
          {hoverPoint && (
            <g>
              <line
                x1={toX(hoverPoint.year)}
                x2={toX(hoverPoint.year)}
                y1={PAD.t}
                y2={H - PAD.b}
                stroke="var(--accent)"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <circle
                cx={toX(hoverPoint.year)}
                cy={toY(hoverPoint.propertyValue)}
                r={5}
                fill="var(--ink)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
              <circle
                cx={toX(hoverPoint.year)}
                cy={toY(hoverPoint.equity)}
                r={5}
                fill="var(--accent)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>

        {/* HTML tooltip */}
        {hoverPoint && (
          <div
            style={{
              position: 'absolute',
              left: `${(toX(hoverPoint.year) / W) * 100}%`,
              top: 0,
              transform: hoverPoint.year > 15 ? 'translateX(-110%)' : 'translateX(12px)',
              background: 'var(--ink)',
              color: 'var(--bg)',
              borderRadius: 10,
              padding: '12px 14px',
              minWidth: 200,
              fontSize: 12,
              boxShadow: '0 12px 32px rgba(0,0,0,.25)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,.55)',
                marginBottom: 8,
              }}
            >
              Year {hoverPoint.year}
            </div>
            {(
              [
                ['Property value', fmtMoney(hoverPoint.propertyValue), false],
                ['Mortgage left', fmtMoney(hoverPoint.remaining), false],
                ['Your equity', fmtMoney(hoverPoint.equity), true],
                [
                  'Vs. cash in',
                  `${hoverPoint.cashOnCash >= 0 ? '+' : '−'}${(Math.abs(hoverPoint.cashOnCash) * 100).toFixed(0)}%`,
                  false,
                ],
              ] as Array<[string, string, boolean]>
            ).map(([k, v, accent]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '3px 0',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,.7)' }}>{k}</span>
                <span
                  className="mono tabular"
                  style={{
                    color: accent ? 'var(--accent)' : 'var(--bg)',
                    fontWeight: accent ? 600 : 500,
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestone summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {milestones.map((m) => (
          <div
            key={m.year}
            className="col"
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              gap: 4,
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Year {m.year}
            </span>
            <span className="serif tabular" style={{ fontSize: 24, lineHeight: 1 }}>
              {fmtMoney(m.equity)}
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: m.cashOnCash >= 0 ? 'var(--pass)' : 'var(--fail)',
              }}
            >
              {m.cashOnCash >= 0 ? '+' : '−'}
              {(Math.abs(m.cashOnCash) * 100).toFixed(0)}% vs cash in
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
