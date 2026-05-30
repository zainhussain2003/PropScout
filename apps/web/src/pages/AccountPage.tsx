/**
 * AccountPage — full account dashboard with four tab views.
 * Tab state is managed via the URL query param ?view=saved|profile|plan|notifications.
 * All view and layout sub-components are defined inline — tab state stays local to this file.
 * Route: /account
 *
 * Design source: account-app.jsx + account-views.jsx
 */

import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '../components/shared/Icon'
import type { IconName } from '../components/shared/Icon'
import { Wordmark } from '../components/shared/Wordmark'
import { Footer } from '../components/shared/Footer'
import { VerdictPill } from '../components/shared/VerdictPill'

// ── Domain types ──────────────────────────────────────────────────────

type TierKey = 'free' | 'pro' | 'professional'
type TabKey = 'saved' | 'profile' | 'plan' | 'notifications'
type AnalysisKind = 'investor' | 'personal' | 'tenant' | 'landlord'
type ToneName = 'pass' | 'caution' | 'fail'
type FilterKey = 'all' | AnalysisKind

interface TierDetail {
  label: string
  color: string
  priceLine: string
  cycleNote: string
}

interface SavedAnalysis {
  id: string
  kind: AnalysisKind
  address: string
  city: string
  score: number
  verdict: string
  tone: ToneName
  savedAgo: string
  opens: number
  ask: string
  metricLabel: string
  metricValue: string
}

interface UsageItem {
  k: string
  used: number
  cap: number | null
  sub: string | null
}

interface InvoiceRow {
  date: string
  desc: string
  amt: string
  status: string
}

// ── Mock data (ported from account-app.jsx + account-views.jsx) ───────

const USER = {
  name: 'Marcus Reilly',
  email: 'marcus.reilly@example.com',
  avatarInitials: 'MR',
  joined: 'March 2026',
}

const TIER_DETAILS: Record<TierKey, TierDetail> = {
  free: {
    label: 'Free',
    color: 'var(--muted)',
    priceLine: '$0/mo',
    cycleNote: 'Resets monthly · 3 reports/mo',
  },
  pro: {
    label: 'Investor Pro',
    color: 'var(--accent)',
    priceLine: '$10/mo',
    cycleNote: 'Renews May 24, 2026',
  },
  professional: {
    label: 'Professional',
    color: 'var(--accent)',
    priceLine: '$59/mo',
    cycleNote: 'Renews May 24, 2026',
  },
}

