-- Persist the analysis job state (audit J-06 / T-02; docs/BACKLOG.md §3).
--
-- Until now the API derived status on read: calculated_metrics set → complete,
-- otherwise pending. A run that died server-side therefore read as "pending"
-- forever and the analyzing page could only say "still waiting" (D-068), never
-- "failed". updateAnalysisStatus() in the API was a documented no-op.
--
-- The API is written to work with or without these columns (it falls back to
-- the derived status when the column is missing), so this migration can be
-- applied before or after the code deploys.
--
-- Apply: Supabase SQL editor, or `supabase db push`. Human gate — never applied
-- by an agent.

ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_code text;

COMMENT ON COLUMN analyses.status IS
  'Job state written by the API. calculated_metrics IS NOT NULL still means complete regardless of this column.';
COMMENT ON COLUMN analyses.failure_code IS
  'Machine-readable reason for status = failed (e.g. CALC_ENGINE_UNAVAILABLE, RENT_OUT_OF_BOUNDS).';

-- Backfill: anything with results is complete.
UPDATE analyses SET status = 'complete', status_updated_at = COALESCE(status_updated_at, created_at)
  WHERE calculated_metrics IS NOT NULL AND status <> 'complete';
