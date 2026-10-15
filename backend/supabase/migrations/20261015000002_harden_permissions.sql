-- Apply after the initial schema. Existing databases need this migration too.
BEGIN;

-- Profiles currently contain only server-managed identity and billing data.
-- RLS ownership alone must never authorize changing premium entitlements.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon, authenticated;
-- Also remove any column-level grants independently of table privileges.
DO $$
DECLARE
  column_name text;
BEGIN
  FOR column_name IN
    SELECT attname FROM pg_attribute
    WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES (%I) ON TABLE public.profiles FROM anon, authenticated', column_name);
  END LOOP;
END;
$$;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.profiles TO service_role;

-- Enforce consent in the database as well as the Express routes, since the
-- public Data API can be called without going through Express.
DROP POLICY IF EXISTS "Website sync requires consent" ON public.synced_websites;
CREATE POLICY "Website sync requires consent"
  ON public.synced_websites AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = (SELECT auth.uid()) AND sync_enabled
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = (SELECT auth.uid()) AND sync_enabled
  ));

DROP POLICY IF EXISTS "Unlock history requires consent" ON public.unlock_history;
CREATE POLICY "Unlock history requires consent"
  ON public.unlock_history AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = (SELECT auth.uid()) AND analytics_opt_in
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = (SELECT auth.uid()) AND analytics_opt_in
  ));

-- Lock function name resolution for the privileged signup trigger.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

COMMIT;
