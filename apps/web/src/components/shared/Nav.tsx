// Nav — top navigation bar.
// Three variants driven by the `variant` prop:
//   'landing' — full marketing nav with links + Sign in + Start free
//   'report'  — breadcrumb (report type + address slug) + Share + Save + Sign in
//   'account' — breadcrumb (Your account) + Help + user avatar pill
//
// Dark mode is controlled by data-theme on <html> — toggle by calling onToggleDark.

import { useState } from 'react'
import { Icon } from './Icon'
import { Wordmark } from './Wordmark'
import { LockedButton } from '../paywall/LockedButton'
import { usePaywall } from '../paywall/PaywallContext'

// ── Shared header shell ──────────────────────────────────────────

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  backdropFilter: 'saturate(180%) blur(14px)',
  WebkitBackdropFilter: 'saturate(180%) blur(14px)',
  // 94%, not 78%. At 78% the hero's 64px Instrument Serif headline stayed plainly
  // legible through the bar while scrolling — it read as a rendering glitch rather
  // than intentional frosting. The blur is still active, so the bar keeps its
  // frosted depth over photos and maps; it just now reads as a surface.
  background: 'color-mix(in oklab, var(--bg) 94%, transparent)',
  borderBottom: '1px solid var(--line)',
}

const headerStyleReport: React.CSSProperties = {
  ...headerStyle,
  background: 'color-mix(in oklab, var(--bg) 96%, transparent)',
}

// ── Landing nav ──────────────────────────────────────────────────

interface LandingNavProps {
  dark: boolean
  onToggleDark: () => void
  onSignIn: () => void
}