const SAVED_ANALYSES: SavedAnalysis[] = [
  {
    id: 'a1',
    kind: 'investor',
    address: 'Unit 5702 · 5 Buttermill Ave',
    city: 'Vaughan, ON',
    score: 9,
    verdict: 'Hard pass',
    tone: 'fail',
    savedAgo: '3 hours ago',
    opens: 4,
    ask: '$729,900',
    metricLabel: 'Cash flow',
    metricValue: '−$1,833/mo',
  },
  {
    id: 'a2',
    kind: 'investor',
    address: '146 East 19th Street',
    city: 'Hamilton, ON',
    score: 84,
    verdict: 'Strong deal',
    tone: 'pass',
    savedAgo: 'Yesterday',
    opens: 2,
    ask: '$449,000',
    metricLabel: 'Cash flow',
    metricValue: '+$539/mo',
  },
  {
    id: 'a3',
    kind: 'tenant',
    address: 'Unit 3705 · 28 Charles St E',
    city: 'Toronto, ON',
    score: 58,
    verdict: 'Negotiate',
    tone: 'caution',
    savedAgo: '2 days ago',
    opens: 6,
    ask: '$2,150/mo',
    metricLabel: 'Target',
    metricValue: '$1,950–2,000',
  },
  {
    id: 'a4',
    kind: 'personal',
    address: '248 Mountcrest Avenue',
    city: 'Burlington, ON',
    score: 76,
    verdict: 'Worth pursuing',
    tone: 'pass',
    savedAgo: '4 days ago',
    opens: 3,
    ask: '$875,000',
    metricLabel: 'Monthly cost',
    metricValue: '$5,180/mo',
  },
  {
    id: 'a5',
    kind: 'landlord',
    address: 'Unit 3208 · 88 Harbour Street',
    city: 'Toronto, ON',
    score: 42,
    verdict: 'Rent too high',
    tone: 'caution',
    savedAgo: 'Last week',
    opens: 1,
    ask: '$3,400/mo',
    metricLabel: 'Days listed',
    metricValue: '38 days',
  },
  {
    id: 'a6',
    kind: 'investor',
    address: '128 Spadina Road',
    city: 'Toronto, ON',
    score: 22,
    verdict: 'Do not buy',
    tone: 'fail',
    savedAgo: 'Last week',
    opens: 2,
    ask: '$1.49M',
    metricLabel: 'Cap rate',
    metricValue: '1.4%',
  },
  {
    id: 'a7',
    kind: 'personal',
    address: '17 Linden Avenue',
    city: 'Oakville, ON',
    score: 68,
    verdict: 'Worth pursuing',
    tone: 'pass',
    savedAgo: '2 weeks ago',
    opens: 5,
    ask: '$1.18M',
    metricLabel: 'Monthly cost',
    metricValue: '$6,420/mo',
  },
  {
    id: 'a8',
    kind: 'tenant',
    address: '42 Wellesley St E #1107',
    city: 'Toronto, ON',
    score: 72,
    verdict: 'Sign at asking',
    tone: 'pass',
    savedAgo: '3 weeks ago',
    opens: 1,
    ask: '$2,400/mo',
    metricLabel: 'Target',
    metricValue: '$2,300–2,400',
  },
]

const KIND_LABEL: Record<AnalysisKind, string> = {
  investor: 'Investment',
  personal: 'Personal buy',
  tenant: 'Tenant view',
  landlord: 'Landlord view',
}

const KIND_COLOR: Record<AnalysisKind, string> = {
  investor: 'var(--accent)',
  personal: 'var(--pass)',
  tenant: 'var(--caution)',
  landlord: 'var(--ink)',
}

const NAV_ITEMS: { k: TabKey; label: string; icon: IconName; count?: number }[] = [
  { k: 'saved', label: 'Saved analyses', icon: 'doc', count: SAVED_ANALYSES.length },
  { k: 'profile', label: 'Profile', icon: 'house' },
  { k: 'plan', label: 'Plan & billing', icon: 'chart' },
  { k: 'notifications', label: 'Notifications', icon: 'flag' },
]

const INVOICES: InvoiceRow[] = [
  { date: 'May 24, 2026', desc: 'Investor Pro · monthly', amt: '$10.00', status: 'Paid' },
  { date: 'Apr 24, 2026', desc: 'Investor Pro · monthly', amt: '$10.00', status: 'Paid' },
  { date: 'Mar 24, 2026', desc: 'Investor Pro · monthly', amt: '$10.00', status: 'Paid' },
]

// ── Helpers ───────────────────────────────────────────────────────────

function isValidTab(s: string | null): s is TabKey {
  return s === 'saved' || s === 'profile' || s === 'plan' || s === 'notifications'
}

function safeTierKey(tier: string): TierKey {
  return tier === 'pro' || tier === 'professional' ? tier : 'free'
}

// ── Settings primitives ───────────────────────────────────────────────

interface SettingsCardProps {
  title: string
  subtitle?: string
  children: ReactNode
}

function SettingsCard({ title, subtitle, children }: SettingsCardProps): JSX.Element {
  return (
    <div className="card col" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        className="col"
        style={{ padding: '22px 24px 14px', gap: 4, borderBottom: '1px solid var(--line)' }}
      >
        <h3 className="serif">{title}</h3>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{subtitle}</p>}
      </div>
      <div className="col">{children}</div>
    </div>
  )
}

