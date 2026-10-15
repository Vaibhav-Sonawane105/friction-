-- Automatic sync uses optimistic concurrency so devices cannot silently replace
-- newer cloud lists. Apply after migrations 1 and 2.
BEGIN;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS websites_revision bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bump_websites_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.user_settings SET websites_revision = websites_revision + 1
    WHERE user_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bump_websites_revision() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS bump_websites_revision ON public.synced_websites;
CREATE TRIGGER bump_websites_revision AFTER INSERT OR UPDATE OR DELETE ON public.synced_websites
  FOR EACH ROW EXECUTE FUNCTION public.bump_websites_revision();

-- Revision is server-controlled, including direct Data API updates to settings.
REVOKE UPDATE ON public.user_settings FROM authenticated, anon;
REVOKE UPDATE (websites_revision) ON public.user_settings FROM authenticated, anon;
GRANT UPDATE (user_id, sync_enabled, analytics_opt_in, theme, challenge_preference, updated_at) ON public.user_settings TO authenticated;
REVOKE INSERT ON public.user_settings FROM authenticated, anon;
GRANT INSERT (user_id, sync_enabled, analytics_opt_in, theme, challenge_preference, updated_at) ON public.user_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.get_website_snapshot()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'revision', s.websites_revision,
    'websites', COALESCE((SELECT jsonb_agg(jsonb_build_object('domain', w.domain, 'enabled', w.enabled) ORDER BY w.domain)
      FROM public.synced_websites w WHERE w.user_id = s.user_id), '[]'::jsonb)
  ) FROM public.user_settings s WHERE s.user_id = auth.uid() AND s.sync_enabled;
$$;

CREATE OR REPLACE FUNCTION public.replace_website_snapshot(expected_revision bigint, websites jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE current_revision bigint;
BEGIN
  IF expected_revision IS NULL OR expected_revision < 0 THEN
    RAISE EXCEPTION 'A valid revision is required' USING ERRCODE = '22023';
  END IF;
  -- Serialize replacement, consent changes, and revision checks for this user.
  SELECT s.websites_revision INTO current_revision FROM public.user_settings s
    WHERE s.user_id = auth.uid() AND s.sync_enabled FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sync is disabled' USING ERRCODE = '42501'; END IF;
  IF current_revision <> expected_revision THEN
    RAISE EXCEPTION 'Cloud list changed' USING ERRCODE = '40001';
  END IF;
  IF jsonb_typeof(websites) IS DISTINCT FROM 'array' OR jsonb_array_length(websites) > 2 THEN
    RAISE EXCEPTION 'At most two websites are supported' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(websites) x
    WHERE jsonb_typeof(x) <> 'object' OR jsonb_typeof(x->'domain') IS DISTINCT FROM 'string'
      OR length(x->>'domain') > 253
      OR (x->>'domain') !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
      OR jsonb_typeof(x->'enabled') IS DISTINCT FROM 'boolean') THEN
    RAISE EXCEPTION 'Invalid website snapshot' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(DISTINCT x->>'domain') FROM jsonb_array_elements(websites) x) <> jsonb_array_length(websites) THEN
    RAISE EXCEPTION 'Duplicate domains' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.synced_websites WHERE user_id = auth.uid();
  INSERT INTO public.synced_websites (user_id, domain, enabled)
    SELECT auth.uid(), x->>'domain', (x->>'enabled')::boolean FROM jsonb_array_elements(websites) x;
  RETURN public.get_website_snapshot();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_website_snapshot() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.replace_website_snapshot(bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_website_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_website_snapshot(bigint, jsonb) TO authenticated;
COMMIT;
