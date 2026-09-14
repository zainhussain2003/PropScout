/**
 * What is actually deployed. Railway sets RAILWAY_GIT_COMMIT_SHA on every
 * deploy; /health echoes it so "is the fix live yet?" is a curl, not a guess
 * (D-094). Null locally and anywhere the variable is not set.
 */

export interface BuildInfo {
  commit: string | null
  /** First 7 characters, the form git log prints; null when unknown. */
  shortCommit: string | null
}

export function buildInfo(env: NodeJS.ProcessEnv = process.env): BuildInfo {
  const raw = env.RAILWAY_GIT_COMMIT_SHA ?? env.GIT_COMMIT_SHA ?? env.SOURCE_COMMIT ?? null
  const commit = raw != null && /^[0-9a-f]{7,40}$/i.test(raw.trim()) ? raw.trim() : null
  return { commit, shortCommit: commit ? commit.slice(0, 7) : null }
}
