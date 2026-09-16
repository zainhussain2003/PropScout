-- Guest attribution (D-116): one free anonymous analysis, then sign in.
--
-- The API issues an anonymous visitor id in a first-party HttpOnly cookie and
-- records it on the analyses it runs for that visitor. The count of a guest's
-- analyses is what the guest wall checks (feature-flagged until auth email is
-- reliable), and it is what lets those analyses be CLAIMED — assigned to the
-- user_id — when the visitor signs in.
--
-- The API runs on either side of this migration: until it is applied, guest
-- analyses are not counted (the wall lets them through) and cannot be claimed.
-- It writes guest_id only on rows it creates for a guest; claimed rows keep
-- their guest_id as a record of the path they took.
--
-- Human gate: Claude writes migrations, the owner applies them.

alter table public.analyses
  add column if not exists guest_id text;

comment on column public.analyses.guest_id is
  'Anonymous visitor id (cookie) that ran this analysis before signing in; kept after the row is claimed (D-116).';

-- The two queries: count a guest's unclaimed analyses; claim them on sign-in.
create index if not exists analyses_guest_unclaimed_idx
  on public.analyses (guest_id)
  where user_id is null;
