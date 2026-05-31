// LegalShell — shared layout for /privacy and /terms.
// TOC sidebar with scroll-spy, sticky nav, and legal body typography.
// Does NOT import any report or paywall components.

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '../../components/shared/Wordmark'
import { Icon } from '../../components/shared/Icon'
import { Footer } from '../../components/shared/Footer'
import type { LegalSection, LegalMeta } from './legalContent'

// ── Types ────────────────────────────────────────────────────────────────────

interface LegalShellProps {
  sections: LegalSection[]
  meta: LegalMeta
  activePage: 'privacy' | 'terms'
  onSwitch: (page: 'privacy' | 'terms') => void
}

// ── Nav ──────────────────────────────────────────────────────────────────────

function LegalNav(): JSX.Element {
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
            <span style={{ opacity: 0.55 }} aria-hidden="true">
              /
            </span>
            <span style={{ color: 'var(--ink)' }}>Legal</span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="row gap-12 legal-nav-actions">
          <button
            className="btn btn-ghost legal-nav-pdf"
            onClick={() => window.print()}
            style={{ padding: '10px 14px' }}
          >
            <Icon name="doc" size={13} /> Download as PDF
          </button>
          <Link to="/" className="btn btn-ghost legal-nav-back" style={{ textDecoration: 'none' }}>
            Back to PropScout <Icon name="arrow" size={13} />
          </Link>
        </div>
      </div>
    </header>
  )
}

// ── Shell ────────────────────────────────────────────────────────────────────

export function LegalShell({ sections, meta, activePage, onSwitch }: LegalShellProps): JSX.Element {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')
  const articleRef = useRef<HTMLElement>(null)

  // Scroll-spy — updates active TOC item while user scrolls
  useEffect(() => {
    setActiveId(sections[0]?.id ?? '')

    const handler = (): void => {
      const y = window.scrollY + 120
      let current = sections[0]?.id ?? ''
      for (const s of sections) {
        const el = document.getElementById(s.id)
        if (el && el.offsetTop <= y) current = s.id
      }
      setActiveId(current)
    }

    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [activePage, sections])

  const scrollTo = (id: string): void => {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.offsetTop - 84, behavior: 'smooth' })
  }

  const PAGE_OPTIONS: { k: 'privacy' | 'terms'; label: string }[] = [
    { k: 'privacy', label: 'Privacy Policy' },
    { k: 'terms', label: 'Terms of Service' },
  ]

  return (
    <div>
      <LegalNav />

      <main className="container" style={{ paddingTop: 56, paddingBottom: 120 }}>
        {/* Page header */}
        <div className="col" style={{ gap: 16, marginBottom: 56, maxWidth: 820 }}>
          {/* Eyebrow chip */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
              padding: '5px 10px',
              borderRadius: 999,
              border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)',
              background: 'color-mix(in oklab, var(--accent) 8%, transparent)',
              color: 'var(--ink)',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }} />
            {meta.eyebrow}
          </span>

          {/* Title */}
          <h1 className="serif" style={{ textWrap: 'balance' } as React.CSSProperties}>
            {meta.title}
          </h1>

          {/* Intro */}
          <p style={{ fontSize: 17, color: 'var(--ink-2)', maxWidth: 720, lineHeight: 1.6 }}>
            {meta.intro}
          </p>

          {/* Page switch pill */}
          <div
            className="row gap-6"
            style={{
              marginTop: 8,
              padding: 4,
              borderRadius: 999,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              alignSelf: 'flex-start',
            }}
          >
            {PAGE_OPTIONS.map((p) => (
              <button
                key={p.k}
                className="mono"
                onClick={() => {
                  onSwitch(p.k)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                style={{
                  background: activePage === p.k ? 'var(--ink)' : 'transparent',
                  color: activePage === p.k ? 'var(--bg)' : 'var(--ink-2)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '8px 16px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Two-column: TOC + content */}
        <div
          className="legal-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            gap: 'clamp(32px, 4vw, 64px)',
            alignItems: 'flex-start',
          }}
        >
          {/* TOC sidebar */}
          <aside className="legal-toc" style={{ position: 'sticky', top: 84 }}>
            <span
              className="mono"
              style={{
                display: 'block',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-2)',
                padding: '0 12px 10px',
              }}
            >
              On this page
            </span>

            <nav aria-label="Table of contents">
              {sections.map((s, i) => {
                const isActive = activeId === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease, color 0.12s ease',
                      color: isActive ? 'var(--bg)' : 'var(--ink-2)',
                      background: isActive ? 'var(--ink)' : 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      width: '100%',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      lineHeight: 1.4,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'var(--chip-bg)'
                        e.currentTarget.style.color = 'var(--ink)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--ink-2)'
                      }
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.05em',
                        color: isActive ? 'var(--accent)' : 'var(--ink)',
                        width: 18,
                        flexShrink: 0,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ flex: 1 }}>{s.title}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Article */}
          <article ref={articleRef} className="legal-body" style={{ maxWidth: 720 }}>
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                style={{
                  scrollMarginTop: 84,
                  paddingTop: i === 0 ? 0 : 48,
                  paddingBottom: 4,
                }}
              >
                <h2 className="serif">
                  <span
                    className="mono"
                    style={{
                      fontSize: 13,
                      letterSpacing: '0.1em',
                      color: 'var(--ink)',
                      marginRight: 14,
                    }}
                  >
                    § {String(i + 1).padStart(2, '0')}
                  </span>
                  {s.title}
                </h2>
                <div
                  className="legal-body-content"
                  style={{ marginTop: 18 }}
                  dangerouslySetInnerHTML={{ __html: s.body }}
                />
              </section>
            ))}

            {/* Footer card */}
            <div className="card col" style={{ marginTop: 64, padding: 28, gap: 12 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Questions?
              </span>
              <h3 className="serif" style={{ fontSize: 22 }}>
                {meta.contact}
              </h3>
              <div className="row gap-12" style={{ marginTop: 4 }}>
                <button className="btn btn-ghost" onClick={() => window.print()}>
                  <Icon name="doc" size={13} /> Download as PDF
                </button>
                <Link to="/" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      transform: 'rotate(180deg)',
                    }}
                  >
                    <Icon name="arrow" size={13} />
                  </span>
                  Back to PropScout
                </Link>
              </div>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  )
}
