-- PropScout — add age band fields to listings table
-- Migration: 20260525_add_age_of_building_fields.sql
--
-- Realtor.ca agents sometimes publish an age band ("11 to 15 years")
-- instead of a specific year_built. These three columns store the
-- raw string and the derived year range for downstream analysis.
--
-- year_built and year_built_known are unchanged — year_built_known
-- remains false when only an age band is available (no exact year).

alter table listings
    add column if not exists age_of_building_raw  text,
    add column if not exists year_built_earliest  smallint,
    add column if not exists year_built_latest    smallint;
