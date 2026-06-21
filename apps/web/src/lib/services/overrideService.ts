/**
 * Override service — wraps the /analysis/:token/overrides API.
 *
 * A "flag override" means the user has dismissed a risk flag for an analysis
 * they've personally evaluated. Backend persistence is in `flag_overrides`.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

export class OverrideApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'OverrideApiError'
  }
}

/** Returns the list of dismissed flag IDs for this analysis. */
export async function listOverrides(token: string): Promise<string[]> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/analysis/${encodeURIComponent(token)}/overrides`)
  } catch {
    return []
  }
  if (!res.ok) return []
  const body = (await res.json()) as { overrides: string[] }
  return body.overrides ?? []
}

/** Dismiss a flag for this analysis. Idempotent. */
export async function addOverride(token: string, flagId: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/analysis/${encodeURIComponent(token)}/overrides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagId }),
    })
  } catch (err) {
    throw new OverrideApiError('NETWORK_ERROR', 'Could not save dismissal.', 0)
  }
  if (!res.ok) {
    let code = 'OVERRIDE_FAILED'
    try {
      const body = (await res.json()) as { code?: string }
      if (body.code) code = body.code
    } catch {
      // ignore
    }
    throw new OverrideApiError(code, 'Could not save dismissal.', res.status)
  }
}

/** Un-dismiss a previously-dismissed flag. */
export async function removeOverride(token: string, flagId: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(
      `${BASE_URL}/analysis/${encodeURIComponent(token)}/overrides/${encodeURIComponent(flagId)}`,
      { method: 'DELETE' }
    )
  } catch {
    throw new OverrideApiError('NETWORK_ERROR', 'Could not un-dismiss flag.', 0)
  }
  if (!res.ok) {
    throw new OverrideApiError('OVERRIDE_FAILED', 'Could not un-dismiss flag.', res.status)
  }
}
