-- Adds score_version to analyses so deal-score scales never silently mix.
--
-- Version 1 = the original flat −5-per-red-flag deduction model (everything to date).
-- Version 2 (written by the app once shipped) = the mode-aware model where severe
--   flags GATE the maximum achievable score and standard flags deduct additively
--   (capped). The two scales are not comparable, so stored scores must carry which
--   model produced them.
--
-- Added now while it is free: a default-constant column costs nothing, whereas
-- retrofitting a version marker after real saved scores exist is a painful
-- backfill. Existing rows default to 1.

alter table public.analyses
  add column if not exists score_version integer not null default 1;

comment on column public.analyses.score_version is
  'Deal-score model version. 1 = flat per-flag deduction; 2 = mode-aware tiered/gating model.';
