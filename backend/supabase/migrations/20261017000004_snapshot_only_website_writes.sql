-- Apply after migrations 1-3 as postgres. No existing cloud rows are deleted.
-- All untrusted writes must use the bounded, revision-checked replacement RPC.
BEGIN;
REVOKE INSERT, UPDATE, DELETE ON public.synced_websites FROM PUBLIC, anon, authenticated;
-- Column grants can survive revoking table-level privileges.
DO $$
DECLARE column_name text;
BEGIN
  FOR column_name IN
    SELECT attname FROM pg_attribute
    WHERE attrelid = 'public.synced_websites'::regclass AND attnum > 0 AND NOT attisdropped
  LOOP
    EXECUTE format('REVOKE INSERT (%I), UPDATE (%I) ON public.synced_websites FROM PUBLIC, anon, authenticated', column_name, column_name);
  END LOOP;
END;
$$;

-- Its body already derives the owner exclusively from auth.uid(), checks
-- consent under a row lock, validates <=2 entries and requires the revision.
-- Elevate only this narrow function so it can write the now-protected table.
ALTER FUNCTION public.replace_website_snapshot(bigint, jsonb) SECURITY DEFINER;
ALTER FUNCTION public.replace_website_snapshot(bigint, jsonb) SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.replace_website_snapshot(bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_website_snapshot(bigint, jsonb) TO authenticated;
COMMIT;
