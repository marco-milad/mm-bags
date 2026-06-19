-- Admin usage RPC
--
-- The dashboard widget at /admin needs two numbers that aren't
-- exposed through PostgREST by default:
--
--   1. SUM(size) per storage bucket — the `storage` schema isn't
--      surfaced via the REST API on the free tier, so
--      `.schema('storage').from('objects')` returns empty even from
--      the service-role client.
--   2. pg_database_size(current_database()) — this is a Postgres
--      built-in that needs a function wrapper before PostgREST can
--      call it as RPC.
--
-- One SECURITY DEFINER function returns both as JSONB. SECURITY
-- DEFINER lets PostgREST call into the storage schema as the function
-- owner (postgres) regardless of the calling role's grants. We pin
-- search_path to '' to defend against schema-shadowing.
--
-- EXECUTE is revoked from PUBLIC and granted only to service_role —
-- the same role our admin client already uses — so the storefront's
-- anon key can't probe storage size.

CREATE OR REPLACE FUNCTION public.admin_supabase_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_db_bytes      bigint;
  v_buckets       jsonb;
BEGIN
  -- Total database size for the current Supabase project.
  SELECT pg_database_size(current_database()) INTO v_db_bytes;

  -- Per-bucket totals. COALESCE the JSONB to an empty array so the
  -- caller always gets a stable shape, even on a brand-new project
  -- with no uploads yet.
  SELECT COALESCE(jsonb_agg(row_to_json(b.*) ORDER BY b.bytes DESC), '[]'::jsonb)
    INTO v_buckets
  FROM (
    SELECT
      bucket_id,
      COUNT(*)::bigint AS file_count,
      COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint AS bytes
    FROM storage.objects
    GROUP BY bucket_id
  ) b;

  RETURN jsonb_build_object(
    'db_bytes', v_db_bytes,
    'buckets',  v_buckets
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_supabase_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_supabase_usage() TO service_role;

COMMENT ON FUNCTION public.admin_supabase_usage() IS
  'Returns JSONB { db_bytes, buckets[{bucket_id, file_count, bytes}] } for the /admin dashboard usage widget. Service-role callers only.';
