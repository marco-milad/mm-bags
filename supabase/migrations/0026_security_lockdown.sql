-- 0026 — Security lockdown (audit 2026-10-14).
--
-- C1  The stock functions ran for the public anon key (the key every browser
--     has): anyone could zero or inflate any variant's stock. Supabase grants
--     EXECUTE on new public-schema functions to anon/authenticated by name, so
--     the earlier "REVOKE … FROM PUBLIC" never removed those grants.
-- C2  RLS let anyone INSERT into orders when user_id is null (fake orders,
--     including "paid"/"delivered" ones that skew revenue).
-- M1  Signed-in users could insert their own review already approved /
--     marked verified, skipping moderation.
-- M5  Anyone could insert back-in-stock subscriptions directly (junk phone
--     numbers then get paid WhatsApp sends).
-- L   admin_supabase_usage / admin_storage_paths ran for anon (leaked bucket
--     sizes and every storage path).
--
-- Every app write to these tables and every call to these functions already
-- uses the service-role client (checkout, reviews, notifications, returns,
-- POS, admin usage/cleanup), so nothing in the app changes behaviour.

BEGIN;

-- ── C1 + L: functions → service_role only ───────────────────────────────
REVOKE EXECUTE ON FUNCTION public.deduct_stock_atomic(uuid, int, text, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_stock_atomic(uuid, int, text, uuid, uuid, text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.deduct_stock_bulk_atomic(jsonb, text, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_stock_bulk_atomic(jsonb, text, uuid, uuid, text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.restock_atomic(uuid, int, text, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restock_atomic(uuid, int, text, uuid, uuid, text, text)
  TO service_role;

-- Admin helpers: revoke by name whatever their argument list is.
DO $$
DECLARE f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('admin_supabase_usage', 'admin_storage_paths')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;

-- Future functions created by this role start locked; each migration then
-- grants service_role (as 0014/0015/0022/0025 already do). A helper that RLS
-- policies must call as `authenticated` needs an explicit GRANT.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- ── C2: no direct order inserts from the browser ─────────────────────────
DROP POLICY IF EXISTS "Users insert own orders" ON public.orders;

-- ── M1: reviews only via the server action (moderated) ───────────────────
DROP POLICY IF EXISTS "Users insert own reviews" ON public.reviews;

-- ── M5: back-in-stock subscriptions only via the server action ──────────
DROP POLICY IF EXISTS "Anyone can subscribe to restock" ON public.notification_subscriptions;

COMMIT;

-- Verify (run after COMMIT; every row should say false):
-- select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon_can_exec
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('deduct_stock_atomic','deduct_stock_bulk_atomic','restock_atomic',
--                     'admin_supabase_usage','admin_storage_paths','cancel_order_with_restock');
