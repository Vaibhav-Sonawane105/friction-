# Render Free staging

The API runs on Render; Supabase remains the authentication and database provider.
Render Free is for staging/hobby use. It sleeps after 15 idle minutes and waking
can take about a minute. Verify the cold-start experience before a public release.

## Create the service

Commit/push only when the owner approves. Render builds the GitHub revision, not
uncommitted local files. The repository-root `render.yaml` declares the service;
alternatively create a Web Service in the Render dashboard with these settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Instance type | Free |
| Root directory | `backend` |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check | `/health` |
| Automatic deployment | Off |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22.22.0` |
| `SUPABASE_URL` | Existing project's Supabase URL |
| `SUPABASE_ANON_KEY` | Existing project's anon/publishable key |

Enter environment values privately in Render. Do not upload `.env` or configure
a service-role key. Render supplies `PORT`; do not set it to the local 5000.
Do not create a Render database. After the first deployment, use manual deploys.
Choose a region close to the Supabase project's region when available.

## Connect the extension and confirmation emails

1. Check `https://YOUR-SERVICE.onrender.com/health` returns HTTP 200. This is
   process liveness only: the current `supabase: connected` field does not prove
   database connectivity or RLS. Verify authenticated operations separately.
2. In Supabase Authentication URL Configuration, add the exact
   `https://YOUR-SERVICE.onrender.com/auth/confirmed` redirect URL. Set the Site URL
   to that hosted confirmation page for default confirmation links. Preserve
   development redirect entries if still needed. Request a fresh confirmation
   email after changing the configuration; previously issued links can retain
   their original redirect destination.
3. In an ignored local `extension/.env.production`, set only
   `VITE_API_URL=https://YOUR-SERVICE.onrender.com` (an origin with no path).
4. Run `npm run build` from `extension`, reload the unpacked extension, and
   refresh existing test tabs. Vite embeds this URL at build time.

## Verify staging

- Login with a verified test account, verify profile, enable sync explicitly,
  and check add/remove/toggle synchronization across two Chrome profiles.
- Allow the service to sleep for at least 15 minutes without requests; the
  extension's sync alarm can keep it active while consent is enabled. For a
  real cold-start test, close other profiles/devices and disable sync before
  waiting. Then sign in or verify the account and observe the loading message.
- Render origins use unauthenticated `/health` reads before the first account
  request and after 12 minutes without successful API traffic. Up to four
  20-second reads, spaced at least 20 seconds apart, allow up to roughly 83
  seconds for wake-up. Fast loading/error responses do not exhaust the checks
  immediately. Each
  attempt also reads Chrome session storage to renew service-worker activity.
  Login/signup/refresh/writes are not automatically replayed for network failure.
- If wake-up exceeds that window, a clear error appears and the user can retry;
  enabled sync also retries on its existing alarm. This is not a keep-alive job.
- With the API unavailable, confirm local blocking, challenges and unlock
  progression still work. Check offline edits sync after recovery and disabling
  sync stops this device.
- Check signed-out requests cannot read account data and tokens/passwords are
  absent from logs, popup status and persistent local storage.

Automated tests simulate wake-up; real Chrome cold-start behavior and live Render
requests remain acceptance checks until a service is deployed.

References: https://render.com/docs/free and
https://render.com/docs/blueprint-spec.
