import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  snapHeight?: string
}

export function BottomSheet({
  open,
  onClose,
  children,
  snapHeight = 'auto',
}: BottomSheetProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const sheetStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'var(--bg)',
    borderRadius: '20px 20px 0 0',
    maxHeight: '90vh',
    overflowY: 'auto',
    zIndex: 201,
    animation: 'sheet-up 0.3s cubic-bezier(.2,.7,.2,1) forwards',
    ...(snapHeight !== 'auto' ? { height: snapHeight } : {}),
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 999,
            background: 'var(--line-strong)',
            margin: '10px auto 0',
          }}
          aria-hidden="true"
        />
        {children}
      </div>
    </div>
  )
}
