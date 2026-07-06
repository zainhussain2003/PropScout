// Shared HTTP helpers for the API's outbound calls to the calc-engine / scraper.

export interface SerializedError {
  name?: string
  message: string
  stack?: string
}

/**
 * Turn an unknown thrown value into a loggable object with message AND stack.
 * Fastify's default serializer sometimes surfaces only the message; the stack is
 * what tells a timeout apart from a DNS failure apart from a parse error.
 */
export function serializeError(err: unknown): SerializedError {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  return { message: String(err) }
}

/**
 * True when a fetch rejected because a request timeout fired. `AbortSignal.timeout`
 * rejects with a DOMException named 'TimeoutError'; a manual AbortController aborts
 * with 'AbortError'. Both mean "we gave up waiting", which the scrape path maps to
 * the graceful SCRAPER_FAILED (manual-entry) response rather than a 500.
 */
export function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
}
