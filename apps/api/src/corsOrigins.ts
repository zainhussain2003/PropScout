/**
 * Browser origins allowed to call the API.
 *
 * FRONTEND_URL remains the canonical deployed site used by redirects and PDF
 * rendering. Vercel branch aliases and immutable Preview deployment URLs are
 * also allowed so a branch can be exercised end to end before it is merged.
 * The regex is deliberately scoped to this Vercel project and team.
 */

const PROP_SCOUT_VERCEL_PREVIEW =
  /^https:\/\/prop-scout(?:-git-[a-z0-9-]+|-[a-z0-9]+)-zainhussain2003s-projects\.vercel\.app$/

export function corsOrigins(frontendUrl: string): Array<string | RegExp> {
  return [frontendUrl, PROP_SCOUT_VERCEL_PREVIEW]
}
