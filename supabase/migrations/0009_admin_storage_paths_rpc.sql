-- Admin storage paths RPC
--
-- The /admin/cleanup screen needs the full list of file paths in a
-- given bucket so it can diff against products.images and surface
-- the orphans (files in storage that no product row references any
-- more). Same reason admin_supabase_usage() exists: PostgREST doesn't
-- expose the storage schema, so the cleanup view can't read it
-- directly.
--
-- Returns one JSONB array of {path, bytes, created_at} rows sorted
-- newest-first. Pinned to a single bucket so the caller can't ask
-- for "everything" by accident.
--
-- Security model mirrors 0008 — SECURITY DEFINER + locked
-- search_path + EXECUTE granted only to service_role.

CREATE OR REPLACE FUNCTION public.admin_storage_paths(p_bucket text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_paths jsonb;
BEGIN
  IF p_bucket IS NULL OR length(p_bucket) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'path',       name,
        'bytes',      COALESCE((metadata->>'size')::bigint, 0),
        'created_at', created_at
      )
      ORDER BY created_at DESC
    ),
    '[]'::jsonb
  )
    INTO v_paths
  FROM storage.objects
  WHERE bucket_id = p_bucket;

  RETURN v_paths;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_storage_paths(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_storage_paths(text) TO service_role;

COMMENT ON FUNCTION public.admin_storage_paths(text) IS
  'Lists every object path in the given storage bucket with size + created_at, for the /admin/cleanup orphan-file scanner. Service-role callers only.';
