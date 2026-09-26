import type { AppDesign } from '../types/design'

/** A build-time developer switch; never a URL or user-theme preference. */
export function resolveAppDesign(value: string | undefined): AppDesign {
  return value === 'legacy' ? 'legacy' : 'hybrid'
}
