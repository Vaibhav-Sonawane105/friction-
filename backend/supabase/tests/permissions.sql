-- Run as postgres in a staging Supabase SQL editor AFTER all four migrations.
-- Any exception means failure. All fixtures and writes are rolled back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'permissions-a@example.invalid'),
  ('f0000000-0000-4000-8000-000000000002', 'permissions-b@example.invalid');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles) <> 1 THEN
    RAISE EXCEPTION 'Profile isolation failed';
  END IF;
  BEGIN
    UPDATE public.profiles SET plan = 'premium'
      WHERE id = 'f0000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Self-upgrade was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.profiles SET subscription_status = 'active'
      WHERE id = 'f0000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Subscription modification was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.synced_websites (user_id, domain)
      VALUES ('f0000000-0000-4000-8000-000000000001', 'example.com');
    RAISE EXCEPTION 'Sync without consent was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.unlock_history (user_id, domain)
      VALUES ('f0000000-0000-4000-8000-000000000001', 'example.com');
    RAISE EXCEPTION 'Analytics without consent was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

UPDATE public.user_settings SET sync_enabled = true, analytics_opt_in = true
  WHERE user_id = 'f0000000-0000-4000-8000-000000000001';
SELECT public.replace_website_snapshot(
  (public.get_website_snapshot()->>'revision')::bigint,
  '[{"domain":"example.com","enabled":true}]'::jsonb);
INSERT INTO public.unlock_history (user_id, domain)
  VALUES ('f0000000-0000-4000-8000-000000000001', 'example.com');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.synced_websites) <> 1 OR
     (SELECT count(*) FROM public.unlock_history) <> 1 THEN
    RAISE EXCEPTION 'Consented data access failed';
  END IF;
  BEGIN
    INSERT INTO public.synced_websites (user_id, domain)
      VALUES ('f0000000-0000-4000-8000-000000000002', 'example.com');
    RAISE EXCEPTION 'Cross-user website write was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

-- Switch identity and prove another user cannot see the first user's data.
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
UPDATE public.user_settings SET sync_enabled = true, analytics_opt_in = true
  WHERE user_id = 'f0000000-0000-4000-8000-000000000002';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.synced_websites) OR
     EXISTS (SELECT 1 FROM public.unlock_history) THEN
    RAISE EXCEPTION 'Cross-user data was visible';
  END IF;
  IF (SELECT count(*) FROM public.user_settings) <> 1 THEN
    RAISE EXCEPTION 'Settings isolation failed';
  END IF;
END;
$$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.profiles;
    RAISE EXCEPTION 'Anonymous profile access was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.profiles SET plan = 'premium', subscription_status = 'active'
  WHERE id = 'f0000000-0000-4000-8000-000000000001';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles
    WHERE id = 'f0000000-0000-4000-8000-000000000001' AND plan = 'premium') THEN
    RAISE EXCEPTION 'Trusted billing updates failed';
  END IF;
END;
$$;

ROLLBACK;
