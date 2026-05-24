// Card — surface container with border, shadow, and radius-lg.
// All report sections, metric tiles, and content blocks live inside a Card.
// Do not nest Cards — use padding and dividers instead.

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  style?: CSSProperties
  className?: string
}

export function Card({ children, className = '', style, ...rest }: CardProps): JSX.Element {
  return (
    <div className={`card ${className}`.trim()} style={style} {...rest}>
      {children}
    </div>
  )
}
