# Accounts and automatic website sync

## Local setup

1. Apply backend Supabase migrations in order, including `20261015000003_versioned_website_sync.sql`. Run `backend/supabase/tests/versioned_sync.sql` and `permissions.sql` in staging as `postgres`. Both end with `ROLLBACK`; run `ROLLBACK;` separately if an error leaves the transaction aborted.
2. Keep Supabase configuration in `backend/.env`. Start the API with `npm start` from `backend/` (default port 5000).
3. The extension defaults to `http://localhost:5000` for unpacked development. To use a different API origin, copy `extension/.env.example` to `.env.local`, set `VITE_API_URL`, and rebuild with `npm run build`. HTTPS is required except for loopback development. No API keys are required in the extension.
4. Reload the unpacked extension from `extension/dist`, refresh existing website tabs, and open the popup's **Account & automatic sync** section. Sign up or sign in; if confirmation is required, follow the email confirmation and then sign in. Use **Verify account** to check the authenticated profile endpoint.

Set `VITE_API_URL` to the deployed HTTPS API before publishing. This change does not choose or deploy hosting. Account requests execute in the extension worker using the existing host permissions; browser-preview/Vite webpages do not provide account controls.

### Email confirmation redirect

In Supabase **Authentication → URL Configuration**, set the development **Site URL** to `http://localhost:5000/auth/confirmed` (use the actual backend port if different). Signup uses Supabase's configured Site URL. The API serves an informational page there that directs users back to the extension to sign in; it does not consume tokens or assert that confirmation succeeded. Restart the backend after updating its source.

The default Supabase redirect is `http://localhost:3000`. If nothing runs there, a successfully processed email link can still end at a browser connection-refused page. Try signing in through the extension; if Supabase reports the email is unconfirmed, check the user's confirmation status or request a fresh email. Previously issued links may still use the old redirect. Do not share confirmation URLs or their tokens. Use the hosted HTTPS confirmation-page URL instead of localhost when deploying.

## Behavior and privacy

- Local blocking, challenge completion, progression, and tab navigation do not wait on account requests. Account network jobs have a separate queue and a 12-second request timeout.
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
