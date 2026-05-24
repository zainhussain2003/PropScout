// Button — three variants matching the design system.
// primary: dark background → terracotta on hover
// ghost:   transparent, border → terracotta on hover
// accent:  terracotta background (CTA, Pro badge)
//
// No emoji allowed in labels — use Icon component for any icons.

import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'accent'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  ...rest
}: ButtonProps): JSX.Element {
  const variantClass = `btn-${variant}`

  return (
    <button className={`btn ${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
