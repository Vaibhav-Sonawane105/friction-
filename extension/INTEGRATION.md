# Accounts and automatic website sync

## Local setup

1. Apply backend Supabase migrations in order, including `20261015000003_versioned_website_sync.sql` and `20261017000004_snapshot_only_website_writes.sql`. Run `backend/supabase/tests/versioned_sync.sql`, `permissions.sql` and `snapshot_only_writes.sql` in staging as `postgres`. Both end with `ROLLBACK`; run `ROLLBACK;` separately if an error leaves the transaction aborted.
2. Keep Supabase configuration in `backend/.env`. Start the API with `npm start` from `backend/` (default port 5000).
3. Development defaults to `http://localhost:5000`; an ignored `.env.local` can override it. Production builds currently read `VITE_API_URL=https://progressive-friction-api.onrender.com` from ignored `.env.production`. Mode-specific values override generic `.env.local` values; edit `.env.production` to change the production API and rebuild. HTTPS is required except for loopback. No API keys belong in the extension.
4. Reload the unpacked extension from `extension/dist`, refresh existing website tabs, and open the popup's **Account & automatic sync** section. Sign up or sign in; if confirmation is required, follow the email confirmation and then sign in. Use **Verify account** to check the authenticated profile endpoint.

Render Free staging is deployed; see ../backend/DEPLOYMENT.md. The modular foundation, Levels 1–2, standalone Level 3 tracking/memory/attention and temporary controls run in `dist-dev`; production `dist` retains legacy arithmetic. Level 3 selects one random game per attempt at counts 31–50; completing that game alone unlocks. The Level 4 timer, deferred UI polish and full-range activation remain pending; store release is deferred. Tracking plans/progress, attention selections, shuffled memory boards and flips/matches remain local and are not uploaded. Account requests execute in the extension worker using existing permissions; browser-preview webpages do not provide account controls.

For challenge development, run `npm run build:challenge-dev` and load `extension/dist-dev`. This separately loaded extension has its own local configuration/account state. The `challenge-dev` mode does not load `.env.production`; to test the hosted API, set `VITE_API_URL` in an ignored `.env.challenge-dev.local` deliberately and rebuild. Do not assume the production origin was copied or enable cloud sync just to transfer local test counts.

### Email confirmation redirect

For hosted staging, Supabase **Authentication → URL Configuration** should use `https://progressive-friction-api.onrender.com/auth/confirmed` as Site URL and an allowed redirect. Use `http://localhost:5000/auth/confirmed` only when deliberately testing a running local API. Saved dashboard values and a fresh hosted confirmation-email flow still need verification. Signup uses Supabase's configured Site URL. The API serves an informational page there that directs users back to the extension to sign in; it does not consume tokens or assert that confirmation succeeded. Restart the backend after updating its source.

The default Supabase redirect is `http://localhost:3000`. If nothing runs there, a successfully processed email link can still end at a browser connection-refused page. Try signing in through the extension; if Supabase reports the email is unconfirmed, check the user's confirmation status or request a fresh email. Previously issued links may still use the old redirect. Do not share confirmation URLs or their tokens. Use the hosted HTTPS confirmation-page URL instead of localhost when deploying.

## Challenge architecture boundary

Extend the implemented [modular foundation](../brain/project.md#required-modular-challenge-architecture): pure worker models are statically linked and only the selected model executes; browser views load on demand. Modules submit validated actions to the shared worker-owned coordinator. Never duplicate count/access writes in modules. Versioned attempts remain local and separate from account sync.

Existing domain/enabled-only sync must continue to preserve retained website counts and invalidate access for removed/disabled sites. Adding modules does not authorize uploading puzzle state, answers, timer state or unlock counts. Migration must be tested with existing synced/local lists and offline edits. Camera recognition is outside this phase.

## Behavior and privacy

- Local blocking, challenge completion, progression, and tab navigation do not wait on account requests. Account jobs use a separate queue and a 12-second API timeout. Render origins also use safe readiness reads before credentials/writes on first use and after 12 minutes without API traffic: up to four 20-second attempts spaced to tolerate fast loading responses, bounded to roughly 83 seconds. Transport retries apply only to safe health reads; credentials/mutations are not blindly replayed. The popup explains wake-up delay.
- Signing in alone uploads no domains. **Enable automatic sync** explicitly opts this device in and enables account-level sync consent.
- Enabled devices upload local website configuration changes and poll for remote changes approximately once a minute while Chrome runs. Chrome may delay alarms. Local edits survive outages and are reconciled on retry; **Check sync now** retries immediately.
- Only domain and enabled state sync. Counts, difficulty, sessions, full URLs, browsing history, and analytics events are not uploaded. Existing local counts are preserved for retained domains; newly downloaded domains start with zero local unlocks.
- Initial differing nonempty lists, incompatible concurrent edits, or a merged list above the two-site limit require choosing this device's list or the cloud list. No automatic truncation occurs. Deletions are tracked by comparing the last shared snapshot, current local list, and current cloud list.
- Cloud writes compare a server revision and replace the complete list in a database transaction. A stale revision causes a refetch/merge. Local application also checks that the configuration has not changed while the network request was in flight.
- Account tokens are kept only in `chrome.storage.session`, which is trusted-context-only by default. They survive popup/worker restarts but are cleared when Chrome closes or the extension reloads. Re-sign-in and per-device sync enablement are required afterward. Passwords are never stored. Tokens never appear in popup message responses.
- Logout clears device credentials even when the API cannot revoke the remote session; the UI reports that distinction. Existing access JWTs may remain valid until expiry.
- Turning sync off stops this device immediately and requests account-wide consent revocation. Other devices notice on their next poll or receive a permission rejection on a write. If offline, the UI reports account-wide failure; use **Disable sync for account** again after reconnecting. Cloud data is retained.

## Verification checklist

Run `npm test`, `npm run lint`, and `npm run build` from `extension/`, and `npm test` from `backend/`.

For live checks, use two Chrome profiles/devices with the extension and the same API/account:

1. Sign in on both. With sync off, change a list and confirm no domain uploads occur. Local blocking remains usable.
2. Enable automatic sync on A, then on B. If B is empty, A's domains should arrive. If both differ, resolve the displayed conflict explicitly. Verify the free limit remains two.
3. Add/remove a domain on A. B should update on its next poll; local progression on retained domains must remain unchanged.
4. Disconnect A, edit a list, and solve a challenge. Reconnect; pending configuration changes should sync automatically. No extra unlocks should be counted.
5. Make incompatible edits on A/B while one is offline. On reconnect, confirm a conflict is shown and no choice is silently discarded.
6. Enable email confirmation if desired and verify signup correctly requests confirmation. Verify wrong credentials, account verification, expired-token refresh, and sign-out. Tokens and passwords must not appear in logs or popup results.
7. Disable sync; verify the device makes no more domain requests. On another device, confirm account opt-out is recognized. Restart Chrome and confirm login is required while local blocking still works.

Live SQL tests and two-device checks require the configured Supabase project and running API; passing mocked tests alone does not verify them.

References: [Supabase refreshSession](https://supabase.com/docs/reference/javascript/auth-refreshsession), [Chrome extension network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).

Approved level product rules live in [project.md](../brain/project.md#approved-level-rules-2026-10-17). Existing counts migrate locally; challenge and timer state remain outside cloud sync. The new legacy-write retirement and process-only health response require deploying the updated backend.