interface SettingsRowProps {
  label: string
  hint?: string
  children: ReactNode
}

function SettingsRow({ label, hint, children }: SettingsRowProps): JSX.Element {
  return (
    <div
      className="row"
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--line)',
        gap: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div className="col" style={{ gap: 2, minWidth: 180 }}>
        <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{label}</span>
        {hint && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{hint}</span>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

interface SettingsInputProps {
  defaultValue: string
}

function SettingsInput({ defaultValue }: SettingsInputProps): JSX.Element {
  return (
    <input
      defaultValue={defaultValue}
      style={{
        padding: '8px 14px',
        border: '1px solid var(--line)',
        borderRadius: 10,
        background: 'var(--bg-elev)',
        fontFamily: 'inherit',
        fontSize: 13.5,
        color: 'var(--ink)',
        outline: 'none',
        minWidth: 240,
      }}
    />
  )
}

interface SelectOption {
  v: string
  label: string
}

interface SettingsSelectProps {
  options: SelectOption[]
  defaultValue: string
}

function SettingsSelect({ options, defaultValue }: SettingsSelectProps): JSX.Element {
  return (
    <select
      defaultValue={defaultValue}
      style={{
        padding: '8px 14px',
        border: '1px solid var(--line)',
        borderRadius: 10,
        background: 'var(--bg-elev)',
        fontFamily: 'inherit',
        fontSize: 13.5,
        color: 'var(--ink)',
        outline: 'none',
        minWidth: 240,
      }}
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

interface SettingsToggleProps {
  defaultValue: boolean
}

function SettingsToggle({ defaultValue }: SettingsToggleProps): JSX.Element {
  const [on, setOn] = useState(defaultValue)
  return (
    <button
      onClick={() => setOn(!on)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        background: on ? 'var(--accent)' : 'var(--line-strong)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background-color .15s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: 'var(--surface)',
          transition: 'left .18s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          display: 'block',
        }}
      />
    </button>
  )
}

// ── ReportCard ────────────────────────────────────────────────────────

interface ReportCardProps {
  item: SavedAnalysis
}

function ReportCard({ item }: ReportCardProps): JSX.Element {
  return (
    <a
      href={`#report/${item.id}`}
      className="card col"
      style={{
        padding: 0,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform .15s ease, box-shadow .15s ease, border-color .15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = 'var(--line-strong)'
        e.currentTarget.style.boxShadow = '0 12px 32px -16px rgba(14,19,32,.25)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.borderColor = 'var(--line)'
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
      }}
    >
      {/* Photo strip */}
      <div className="photo-ph" style={{ height: 130, position: 'relative' }}>
        <span>
          {item.kind} · {item.city.split(',')[0].toLowerCase()}
        </span>
        {/* Kind pill */}
        <span
          className="mono"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: 999,
            background: 'var(--surface)',
            color: KIND_COLOR[item.kind],
            border: '1px solid var(--line)',
          }}
        >
          {KIND_LABEL[item.kind]}
        </span>
        {/* Score badge */}
        <span
          className={`score-badge ${item.tone}`}
          style={{ position: 'absolute', top: 12, right: 12 }}
        >
          {item.score}
        </span>
      </div>

      {/* Card body */}
      <div className="col" style={{ padding: 20, gap: 14 }}>
        <div className="col" style={{ gap: 2 }}>
          <div className="serif" style={{ fontSize: 19, lineHeight: 1.2, color: 'var(--ink)' }}>
            {item.address}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {item.city} · {item.ask}
          </div>
        </div>

        <div
          className="row"
          style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
        >
          <div className="col" style={{ gap: 2 }}>
            <span
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              {item.metricLabel}
            </span>
            <span
              className="mono tabular"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}
            >
              {item.metricValue}
            </span>
          </div>
          <VerdictPill tone={item.tone} label={item.verdict} />
        </div>

        <div className="divider" />

        <div
          className="row"
          style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}
        >
          <span className="row" style={{ gap: 6 }}>
            <Icon name="dot" size={9} /> Saved {item.savedAgo}
          </span>
          <span className="row" style={{ gap: 6 }}>
            Opened {item.opens}× · open <Icon name="arrow" size={11} />
          </span>
        </div>
      </div>
    </a>
  )
}

