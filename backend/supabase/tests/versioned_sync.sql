-- Run as postgres in staging AFTER all three migrations. Ends with ROLLBACK.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('f0000000-0000-4000-8000-000000000003', 'sync-a@example.invalid'),
  ('f0000000-0000-4000-8000-000000000004', 'sync-b@example.invalid');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
UPDATE public.user_settings SET sync_enabled = true WHERE user_id = auth.uid();

DO $$
DECLARE snapshot jsonb; revision bigint;
BEGIN
  snapshot := public.get_website_snapshot();
  IF snapshot->'websites' <> '[]'::jsonb THEN RAISE EXCEPTION 'Unexpected initial snapshot'; END IF;
  revision := (snapshot->>'revision')::bigint;
  BEGIN
    PERFORM public.replace_website_snapshot(NULL, '[]');
    RAISE EXCEPTION 'Null revision was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  snapshot := public.replace_website_snapshot(revision, '[{"domain":"example.com","enabled":true}]');
  IF (snapshot->>'revision')::bigint <= revision OR jsonb_array_length(snapshot->'websites') <> 1 THEN
    RAISE EXCEPTION 'Replacement or revision increment failed';
  END IF;
  BEGIN
    PERFORM public.replace_website_snapshot(revision, '[]');
    RAISE EXCEPTION 'Stale revision was accepted';
  EXCEPTION WHEN serialization_failure THEN NULL;
  END;
  BEGIN
    UPDATE public.user_settings SET websites_revision = 1000 WHERE user_id = auth.uid();
    RAISE EXCEPTION 'Client changed server revision';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  revision := (snapshot->>'revision')::bigint;
  BEGIN
    PERFORM public.replace_website_snapshot(revision, '[{"domain":"a.com","enabled":true},{"domain":"b.com","enabled":true},{"domain":"c.com","enabled":true}]');
    RAISE EXCEPTION 'Free limit was bypassed';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.replace_website_snapshot(revision, '[{"domain":"https://example.com/private?secret=1","enabled":true}]');
    RAISE EXCEPTION 'A full URL was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  -- Failed writes must not delete previous cloud data.
  snapshot := public.get_website_snapshot();
  IF jsonb_array_length(snapshot->'websites') <> 1 THEN RAISE EXCEPTION 'Failed write changed data'; END IF;
  snapshot := public.replace_website_snapshot((snapshot->>'revision')::bigint, '[]');
  IF snapshot->'websites' <> '[]'::jsonb THEN RAISE EXCEPTION 'Removal did not sync'; END IF;
  -- Leave a record owned by A so the later B isolation assertion is meaningful.
  PERFORM public.replace_website_snapshot((snapshot->>'revision')::bigint, '[{"domain":"example.com","enabled":true}]');
END;
$$;

-- Settings upsert used by the existing API must still work with column grants.
INSERT INTO public.user_settings (user_id, sync_enabled, updated_at)
VALUES (auth.uid(), true, now()) ON CONFLICT (user_id) DO UPDATE
SET user_id = EXCLUDED.user_id, sync_enabled = EXCLUDED.sync_enabled, updated_at = EXCLUDED.updated_at;

UPDATE public.user_settings SET sync_enabled = false WHERE user_id = auth.uid();
DO $$
BEGIN
  IF public.get_website_snapshot() IS NOT NULL THEN RAISE EXCEPTION 'Opted-out snapshot was returned'; END IF;
  BEGIN
    PERFORM public.replace_website_snapshot(0, '[]');
    RAISE EXCEPTION 'Sync without consent was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

-- A second user's RPC sees only their own, empty list and cannot affect user A.
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000004', true);
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
UPDATE public.user_settings SET sync_enabled = true WHERE user_id = auth.uid();
DO $$
BEGIN
  IF public.get_website_snapshot()->'websites' <> '[]'::jsonb THEN RAISE EXCEPTION 'User data leaked'; END IF;
END;
$$;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.synced_websites WHERE user_id = 'f0000000-0000-4000-8000-000000000003') <> 1 THEN
    RAISE EXCEPTION 'User A data was unexpectedly changed';
  END IF;
END;
$$;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.get_website_snapshot();
    RAISE EXCEPTION 'Anonymous RPC access was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
ROLLBACK;
