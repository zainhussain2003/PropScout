-- Neighbourhood census stats by Forward Sortation Area (first 3 chars of the
-- postal code), loaded from the 2021 StatsCan Census Profile by FSA via
-- scripts/load-neighbourhood-stats.mjs. Read at analysis time by
-- apps/api/src/services/statsCanService.ts (getNeighbourhoodStats).
--
-- Every value traces to StatsCan open data; a missing FSA simply isn't inserted
-- (the service returns null → the report shows an honest empty state, never a
-- fabricated number).
--
-- NOT YET APPLIED to production Supabase — run via the dashboard SQL editor or
-- supabase db push before the first `node scripts/load-neighbourhood-stats.mjs`.

create table if not exists public.neighbourhood_stats (
  fsa text primary key,               -- e.g. 'L5A'
  median_income integer,              -- median total household income 2020 ($)
  pop_growth_5y numeric,              -- (pop_2021 - pop_2016) / pop_2016, decimal
  data_year integer                   -- census year the figures are from (2021)
);
