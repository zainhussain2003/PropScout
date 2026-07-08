/**
 * Narrative text helpers.
 *
 * The Sonnet AI verdict narrative occasionally comes back with Markdown emphasis
 * markers (e.g. "priced **$552 above the market median**"). The report UI renders
 * the narrative as plain text — it has no Markdown parser — so those markers would
 * otherwise leak through as literal asterisks. We strip them at the service layer
 * (the single source that returns the Analysis) so every report mode and tier
 * shows clean prose.
 */

/**
 * Strip inline Markdown emphasis from a narrative string, keeping the inner text.
 *
 * Handles the markers a prose verdict realistically contains:
 *   - bold / italic: ***t***, **t**, __t__, *t*, _t_
 *   - inline code:   `t`
 *   - links:         [t](url) -> t
 *
 * Single-underscore italic is bounded by non-word neighbours so ordinary
 * snake_case tokens in prose are left untouched.
 *
 * @param text - Raw narrative, possibly containing Markdown emphasis
 * @returns The same text with emphasis markers removed
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/(?<![\w`])_(.+?)_(?![\w`])/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1')
}

/**
 * Return a shallow copy of an analysis-like object with its narrative cleaned of
 * Markdown emphasis. No-op when the narrative is null.
 *
 * @param analysis - Any object carrying a `narrative: string | null` field
 * @returns The same object with `narrative` stripped of Markdown (when present)
 */
export function withCleanNarrative<T extends { narrative: string | null }>(analysis: T): T {
  if (analysis.narrative) {
    return { ...analysis, narrative: stripMarkdown(analysis.narrative) }
  }
  return analysis
}
