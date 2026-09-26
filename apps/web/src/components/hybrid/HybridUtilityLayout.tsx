import { Outlet, Link } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { Wordmark } from '../shared/Wordmark'
import { Icon } from '../shared/Icon'
import { Footer } from '../shared/Footer'

/** Shared recovery and account-confirmation frame; child routes own their state. */
export function HybridUtilityLayout(): JSX.Element {
  const { dark, toggle } = useTheme()
  return (
    <div className="hy-utility-shell">
      <header className="hy-nav">
        <div className="container hy-nav-row">
          <Wordmark height={24} />
          <div className="hy-nav-actions">
            <Link to="/" className="hy-text-link">
              Back to home
            </Link>
            <button
              className="btn btn-ghost"
              onClick={toggle}
              aria-label={dark ? 'Toggle light mode' : 'Toggle dark mode'}
            >
              <Icon name={dark ? 'sun' : 'moon'} size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="hy-utility-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
