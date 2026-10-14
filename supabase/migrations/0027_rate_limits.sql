-- 0027 — Shared rate limiting (audit M2–M4).
--
-- The only limiter so far lived in each server instance's memory, so a
-- spammer simply landed on a different instance. This keeps one fixed-window
-- counter per key in Postgres, shared by every instance:
--   rate_limit_hit(key, window_seconds, max) → allowed / hits / retry_after
-- Keys are built by the app (e.g. "order:ip:<ip>", "track:order:<number>").
-- One atomic upsert per call; old windows are swept opportunistically.
-- The app falls back to its in-memory limiter if this function is missing,
-- so deploying the code before this migration is safe.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         int         NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- No policies: only the service role (which bypasses RLS) touches it.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key            text,
  p_window_seconds int,
  p_max            int
) RETURNS TABLE (allowed boolean, hits int, retry_after int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start timestamptz;
  v_hits  int;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 OR length(p_key) > 200 THEN
    RAISE EXCEPTION 'rate_limit_hit: key must be 1..200 chars';
  END IF;
  IF p_window_seconds < 1 OR p_window_seconds > 604800 THEN
    RAISE EXCEPTION 'rate_limit_hit: window must be 1..604800 seconds';
  END IF;
  IF p_max < 1 OR p_max > 100000 THEN
    RAISE EXCEPTION 'rate_limit_hit: max must be 1..100000';
  END IF;

  v_start := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.rate_limits AS rl (key, window_start, hits)
  VALUES (p_key, v_start, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = rl.hits + 1
  RETURNING rl.hits INTO v_hits;

  -- Keep the table small without a cron: ~1% of calls sweep expired rows.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '8 days';
  END IF;

  allowed     := v_hits <= p_max;
  hits        := v_hits;
  retry_after := greatest(1, ceil(extract(epoch FROM (v_start + make_interval(secs => p_window_seconds) - now())))::int);
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, int, int) TO service_role;

COMMENT ON FUNCTION public.rate_limit_hit IS
  'Fixed-window rate limiter shared by all app instances. Returns allowed=false once p_max hits are reached in the current window. service_role only.';

COMMIT;
