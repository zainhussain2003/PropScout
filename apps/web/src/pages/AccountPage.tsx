/**
 * AccountPage — full account dashboard with four tab views.
 * Tab state is managed via the URL query param ?view=saved|profile|plan|notifications.
 * All view and layout sub-components are defined inline — tab state stays local to this file.
 * Route: /account
 *
 * Design source: account-app.jsx + account-views.jsx
 */

import type { ReactNode } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Icon } from '../components/shared/Icon'
import type { IconName } from '../components/shared/Icon'
import { Wordmark } from '../components/shared/Wordmark'
import { Footer } from '../components/shared/Footer'
import { useAuth } from '../hooks/useAuth'
import { useAccount } from '../hooks/useAccount'
import { usePaywall } from '../components/paywall/PaywallContext'
import { startCheckout, openBillingPortal } from '../lib/services/billingService'
import { FREE_TIER } from '../constants/tiers'

// ── Domain types ──────────────────────────────────────────────────────

type TierKey = 'free' | 'pro' | 'professional'
type TabKey = 'saved' | 'profile' | 'plan' | 'notifications'

interface TierDetail {
  label: string
  color: string
  priceLine: string
  cycleNote: string
}

interface UsageItem {
  k: string
  used: number
  cap: number | null
  sub: string | null
}

// `cycleNote` carried "Renews May 24, 2026" for both paid tiers — a date
// belonging to nobody, shown as though it were the user's own renewal. Stripe
// holds the real one, and the billing portal is one click away, so the note
// points there instead of naming a day.
//
// The free note said "3 reports/mo" while FREE_TIER.MONTHLY_ANALYSIS_LIMIT is
// 10 and CLAUDE.md says 10. It now reads from the constant so the page cannot
// contradict it. Which number is CORRECT, and enforcing it server-side, is a
// separate open decision (R-02 in the audit counter-review) — this only stops
// the product stating two different allowances.
const TIER_DETAILS: Record<TierKey, TierDetail> = {
  free: {
    label: 'Free',
    color: 'var(--muted)',
    priceLine: '$0/mo',
    cycleNote: `Resets monthly · ${FREE_TIER.MONTHLY_ANALYSIS_LIMIT} analyses/mo`,
  },
  pro: {
    label: 'Investor Pro',
    color: 'var(--accent)',
    priceLine: '$10/mo',
    cycleNote: 'Renewal date in your billing portal',
  },
  professional: {
    label: 'Professional',
    color: 'var(--accent)',
    priceLine: '$59/mo',
    cycleNote: 'Renewal date in your billing portal',
  },
}

