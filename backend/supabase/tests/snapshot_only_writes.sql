-- Run as postgres after migrations 1-4. Every fixture is rolled back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('f0000000-0000-4000-8000-000000000005', 'limit-a@example.invalid'),
  ('f0000000-0000-4000-8000-000000000006', 'limit-b@example.invalid');
UPDATE public.user_settings SET sync_enabled = true
  WHERE user_id IN ('f0000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000006');
-- Trusted fixture models old oversized data; the migration must not erase it.
INSERT INTO public.synced_websites (user_id, domain)
SELECT 'f0000000-0000-4000-8000-000000000005'::uuid, domain
FROM (VALUES ('a.com'), ('b.com'), ('c.com')) AS entries(domain);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000005', true);
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
DO $$
DECLARE before_snapshot jsonb; saved jsonb;
BEGIN
  before_snapshot := public.get_website_snapshot();
  IF jsonb_array_length(before_snapshot->'websites') <> 3 THEN RAISE EXCEPTION 'Existing rows were lost'; END IF;
  BEGIN
    INSERT INTO public.synced_websites (user_id, domain) VALUES (auth.uid(), 'd.com');
    RAISE EXCEPTION 'Direct INSERT was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.synced_websites SET enabled = false WHERE user_id = auth.uid();
    RAISE EXCEPTION 'Direct UPDATE was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.synced_websites WHERE user_id = auth.uid();
    RAISE EXCEPTION 'Direct DELETE was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.replace_website_snapshot((before_snapshot->>'revision')::bigint,
      '[{"domain":"a.com","enabled":true},{"domain":"b.com","enabled":true},{"domain":"c.com","enabled":true}]');
    RAISE EXCEPTION 'RPC accepted three websites';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  IF public.get_website_snapshot() <> before_snapshot THEN RAISE EXCEPTION 'Rejected writes changed data'; END IF;
  saved := public.replace_website_snapshot((before_snapshot->>'revision')::bigint,
    '[{"domain":"a.com","enabled":true},{"domain":"b.com","enabled":false}]');
  IF jsonb_array_length(saved->'websites') <> 2 THEN RAISE EXCEPTION 'Oversized-list recovery failed'; END IF;
  BEGIN
    PERFORM public.replace_website_snapshot((before_snapshot->>'revision')::bigint, '[]');
    RAISE EXCEPTION 'RPC accepted stale revision';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
END;
$$;

SELECT set_config('request.jwt.claim.sub', 'f0000000-0000-4000-8000-000000000006', true);
SELECT set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000006","role":"authenticated"}', true);
DO $$
DECLARE snapshot jsonb;
BEGIN
  snapshot := public.get_website_snapshot();
  IF snapshot->'websites' <> '[]'::jsonb THEN RAISE EXCEPTION 'Cross-user read'; END IF;
  PERFORM public.replace_website_snapshot((snapshot->>'revision')::bigint, '[{"domain":"other.com","enabled":true}]');
END;
$$;
UPDATE public.user_settings SET sync_enabled = false WHERE user_id = auth.uid();
DO $$
BEGIN
  BEGIN
    PERFORM public.replace_website_snapshot(0, '[]');
    RAISE EXCEPTION 'RPC ignored disabled consent';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$$;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.synced_websites WHERE user_id = 'f0000000-0000-4000-8000-000000000005') <> 2 THEN
    RAISE EXCEPTION 'User B changed user A data';
  END IF;
END;
$$;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.replace_website_snapshot(0, '[]');
    RAISE EXCEPTION 'Anonymous replacement allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$$;
ROLLBACK;
