// Consistent API error shape — used by all routes

export interface ApiError {
  error: true
  code: string        // machine-readable, e.g. 'SCRAPER_FAILED'
  message: string     // user-facing, safe to display
  details?: string    // internal only — never sent to frontend
}

export function makeError(code: string, message: string, details?: string): ApiError {
  return { error: true, code, message, ...(details ? { details } : {}) }
}
