import { useState, useEffect } from 'react'
import { Icon } from './Icon'

interface StickyActionBarProps {
  onSave?: () => void
  onShare?: () => void
  onPDF?: () => void
}

export function StickyActionBar({
  onSave,
  onShare,
  onPDF,
}: StickyActionBarProps): JSX.Element | null {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480)

  useEffect(() => {
    const handler = (): void => setIsMobile(window.innerWidth <= 480)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (!isMobile) return null

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontFamily: "'Geist Mono', monospace",
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-2)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 16px',
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: 'var(--bg)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <button style={btnStyle} onClick={() => onSave?.()}>
        <Icon name="bookmark" size={16} />
        Save
      </button>
      <button style={btnStyle} onClick={() => onShare?.()}>
        <Icon name="share" size={16} />
        Share
      </button>
      <button style={btnStyle} onClick={() => onPDF?.()}>
        <Icon name="doc" size={16} />
        PDF
      </button>
    </div>
  )
}