const NAV_ITEMS: { k: TabKey; label: string; icon: IconName; count?: number }[] = [
  { k: 'saved', label: 'Saved analyses', icon: 'doc' },
  { k: 'profile', label: 'Profile', icon: 'house' },
  { k: 'plan', label: 'Plan & billing', icon: 'chart' },
  { k: 'notifications', label: 'Notifications', icon: 'flag' },
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

// ── SavedAnalysesView ─────────────────────────────────────────────────

interface SavedAnalysesViewProps {
  tier: TierKey
  onUpgrade: () => void
}

function SavedAnalysesView({ tier, onUpgrade }: SavedAnalysesViewProps): JSX.Element {
  const { analysesThisMonth, loading } = useAccount()
  const navigate = useNavigate()

  // There is no save-to-account feature yet: the "Save" control on a report
  // opens sign-in or the upgrade modal, and no endpoint lists a user's
  // analyses. So this is "not available", NOT "you haven't saved any" — the
  // second implies the user could have and didn't (the distinction D-052 draws
  // between an empty result and an absent source).
  return (
    <div className="col" style={{ gap: 28 }}>
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
            {loading ? (
              <>Loading your usage…</>
            ) : analysesThisMonth == null ? (
              <>We couldn&rsquo;t load your usage just now.</>
            ) : (
              <>
                You&rsquo;ve run{' '}
                <span className="tabular" style={{ color: 'var(--ink)' }}>
                  {analysesThisMonth}
                </span>{' '}
                {analysesThisMonth === 1 ? 'analysis' : 'analyses'} this month
                {tier === 'free' && <> · the free plan allows {FREE_TIER.MONTHLY_ANALYSIS_LIMIT}</>}
              </>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <Icon name="plus" size={13} /> Analyze new listing
        </button>
      </div>

      <div
        className="card col"
        style={{ padding: 48, alignItems: 'center', textAlign: 'center', gap: 12 }}
      >
        <h3 className="serif">Saving reports to your account isn&rsquo;t available yet.</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 460 }}>
          Every report you run gets a share link that stays live for 30 days — keep that link and
          you can reopen the report from anywhere. A permanent library here is still being built.
        </p>
      </div>

      {tier === 'free' && (
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
            <h3 className="serif">Investor Pro unlocks the full report.</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 540 }}>
              Full evidence-based verdicts, financing sliders and branded PDF export. The portfolio
              tracker ships with the saved library.
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
  const { identity, loading } = useAccount()

  return (
    <div className="col" style={{ gap: 28 }}>
      <div className="col" style={{ gap: 6 }}>
        <h1 className="serif">Profile</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          How PropScout knows you and the defaults we use for your reports.
        </p>
      </div>

      {/* Identity — the signed-in user's own, or an honest blank. Never a
          placeholder that reads as a real name. */}
      <SettingsCard title="Identity">
        <SettingsRow label="Name" hint="Used on PDF exports + shareable reports">
          {identity?.name != null ? (
            <SettingsInput defaultValue={identity.name} />
          ) : (
            <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>
              {loading ? 'Loading…' : 'Not set'}
            </span>
          )}
        </SettingsRow>
        <SettingsRow label="Email" hint="Login + verification + report-share notifications">
          <span className="mono" style={{ fontSize: 13, color: 'var(--ink)' }}>
            {identity?.email ?? (loading ? 'Loading…' : 'Not signed in')}
          </span>
        </SettingsRow>
        <SettingsRow label="Member since">
          <span className="mono" style={{ fontSize: 13, color: 'var(--muted)' }}>
            {identity?.createdAt != null
              ? new Date(identity.createdAt).toLocaleDateString('en-CA', {
                  month: 'long',
                  year: 'numeric',
                })
              : loading
                ? 'Loading…'
                : '—'}
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
  onManagePlan?: () => void
  billingError?: string | null
}

function PlanView({ tier, onUpgrade, onManagePlan, billingError }: PlanViewProps): JSX.Element {
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
                color: isFree ? 'color-mix(in oklab, var(--bg) 55%, transparent)' : 'var(--accent)',
              }}
            >
              You&rsquo;re on
            </span>
            <h2 className="serif" style={{ color: isFree ? 'var(--bg)' : 'var(--ink)' }}>
              {tierDetail.label}
            </h2>
            <span
              style={{
                fontSize: 14,
                color: isFree ? 'color-mix(in oklab, var(--bg) 70%, transparent)' : 'var(--ink-2)',
              }}
            >
              {isFree
                ? 'Three sale-listing analyses per month + unlimited tenant reports. Verdict summaries; no PDF.'
                : 'Unlimited analyses · full evidence-based verdicts · financing sliders · PDF export · portfolio tracker.'}
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
              style={{
                fontSize: 11,
                color: isFree ? 'color-mix(in oklab, var(--bg) 50%, transparent)' : 'var(--muted)',
              }}
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
                onClick={onManagePlan}
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
      {billingError != null && (
        <p style={{ fontSize: 13, color: 'var(--fail)', margin: 0 }}>{billingError}</p>
      )}

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

      {/* Invoices — Stripe is the record of what was charged.
          This card used to render three hardcoded "Paid · $10.00" rows, which
          showed a payment history to users who had never paid. Stripe's portal
          is the only honest source, and "Manage plan" above already opens it. */}
      {!isFree && (
        <SettingsCard
          title="Invoices"
          subtitle="Stripe sends a copy to your email after every charge."
        >
          <div className="col" style={{ padding: '8px 24px 24px', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 520 }}>
              Your full billing history, receipts and payment method live in the Stripe billing
              portal. Open it with <span style={{ color: 'var(--ink)' }}>Manage plan</span> above.
            </p>
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
  const { identity } = useAccount()
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
              {identity?.initials ?? '—'}
            </span>
            <span className="col" style={{ alignItems: 'flex-start', gap: 0, fontSize: 13 }}>
              <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                {/* First name when the user set one, else the email local part.
                    Never a stand-in name. */}
                {identity?.name?.split(' ')[0] ?? identity?.email?.split('@')[0] ?? 'Account'}
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

  const { session } = useAuth()
  const { tier, openUpgradeModal } = usePaywall()
  const [billingError, setBillingError] = useState<string | null>(null)

  const rawView = searchParams.get('view')
  const activeTab: TabKey = isValidTab(rawView) ? rawView : 'saved'

  function handleTabChange(tab: TabKey): void {
    setSearchParams({ view: tab })
  }

  const handleUpgrade = useCallback((): void => {
    if (!session) {
      openUpgradeModal('generic')
      return
    }
    setBillingError(null)
    void startCheckout('pro', session.access_token).catch((err: Error) => {
      setBillingError(err.message)
    })
  }, [session, openUpgradeModal])

  const handleManagePlan = useCallback((): void => {
    if (!session) return
    setBillingError(null)
    void openBillingPortal(session.access_token).catch((err: Error) => {
      setBillingError(err.message)
    })
  }, [session])

  let view: JSX.Element
  switch (activeTab) {
    case 'profile':
      view = <ProfileView />
      break
    case 'plan':
      view = (
        <PlanView
          tier={tier as 'free' | 'pro' | 'professional' | 'team'}
          onUpgrade={handleUpgrade}
          onManagePlan={handleManagePlan}
          billingError={billingError}
        />
      )
      break
    case 'notifications':
      view = <NotificationsView />
      break
    default:
      view = <SavedAnalysesView tier={safeTierKey(tier)} onUpgrade={handleUpgrade} />
  }

  return (
    <div>
      <AccountTopNav
        dark={dark}
        onToggleDark={handleToggleDark}
        tier={tier as 'free' | 'pro' | 'professional' | 'team'}
      />

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
