import { git } from './git.mjs'

/**
 * Check that every citation in a review points at a file and line range that
 * exist at the candidate commit.
 *
 * ## Why
 *
 * A `changes_requested` review is fed straight back to the builder as its
 * next instruction. If the reviewer cited a file that does not exist at the
 * candidate SHA — a path it hallucinated, or one from a different commit — the
 * builder spends a round chasing a defect that is not there, and the loop
 * records a finding with no anchor. The schema validates the *shape* of a
 * citation; this validates that it *resolves*.
 *
 * Returns a list of errors, empty when every citation resolves. Errors name
 * the finding index, path and range so the reviewer can be asked to correct
 * exactly that one.
 */
export function validateCitations(worktree, sha, findings) {
  const errors = []

  findings.forEach((finding, findingIndex) => {
    ;(finding.citations ?? []).forEach((citation, citationIndex) => {
      const label = `findings[${findingIndex}].citations[${citationIndex}]`
      const spec = `${sha}:${citation.path}`

      // The schema bounds each line number on its own; it cannot express
      // that the range is ordered. `start_line: 999, end_line: 1` would
      // otherwise pass here and be fed back to the builder.
      if (citation.start_line < 1 || citation.end_line < citation.start_line) {
        errors.push(
          `${label}: line range ${citation.start_line}-${citation.end_line} is not ordered (start_line must be >= 1 and <= end_line)`
        )
        return
      }

      let content
      try {
        content = git(worktree, ['show', spec], { echo: false, trim: false })
      } catch {
        errors.push(`${label}: ${citation.path} does not exist at ${sha.slice(0, 12)}`)
        return
      }

      // A trailing newline does not add a line; an empty file has zero.
      const lineCount = content.length === 0 ? 0 : content.replace(/\n$/, '').split('\n').length
      if (citation.end_line > lineCount) {
        errors.push(
          `${label}: end_line ${citation.end_line} is past the end of ${citation.path} (${lineCount} lines at ${sha.slice(0, 12)})`
        )
      }
    })
  })

  return errors
}
