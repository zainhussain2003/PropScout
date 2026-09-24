import { Link } from 'react-router-dom'
import { Icon } from '../shared/Icon'

const sections = [
  ['reports', 'Reports'],
  ['sunscout', 'SunScout'],
  ['how', 'How it works'],
  ['pricing', 'Pricing'],
  ['faq', 'FAQ'],
] as const

export function HybridNav({
  dark,
  onToggleDark,
  onSignIn,
}: {
  dark: boolean
  onToggleDark: () => void
  onSignIn: () => void
}): JSX.Element {
  return (
    <header className="hy-nav">
      <a className="hy-skip" href="#hero">
        Skip to property input
      </a>
      <div className="container hy-nav-row">
        <Link className="hy-wordmark" to="/" aria-label="PropScout home">
          <span className="hy-mark" aria-hidden="true">
            p
          </span>
          PropScout
        </Link>
        <nav className="hy-desktop-links" aria-label="Main navigation">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
          <Link to="/account">My reports</Link>
        </nav>
        <div className="hy-nav-actions">
          <button
            className="btn btn-ghost"
            onClick={onToggleDark}
            aria-label={dark ? 'Toggle light mode' : 'Toggle dark mode'}
            aria-pressed={dark}
          >
            <Icon name={dark ? 'sun' : 'moon'} size={16} />
          </button>
          <button className="btn btn-ghost hy-sign-in" onClick={onSignIn}>
            Sign in
          </button>
          <details
            className="hy-mobile-menu"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.currentTarget.open = false
                event.currentTarget.querySelector('summary')?.focus()
              }
            }}
          >
            <summary className="btn btn-ghost">Menu</summary>
            <nav
              aria-label="Mobile navigation"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a, button')) {
                  const details = event.currentTarget.closest('details')
                  if (details) details.open = false
                }
              }}
            >
              {sections.map(([id, label]) => (
                <a key={id} href={`#${id}`}>
                  {label}
                </a>
              ))}
              <Link to="/account">My reports</Link>
              <a href="#hero">Analyze a property</a>
              <button onClick={onSignIn}>Sign in</button>
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}
