const RETURN_PATH_KEY = 'propscout.auth.returnPath'
const REPORT_PATH = /^\/r\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RETURN_PATH_MAX_AGE_MS = 10 * 60 * 1000

/** Remember the report a visitor was reading before an email or OAuth redirect. */
export function rememberAuthReturnPath(): void {
  const path = window.location.pathname
  if (!REPORT_PATH.test(path)) return
  try {
    window.localStorage.setItem(RETURN_PATH_KEY, JSON.stringify({ path, at: Date.now() }))
  } catch {
    // Storage can be disabled; sign-in still works and returns to the account.
  }
}

/** Consume only an internal report path; never treat storage as a redirect URL. */
export function consumeAuthReturnPath(): string {
  try {
    const saved = window.localStorage.getItem(RETURN_PATH_KEY)
    window.localStorage.removeItem(RETURN_PATH_KEY)
    if (saved == null) return '/account'
    const parsed = JSON.parse(saved) as { path?: unknown; at?: unknown }
    return typeof parsed.path === 'string' &&
      REPORT_PATH.test(parsed.path) &&
      typeof parsed.at === 'number' &&
      Date.now() - parsed.at <= RETURN_PATH_MAX_AGE_MS &&
      Date.now() >= parsed.at
      ? parsed.path
      : '/account'
  } catch {
    return '/account'
  }
}
