// Icon — full line-icon library (1.6px stroke, currentColor).
// 17 icons covering every UI need in PropScout.
// No emoji anywhere — all icons come from here.

export type IconName =
  | 'arrow'
  | 'link'
  | 'check'
  | 'sun'
  | 'moon'
  | 'house'
  | 'chart'
  | 'shield'
  | 'doc'
  | 'map'
  | 'key'
  | 'flag'
  | 'sparkle'
  | 'paste'
  | 'plus'
  | 'minus'
  | 'dot'
  | 'search'

interface IconProps {
  name: IconName
  size?: number
  stroke?: number
}

export function Icon({ name, size = 16, stroke = 1.6 }: IconProps): JSX.Element {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'arrow':
      return (
        <svg {...props}>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      )

    case 'link':
      return (
        <svg {...props}>
          <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
          <path d="M14 10a4 4 0 0 0-5.66 0l-3 3A4 4 0 0 0 11 18.66l1-1" />
        </svg>
      )

    case 'check':
      return (
        <svg {...props}>
          <path d="M4 12l5 5L20 6" />
        </svg>
      )

    case 'sun':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
        </svg>
      )

    case 'moon':
      return (
        <svg {...props}>
          <path d="M21 13A9 9 0 0 1 11 3a8 8 0 1 0 10 10z" />
        </svg>
      )

    case 'house':
      return (
        <svg {...props}>
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      )

    case 'chart':
      return (
        <svg {...props}>
          <path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6" />
        </svg>
      )

    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z" />
        </svg>
      )

    case 'doc':
      return (
        <svg {...props}>
          <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
          <path d="M14 3v5h5M8 13h8M8 17h5" />
        </svg>
      )

    case 'map':
      return (
        <svg {...props}>
          <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />
        </svg>
      )

    case 'key':
      return (
        <svg {...props}>
          <circle cx="8" cy="15" r="4" />
          <path d="M11 13l9-9M16 8l3 3" />
        </svg>
      )

    case 'flag':
      return (
        <svg {...props}>
          <path d="M4 21V4M4 4h12l-2 4 2 4H4" />
        </svg>
      )

    case 'sparkle':
      return (
        <svg {...props}>
          <path d="M12 4v6m0 4v6M4 12h6m4 0h6M7 7l3 3M14 14l3 3M17 7l-3 3M10 14l-3 3" />
        </svg>
      )

    case 'paste':
      return (
        <svg {...props}>
          <rect x="8" y="3" width="8" height="4" rx="1" />
          <path d="M8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2" />
        </svg>
      )

    case 'plus':
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )

    case 'minus':
      return (
        <svg {...props}>
          <path d="M5 12h14" />
        </svg>
      )

    case 'dot':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      )

    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      )

    default:
      return <svg {...props} />
  }
}
