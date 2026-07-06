/**
 * ErrorBoundary — root-level React error boundary.
 *
 * Catches render-phase errors anywhere in the tree so a failure in one
 * provider or section never blanks the whole app (CLAUDE.md: "the app never
 * crashes because one section failed"). Shows a friendly full-page message
 * with a reload action; logs the original error to the console for debugging.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          padding: 24,
        }}
      >
        <div
          className="col"
          style={{ gap: 16, maxWidth: 420, textAlign: 'center', alignItems: 'center' }}
        >
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--ink)' }}>
            Something went <em>wrong</em>.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            An unexpected error stopped this page from loading. Reloading usually fixes it — if not,
            please try again in a few minutes.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ marginTop: 8 }}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
