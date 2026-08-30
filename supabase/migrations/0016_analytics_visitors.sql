-- Analytics phase 0: visitor identity only.
--
-- This table outlives the raw event log. Events are pruned at 90 days; the
-- visitor row keeps first_seen_at forever (until 13 months of inactivity), and
-- that column is the only thing that can answer "new vs returning" once the
-- events behind it are gone.
--
-- The id is the mm_vid cookie: a random UUID v4 minted in proxy.ts. It is not
-- derived from an IP, a user agent, or anything else about the person. Stored
-- as text because it arrives from a cookie and is never joined as a uuid.

create table if not exists public.analytics_visitors (
  id            text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists analytics_visitors_first_seen_idx
  on public.analytics_visitors (first_seen_at);

-- RLS with deliberately NO policies.
--
-- Every table in `public` is exposed to `anon` through PostgREST by default,
-- and this one holds behavioural data. Enabling RLS without a single policy
-- makes it invisible to both anon and authenticated; service_role bypasses RLS,
-- and every write and read path goes through the service-role key.
--
-- Do not add a "public read" policy here to make something work.
alter table public.analytics_visitors enable row level security;
