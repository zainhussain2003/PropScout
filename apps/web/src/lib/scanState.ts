/**
 * One rule for the three things "no risk flags" can mean (D-090; audit
 * counter-review): there was no text, the scan did not run, or the scan ran
 * and found nothing. A failed scan must never read as a clean one.
 */

import type { ExtractionStatus } from '../types/analysis'

export type ScanState = 'no_text' | 'failed' | 'partial' | 'clean' | 'flagged'

export function scanState(input: {
  flagCount: number
  hasDescription?: boolean
  extractionStatus?: ExtractionStatus | null
}): ScanState {
  if (input.hasDescription === false || input.extractionStatus === 'no_text') return 'no_text'
  if (input.extractionStatus === 'failed') return 'failed'
  if (input.flagCount > 0) return 'flagged'
  if (input.extractionStatus === 'partial') return 'partial'
  return 'clean'
}

/** Short verdict for a section head. */
export const SCAN_VERDICT: Record<Exclude<ScanState, 'flagged'>, string> = {
  no_text: 'No listing text',
  failed: 'Scan did not run',
  partial: 'Partial scan',
  clean: 'No wording flags',
}

/** One sentence for the empty state of a flags section. */
export const SCAN_NOTE: Record<Exclude<ScanState, 'flagged'>, string> = {
  no_text:
    'This property was entered by address, so there is no listing description to scan. Nothing here has been checked for risk language.',
  failed:
    'The listing description could not be scanned — the check did not run. Treat this section as unchecked, not clean; try again later.',
  partial:
    'Only the pattern scan ran; the AI read of the description failed. No pattern flags fired, but wording a pattern would miss has not been checked.',
  clean:
    'No risk language was found in the listing description. This wording scan is not an inspection or a clean bill of health.',
}

/** Note shown above flags when they came from a partial scan. */
export const PARTIAL_SCAN_WITH_FLAGS =
  'Only the pattern scan ran; the AI read of the description failed. Flags below are from patterns alone.'