function LandingNav({ dark, onToggleDark, onSignIn }: LandingNavProps): JSX.Element {
  return (
    <header style={headerStyle}>
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        <Wordmark height={24} />

        <nav
          className="row gap-32 nav-links"
          style={{ fontSize: 14, color: 'var(--ink-2)' }}
          aria-label="Main navigation"
        >
          <a href="#how">How it works</a>
          <a href="#reports">Reports</a>
          <a href="#sunscout">SunScout</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="row gap-12">
          <button
            className="btn btn-ghost"
            onClick={onToggleDark}
            aria-label={dark ? 'Toggle light mode' : 'Toggle dark mode'}
            style={{ padding: '10px 12px' }}
          >
            <Icon name={dark ? 'sun' : 'moon'} size={15} />
          </button>
          {/* Sign-in + Start-free collapse on mobile (lp-nav-cta) — the hero
             input sits just below, so a duplicate nav CTA earns nothing and
             would overflow the 380px viewport. Matches Landing v2. */}
          <button
            className="btn btn-ghost lp-nav-cta"
            onClick={onSignIn}
            style={{ padding: '10px 14px' }}
          >
            Sign in
          </button>
          <button className="btn btn-primary lp-nav-cta" onClick={onSignIn}>
            Start free <Icon name="arrow" size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}

// ── Report nav ───────────────────────────────────────────────────

interface ReportNavProps {
  dark: boolean
  onToggleDark: () => void
  onSignIn: () => void
  /** Display label e.g. "Tenant report", "Investor report" */
  reportLabel: string
  /** URL slug e.g. "3705-charles-st-e" */
  addressSlug: string
}

function ReportNav({
  dark,
  onToggleDark,
  onSignIn,
  reportLabel,
  addressSlug,
}: ReportNavProps): JSX.Element {
  const { tier, openUpgradeModal } = usePaywall()
  // Slug copy feedback — same 2-second revert pattern as NegotiationSection copy button.
  const [slugCopied, setSlugCopied] = useState(false)

  function handleSlugClick(): void {
    void navigator.clipboard.writeText(window.location.href).catch(() => {
      // Clipboard API unavailable (non-HTTPS, iframe) — silently ignore
    })
    setSlugCopied(true)
    setTimeout(() => setSlugCopied(false), 2000)
  }

  return (
    <header style={headerStyleReport}>
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        {/* min-width: 0 lets this shrink. Without it the breadcrumb keeps its
            full intrinsic width and shoves the action group off a 375px
            screen, which is what pushed the whole page sideways. */}
        <div className="row gap-16 nav-crumbs" style={{ minWidth: 0 }}>
          <Wordmark height={22} />
          <div className="row gap-8" style={{ color: 'var(--muted)', fontSize: 13, minWidth: 0 }}>
            <span style={{ opacity: 0.55 }}>/</span>
            <span className="nav-hide-sm">{reportLabel}</span>
            <span className="nav-hide-sm" style={{ opacity: 0.55 }}>
              /
            </span>
            <span
              className="nav-slug"
              onClick={handleSlugClick}
              aria-label="Copy share link"
              style={{
                color: slugCopied ? 'var(--accent)' : 'var(--ink)',
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                cursor: 'pointer',
                transition: 'color 0.15s ease',
                userSelect: 'none',
              }}
            >
              {slugCopied ? 'Link copied!' : addressSlug}
            </span>
          </div>
        </div>

        <div className="row gap-12">
          <button
            className="btn btn-ghost"
            onClick={onToggleDark}
            aria-label={dark ? 'Toggle light mode' : 'Toggle dark mode'}
            style={{ padding: '10px 12px' }}
          >
            <Icon name={dark ? 'sun' : 'moon'} size={15} />
          </button>
          {/* Share and Save are duplicated by StickyActionBar on mobile, and
              this row overflowed a 375px viewport. Hidden there, not removed. */}
          <button className="btn btn-ghost nav-hide-sm" style={{ padding: '10px 14px' }}>
            <Icon name="link" size={13} /> Share link
          </button>
          <button className="btn btn-ghost" onClick={onSignIn} style={{ padding: '10px 14px' }}>
            Sign in
          </button>
          <span className="nav-hide-sm">
            {tier === 'free' ? (
              <LockedButton
                label="Save"
                icon="plus"
                onClick={() => openUpgradeModal('portfolio')}
              />
            ) : (
              <button className="btn btn-primary" onClick={onSignIn}>
                Save to account <Icon name="arrow" size={13} />
              </button>
            )}
          </span>
        </div>
      </div>
    </header>
  )
}

// ── Account nav ──────────────────────────────────────────────────

interface AccountNavProps {
  dark: boolean
  onToggleDark: () => void
  /** User's display name */
  userName: string
  /** Two-letter initials for the avatar, e.g. "ZH" */
  avatarInitials: string
}

function AccountNav({
  dark,
  onToggleDark,
  userName,
  avatarInitials,
}: AccountNavProps): JSX.Element {
  return (
    <header style={headerStyleReport}>
      <div className="container row" style={{ padding: '14px 0', justifyContent: 'space-between' }}>
        <div className="row gap-16">
          <Wordmark height={22} />
          <div className="row gap-8" style={{ color: 'var(--muted)', fontSize: 13 }}>
            <span style={{ opacity: 0.55 }}>/</span>
            <span style={{ color: 'var(--ink)' }}>Your account</span>
          </div>
        </div>

        <div className="row gap-12">
          <button
            className="btn btn-ghost"
            onClick={onToggleDark}
            aria-label={dark ? 'Toggle light mode' : 'Toggle dark mode'}
            style={{ padding: '10px 12px' }}
          >
            <Icon name={dark ? 'sun' : 'moon'} size={15} />
          </button>
          <button className="btn btn-ghost" style={{ padding: '10px 14px' }}>
            <Icon name="link" size={13} /> Help
          </button>
          {/* User avatar pill */}
          <button
            className="row gap-10"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 999,
              padding: '6px 14px 6px 6px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            aria-label="Account menu"
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
              }}
            >
              {avatarInitials}
            </span>
            <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
              {userName.split(' ')[0]}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

// ── Public Nav component (variant switcher) ──────────────────────

type NavProps =
  | ({ variant: 'landing' } & LandingNavProps)
  | ({ variant: 'report' } & ReportNavProps)
  | ({ variant: 'account' } & AccountNavProps)

export function Nav(props: NavProps): JSX.Element {
  if (props.variant === 'report') {
    return (
      <ReportNav
        dark={props.dark}
        onToggleDark={props.onToggleDark}
        onSignIn={props.onSignIn}
        reportLabel={props.reportLabel}
        addressSlug={props.addressSlug}
      />
    )
  }
  if (props.variant === 'account') {
    return (
      <AccountNav
        dark={props.dark}
        onToggleDark={props.onToggleDark}
        userName={props.userName}
        avatarInitials={props.avatarInitials}
      />
    )
  }
  // default: landing
  return (
    <LandingNav dark={props.dark} onToggleDark={props.onToggleDark} onSignIn={props.onSignIn} />
  )
}