// ── SavedAnalysesView ─────────────────────────────────────────────────

interface SavedAnalysesViewProps {
  tier: string
  onUpgrade: () => void
}

function SavedAnalysesView({ tier, onUpgrade }: SavedAnalysesViewProps): JSX.Element {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')

  const freeLimit = 10
  const remaining = freeLimit - SAVED_ANALYSES.length

  const filtered = SAVED_ANALYSES.filter((a) => {
    if (filter !== 'all' && a.kind !== filter) return false
    if (
      search &&
      !a.address.toLowerCase().includes(search.toLowerCase()) &&
      !a.city.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    return true
  })

  const FILTER_OPTIONS: { k: FilterKey; label: string }[] = [
    { k: 'all', label: `All · ${SAVED_ANALYSES.length}` },
    { k: 'investor', label: 'Investment' },
    { k: 'personal', label: 'Personal' },
    { k: 'tenant', label: 'Tenant' },
    { k: 'landlord', label: 'Landlord' },
  ]

  return (
    <div className="col" style={{ gap: 28 }}>
      {/* Header */}
      <div
        className="row"
        style={{
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div className="col" style={{ gap: 6 }}>
          <h1 className="serif">Saved analyses</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            {tier === 'free' ? (
              <>
                You've saved{' '}
                <span className="tabular" style={{ color: 'var(--ink)' }}>
                  {SAVED_ANALYSES.length} of {freeLimit}
                </span>{' '}
                on the free plan · {remaining} slot{remaining === 1 ? '' : 's'} left
              </>
            ) : (
              <>Unlimited saved analyses · sorted by most recent</>
            )}
          </p>
        </div>
        <button className="btn btn-primary">
          <Icon name="plus" size={13} /> Analyze new listing
        </button>
      </div>

      {/* Controls: filter chips + search */}
      <div className="row gap-12" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {/* Filter chips */}
        <div
          className="row"
          style={{
            gap: 4,
            padding: 4,
            borderRadius: 999,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
          }}
        >
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className="mono"
              style={{
                background: filter === f.k ? 'var(--ink)' : 'transparent',
                color: filter === f.k ? 'var(--bg)' : 'var(--ink-2)',
                fontSize: 11,
                letterSpacing: '0.06em',
                padding: '7px 12px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div
          className="row"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            padding: '8px 14px',
            borderRadius: 999,
            gap: 8,
            minWidth: 260,
          }}
        >
          <Icon name="search" size={13} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address or city"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--ink)',
            }}
          />
        </div>
      </div>

      {/* Card grid or empty state */}
      {filtered.length === 0 ? (
        <div
          className="card col"
          style={{ padding: 48, alignItems: 'center', textAlign: 'center', gap: 12 }}
        >
          <h3 className="serif">Nothing matches that filter.</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Try clearing the search or switching to "All".
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {filtered.map((a) => (
            <ReportCard key={a.id} item={a} />
          ))}
        </div>
      )}

      {/* Upgrade nudge — shown when free tier is near limit */}
      {tier === 'free' && SAVED_ANALYSES.length >= freeLimit - 2 && (
        <div
          className="card row"
          style={{
            padding: 22,
            background: 'color-mix(in oklab, var(--accent) 5%, var(--surface))',
            borderColor: 'color-mix(in oklab, var(--accent) 25%, var(--line))',
            gap: 18,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div className="col" style={{ gap: 6 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              {remaining} of {freeLimit} slots remaining
            </span>
            <h3 className="serif">Save unlimited analyses on Investor Pro.</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 540 }}>
              Plus full 3-paragraph AI verdicts, financing sliders, branded PDF export, and the
              portfolio tracker.
            </p>
          </div>
          <button onClick={onUpgrade} className="btn btn-accent">
            Upgrade to Pro <Icon name="arrow" size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── ProfileView ───────────────────────────────────────────────────────

function ProfileView(): JSX.Element {
  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="serif">Profile</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          How PropScout knows you and the defaults we use for your reports.
        </p>
      </div>

      {/* Identity */}
      <SettingsCard title="Identity">
        <SettingsRow label="Name" hint="Used on PDF exports + shareable reports">
          <SettingsInput defaultValue={USER.name} />
        </SettingsRow>
        <SettingsRow label="Email" hint="Login + verification + report-share notifications">
          <SettingsInput defaultValue={USER.email} />
        </SettingsRow>
        <SettingsRow label="Member since">
          <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>
            {USER.joined}
          </span>
        </SettingsRow>
      </SettingsCard>

      {/* Default investor assumptions */}
      <SettingsCard
        title="Default investor assumptions"
        subtitle="Used when you first open an Investor or Landlord report. You can override on any single report."
      >
        <SettingsRow label="Default down payment" hint="Pre-filled in financing sliders">
          <SettingsInput defaultValue="20%" />
        </SettingsRow>
        <SettingsRow label="Assumed household income" hint="Used in OSFI stress test calculations">
          <SettingsInput defaultValue="$125,000" />
        </SettingsRow>
        <SettingsRow label="Annual appreciation" hint="Used in equity-build projections">
          <SettingsSelect
            defaultValue="0.03"
            options={[
              { v: '0', label: '0% / yr (flat)' },
              { v: '0.02', label: '2% / yr (conservative)' },
              { v: '0.03', label: '3% / yr (default)' },
              { v: '0.05', label: '5% / yr (optimistic)' },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          label="Include property management fee"
          hint="Adds 8% of gross rent to expenses"
        >
          <SettingsToggle defaultValue={false} />
        </SettingsRow>
      </SettingsCard>

      {/* Danger zone */}
      <SettingsCard title="Account">
        <SettingsRow
          label="Export everything"
          hint="Download a ZIP of every saved analysis as PDFs"
        >
          <button className="btn btn-ghost">
            <Icon name="doc" size={13} /> Request export
          </button>
        </SettingsRow>
        <SettingsRow
          label="Delete account"
          hint="Permanently delete your data — this cannot be undone"
        >
          <button
            className="btn"
            style={{
              color: 'var(--fail)',
              border: '1px solid color-mix(in oklab, var(--fail) 30%, transparent)',
              background: 'transparent',
            }}
          >
            Delete account…
          </button>
        </SettingsRow>
      </SettingsCard>
    </div>
  )
}

// ── PlanView ──────────────────────────────────────────────────────────

interface PlanViewProps {
  tier: string
  onUpgrade: () => void
}

function PlanView({ tier, onUpgrade }: PlanViewProps): JSX.Element {
  const isFree = tier === 'free'
  const tierKey = safeTierKey(tier)
  const tierDetail = TIER_DETAILS[tierKey]

  const usageItems: UsageItem[] = [
    { k: 'Sale-listing analyses', used: 2, cap: isFree ? 3 : null, sub: null },
    { k: 'Tenant reports', used: 8, cap: null, sub: 'Always unlimited' },
    {
      k: 'PDF exports',
      used: isFree ? 0 : 5,
      cap: isFree ? 0 : null,
      sub: isFree ? 'Locked on free tier' : null,
    },
    { k: 'Saved analyses', used: 8, cap: isFree ? 10 : null, sub: null },
  ]

  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="serif">Plan &amp; billing</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Your subscription, invoices, and payment method.
        </p>
      </div>

      {/* Current plan banner */}
      <div
        className="card"
        style={{
          padding: 32,
          background: isFree
            ? 'var(--ink)'
            : 'color-mix(in oklab, var(--accent) 6%, var(--surface))',
          color: isFree ? 'var(--bg)' : 'var(--ink)',
          borderColor: isFree
            ? 'var(--ink)'
            : 'color-mix(in oklab, var(--accent) 25%, var(--line))',
        }}
      >
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div className="col" style={{ gap: 8 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: isFree ? 'rgba(255,255,255,0.55)' : 'var(--accent)',
              }}
            >
              You&rsquo;re on
            </span>
            <h2 className="serif" style={{ color: isFree ? 'var(--bg)' : 'var(--ink)' }}>
              {tierDetail.label}
            </h2>
            <span
              style={{ fontSize: 14, color: isFree ? 'rgba(255,255,255,0.7)' : 'var(--ink-2)' }}
            >
              {isFree
                ? 'Three sale-listing analyses per month + unlimited tenant reports. Headlines on AI verdicts; no PDF.'
                : 'Unlimited analyses · full 3-paragraph AI verdicts · financing sliders · PDF export · portfolio tracker.'}
            </span>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 10 }}>
            <span
              className="serif tabular"
              style={{ fontSize: 38, lineHeight: 1, color: isFree ? 'var(--bg)' : 'var(--ink)' }}
            >
              {tierDetail.priceLine}
            </span>
            <span
              className="mono"
              style={{ fontSize: 11, color: isFree ? 'rgba(255,255,255,0.5)' : 'var(--muted)' }}
            >
              {tierDetail.cycleNote}
            </span>
            {isFree ? (
              <button
                onClick={onUpgrade}
                className="btn btn-accent"
                style={{ padding: '12px 18px' }}
              >
                Upgrade <Icon name="arrow" size={13} />
              </button>
            ) : (
              <button
                className="btn"
                style={{
                  background: 'transparent',
                  color: 'var(--ink)',
                  border: '1px solid var(--line-strong)',
                  padding: '12px 18px',
                }}
              >
                Manage in Stripe portal <Icon name="arrow" size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Usage */}
      <SettingsCard title="This month's usage">
        <div className="col" style={{ gap: 14, padding: '8px 24px 16px' }}>
          {usageItems.map((u) => (
            <div key={u.k} className="col" style={{ gap: 4 }}>
              <div
                className="row"
                style={{ justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>{u.k}</span>
                <span className="mono tabular" style={{ fontSize: 13, color: 'var(--muted)' }}>
                  {u.used}
                  {u.cap !== null && u.cap > 0 ? ` / ${u.cap}` : u.cap === 0 ? ' · locked' : ''}
                </span>
              </div>
              {u.cap !== null && u.cap > 0 && (
                <div style={{ height: 4, borderRadius: 999, background: 'var(--line)' }}>
                  <div
                    style={{
                      width: `${Math.min(100, (u.used / u.cap) * 100)}%`,
                      height: '100%',
                      borderRadius: 999,
                      background:
                        u.used >= u.cap
                          ? 'var(--fail)'
                          : u.used >= u.cap * 0.7
                            ? 'var(--caution)'
                            : 'var(--pass)',
                    }}
                  />
                </div>
              )}
              {u.sub && (
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {u.sub}
                </span>
              )}
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Invoices — pro only */}
      {!isFree && (
        <SettingsCard
          title="Invoices"
          subtitle="Stripe sends a copy to your email after every charge."
        >
          <div className="col" style={{ padding: '8px 0 16px' }}>
            {INVOICES.map((inv, i) => (
              <div
                key={inv.date}
                className="row"
                style={{
                  justifyContent: 'space-between',
                  padding: '14px 24px',
                  borderBottom: i < INVOICES.length - 1 ? '1px solid var(--line)' : 'none',
                  fontSize: 13,
                  gap: 12,
                }}
              >
                <div className="col" style={{ gap: 2 }}>
                  <span style={{ color: 'var(--ink)' }}>{inv.desc}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {inv.date}
                  </span>
                </div>
                <div className="row gap-12" style={{ alignItems: 'center' }}>
                  <span className="mono tabular" style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    {inv.amt}
                  </span>
                  <span
                    className="chip"
                    style={{
                      background: 'color-mix(in oklab, var(--pass) 10%, transparent)',
                      color: 'var(--pass)',
                      borderColor: 'color-mix(in oklab, var(--pass) 30%, transparent)',
                    }}
                  >
                    {inv.status}
                  </span>
                  <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }}>
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>
      )}
    </div>
  )
}

// ── NotificationsView ─────────────────────────────────────────────────

interface NotificationRow {
  k: string
  sub: string
  enabled: boolean
}

function NotificationsView(): JSX.Element {
  const watchRows: NotificationRow[] = [
    {
      k: 'Rent-drop alerts',
      sub: 'Notify when a tracked rental drops price or is re-listed',
      enabled: true,
    },
    {
      k: 'Comparable sale closes',
      sub: 'New verified sales within 1km of a saved property',
      enabled: true,
    },
    {
      k: 'Rate change notifications',
      sub: 'When the Bank of Canada or our 5-yr fixed average moves',
      enabled: false,
    },
  ]

  const productRows: NotificationRow[] = [
    {
      k: 'Weekly market digest',
      sub: 'Tuesday morning · highlights from your tracked listings',
      enabled: false,
    },
    {
      k: 'Investor Pro feature drops',
      sub: 'When new features ship — AirDNA, BC support, etc.',
      enabled: true,
    },
  ]

  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="serif">Notifications</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Choose what PropScout emails you about. Transactional emails always come through.
        </p>
      </div>

      <SettingsCard title="Watch lists" subtitle="Listings you've asked us to monitor.">
        {watchRows.map((r) => (
          <SettingsRow key={r.k} label={r.k} hint={r.sub}>
            <SettingsToggle defaultValue={r.enabled} />
          </SettingsRow>
        ))}
      </SettingsCard>

      <SettingsCard title="Product">
        {productRows.map((r) => (
          <SettingsRow key={r.k} label={r.k} hint={r.sub}>
            <SettingsToggle defaultValue={r.enabled} />
          </SettingsRow>
        ))}
      </SettingsCard>
    </div>
  )
}

// ── AccountTopNav ─────────────────────────────────────────────────────

interface AccountTopNavProps {
  dark: boolean
  onToggleDark: () => void
  tier: string
}

function AccountTopNav({ dark, onToggleDark, tier }: AccountTopNavProps): JSX.Element {
  const tierKey = safeTierKey(tier)
  const t = TIER_DETAILS[tierKey]

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        background: 'color-mix(in oklab, var(--bg) 84%, transparent)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        {/* Left: wordmark + breadcrumb */}
        <div className="row gap-16">
          <Wordmark height={22} />
          <div className="row gap-8" style={{ color: 'var(--muted)', fontSize: 13 }}>
            <span style={{ opacity: 0.55 }}>/</span>
            <span style={{ color: 'var(--ink)' }}>Your account</span>
          </div>
        </div>

        {/* Right: theme toggle + help + user pill */}
        <div className="row gap-12">
          <button className="btn btn-ghost" onClick={onToggleDark} style={{ padding: '10px 12px' }}>
            <Icon name={dark ? 'sun' : 'moon'} size={15} />
          </button>
          <button className="btn btn-ghost" style={{ padding: '10px 14px' }}>
            <Icon name="link" size={13} /> Help
          </button>
          {/* User pill */}
          <div
            className="row gap-10"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 999,
              padding: '6px 14px 6px 6px',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: 'var(--ink)',
                color: 'var(--bg)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'Geist Mono', monospace",
                flexShrink: 0,
              }}
            >
              {USER.avatarInitials}
            </span>
            <span className="col" style={{ alignItems: 'flex-start', gap: 0, fontSize: 13 }}>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {USER.name.split(' ')[0]}
              </span>
              <span
                style={{
                  color: t.color,
                  fontSize: 10,
                  fontFamily: "'Geist Mono', monospace",
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {t.label}
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

// ── AccountSidebar ────────────────────────────────────────────────────

interface AccountSidebarProps {
  activeTab: TabKey
  onTab: (tab: TabKey) => void
  tier: string
}

function AccountSidebar({ activeTab, onTab, tier }: AccountSidebarProps): JSX.Element {
  const tierKey = safeTierKey(tier)
  const tierDetail = TIER_DETAILS[tierKey]

  return (
    <aside className="col" style={{ gap: 4, position: 'sticky', top: 84, alignSelf: 'flex-start' }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          padding: '0 14px 8px',
        }}
      >
        Manage
      </span>

      {NAV_ITEMS.map((item) => (
        <button
          key={item.k}
          onClick={() => onTab(item.k)}
          className={`acc-nav-item${activeTab === item.k ? ' active' : ''}`}
        >
          <Icon name={item.icon} size={15} />
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.count !== undefined && <span className="acc-nav-count">{item.count}</span>}
        </button>
      ))}

      <div className="divider" style={{ margin: '14px 14px' }} />

      {/* Tier pill */}
      <div className="col gap-8" style={{ padding: '0 14px' }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Your plan
        </span>
        <div
          className="card col"
          style={{
            padding: 16,
            gap: 10,
            background:
              tierKey === 'free'
                ? 'var(--surface)'
                : 'color-mix(in oklab, var(--accent) 5%, var(--surface))',
            borderColor:
              tierKey === 'free'
                ? 'var(--line)'
                : 'color-mix(in oklab, var(--accent) 25%, var(--line))',
          }}
        >
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span
              style={{
                fontWeight: 500,
                fontSize: 14,
                color: tierKey === 'free' ? 'var(--ink)' : 'var(--accent)',
              }}
            >
              {tierDetail.label}
            </span>
            <span className="mono tabular" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {tierDetail.priceLine}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{tierDetail.cycleNote}</span>
          {tierKey === 'free' ? (
            <button
              className="btn btn-accent"
              style={{ padding: '8px 12px', fontSize: 12, marginTop: 4 }}
            >
              Upgrade <Icon name="arrow" size={11} />
            </button>
          ) : (
            <button
              onClick={() => onTab('plan')}
              className="btn btn-ghost"
              style={{ padding: '8px 12px', fontSize: 12, marginTop: 4 }}
            >
              Manage plan
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

// ── AccountPage (exported) ────────────────────────────────────────────

export function AccountPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const [dark, setDark] = useState(false)

  // Sync dark state from any prior page that set data-theme
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    if (current === 'dark') setDark(true)
  }, [])

  function handleToggleDark(): void {
    const newDark = !dark
    setDark(newDark)
    document.documentElement.setAttribute('data-theme', newDark ? 'dark' : 'light')
  }

  const rawView = searchParams.get('view')
  const activeTab: TabKey = isValidTab(rawView) ? rawView : 'saved'

  function handleTabChange(tab: TabKey): void {
    setSearchParams({ view: tab })
  }

  // no-op for now — will be wired to global UpgradeModal in Step 5
  const handleUpgrade = (): void => {}

  let view: JSX.Element
  switch (activeTab) {
    case 'profile':
      view = <ProfileView />
      break
    case 'plan':
      view = <PlanView tier="free" onUpgrade={handleUpgrade} />
      break
    case 'notifications':
      view = <NotificationsView />
      break
    default:
      view = <SavedAnalysesView tier="free" onUpgrade={handleUpgrade} />
  }

  return (
    <div>
      <AccountTopNav dark={dark} onToggleDark={handleToggleDark} tier="free" />

      <div className="container" style={{ padding: '40px var(--gutter)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: 'clamp(28px, 4vw, 56px)',
            alignItems: 'flex-start',
          }}
        >
          <AccountSidebar activeTab={activeTab} onTab={handleTabChange} tier="free" />
          <main>{view}</main>
        </div>
      </div>

      <Footer />
    </div>
  )
}
