/**
 * The free-tier quota window is the UTC calendar month (D-071). Both the
 * count in supabaseService and the reset date POST /analysis reports read
 * these, so the two can never disagree about which month "this month" is.
 *
 * UTC, not server-local: Railway runs in UTC anyway, and a window that moved
 * with the server's timezone would silently change the count on redeploy.
 */

/** First instant of the calendar month containing `now`. */
export function startOfCurrentMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

/** First instant of the following calendar month — when the quota resets. */
export function startOfNextMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}
