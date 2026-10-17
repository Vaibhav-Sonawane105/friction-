# Project Execution Progress & State Log

> **CRITICAL RULE FOR AI ASSISTANTS (from [instructions.md](instructions.md)):**
> **DO NOT modify or append to this file without explicitly asking and receiving confirmation from the user.**
> This file acts as the primary project context bridge across AI sessions—similar to a chronological git graph and snapshot of recent states, completed tasks, and active goals.

---

## 1. Quick State Snapshot

* **Current Active Phase:** Preparation steps 1–7 complete locally; level product rules approved. Next: technical design of the modular challenge foundation, then implementation and Levels 1–4. No modular runtime or new levels have been built.
* **Current Status:** Render staging remains deployed at `https://progressive-friction-api.onrender.com`; prior hosted acceptance is owner-reported. Fresh checkpoint checks: 110/110 extension tests across 9 files, 80/80 backend tests across 7 files, extension lint and build passed. New validation, legacy-write retirement and diagnostics changes are local and await backend redeployment. Owner reports migration 4 and SQL checks ran without errors; assistant did not independently execute hosted SQL.
* **Active Working Directory:** `extension/`
* **Current Focus:** Follow the required modular architecture in project.md and sequence in phases.md: design/implement the reusable foundation first, then independent Levels 1–4, then continue subscriptions, dashboard/analytics and signature features unless the owner changes priorities. Store release is deferred. Owner authorized this project-wide Markdown synchronization; future brain edits and GitHub commits/pushes still require permission.

---

## 2. Project Architecture & Decisions Baseline

* **Project Goal:** Progressive-friction website blocker where users restrict distracting websites (up to 2 on free tier) and must solve progressive math challenges to obtain temporary access per session.
* **Blocking Mechanism:** **In-Page Overlay Modal (Content Script + Shadow DOM)**:
  * Eliminates full-page navigation redirect; the user remains on the restricted page (e.g. YouTube, Reddit).
  * Injected at `document_start` via dynamic module import loader.
  * Encapsulated within an isolated Shadow DOM (`#progressive-friction-root`) preventing host website CSS resets/rules from interfering.
  * Fullscreen backdrop with heavy blur (`backdrop-filter: blur(16px) brightness(0.65)`) and dark overlay tint (`rgba(0, 0, 0, 0.45)`).
  * Automatically pauses autoplaying host media (audio/video) and locks host scrolling while blocked.
  * Solved challenge smoothly fades out overlay, unlocks the tab session, and restores page scrolling.
* **UI Theme:** **Neo-Brutalism & Signature Gradient Glow**:
  * Crisp 2px solid black borders, hard offset black drop shadows (`shadow-brutal-card`, `shadow-brutal-header`, `shadow-brutal-badge`).
  * Outer glowing gradient card frame (`linear-gradient(135deg, #80E8FF 0%, #FFCBAA 33%, #D9B7F9 70%, #FF699B 100%)`).
  * Palette: Peach (`#FFB8B5`), Coral/Red (`#F24822`), Yellow (`#FBE76D`), Turquoise (`#4ECDC4`), Hot Pink (`#FF699B`), Neutral canvas (`#F4F4F6`, `#FFFFFF`).
  * Typography: Jeju Gothic for headings, equations, and primary buttons; Istok Web for body, labels, inputs, and badges.
* **Extension Standard:** Chrome Manifest V3 (`storage`, `tabs`, `webNavigation`, `alarms`, `content_scripts`, `web_accessible_resources`), minimum Chrome 106.
* **Tech Stack:**
  * Frontend: React 19, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), custom SVG icons from `public/assets/logos/`.
  * Testing: Fresh checkpoint passed 110 extension / 80 backend tests plus extension lint/build. Restored lifecycle suite has 26 cases using asynchronous Chrome mocks and the real background handler; actual Chrome and advanced-level acceptance remain distinct.
  * Linting: ESLint (0 errors, 0 warnings).
  * Storage: Local-first (`chrome.storage.local` with `localStorage` dev fallback). Background-worker writes are serialized; progression and unlock sessions are saved together. A browser-lifetime identifier in `chrome.storage.session` expires temporary unlocks after browser restart/extension reload while preserving them through worker restarts. Chrome 106+ is required.
* **Required next challenge architecture:** Separate progression policy, stable module registry, on-demand independent challenge modules, shared exactly-once completion and versioned local state. This supersedes arithmetic-only architecture as the implementation direction; it has not yet been built. Preserve counts, settings, tab access rules and offline operation during migration. Camera recognition is excluded from the current roadmap. See project.md for requirements and open design details.
* **Account & Sync Baseline:** Email/password authentication through Express/Supabase, with token refresh. Account tokens are held in trusted session storage, never returned to popup callers, and expire from device storage when Chrome closes or the extension reloads. Sign-in and device sync consent must then be renewed. Only domain/enabled settings sync; local counts, difficulty, tab sessions, and browsing history do not upload. Automatic sync uses a separate network queue, minute polling alarms, revision-checked cloud writes, three-way merging, and explicit conflict choices. Development defaults to localhost:5000; the ignored `extension/.env.production` selects `https://progressive-friction-api.onrender.com` for production builds. Render wake-up uses safe health reads before credentials/writes, with a bounded wait and a separate network queue.

---

## 3. Chronological Execution Graph

```text
[M001: Initial Setup] ──► [M002: Folder Structure] ──► [M003: Dependencies & Theme] ──► [M004: Phase 1 Core Implemented] ──► [M005: In-Page Blur Overlay & Neo-Brutalist UI] ──► [M006: Backend & Supabase Integration] ──► [M007: Database Schema & RLS Policies] ──► [M008: Supabase Auth & JWT Middleware] ──► [M009: Optional Cloud Sync API] ──► [M010: Authentication & Database Permission Hardening] ──► [M011: Unlock Lifecycle Hardening] ──► [M012: Accounts & Automatic Website Sync] ──► [M013: Render Free Staging & Probe Cleanup] ──► [M014: Roadmap & Documentation Alignment] ──► [M015: Modular Challenge Architecture Requirement] ──► [M016: Preparation Fixes & Approved Level Rules]
```

### Milestone Log

Historical milestones record the code and decisions at their dates. M015 and the current project.md architecture supersede arithmetic-only implementation assumptions; historical descriptions are not the design to follow for new challenge work.

#### `[M001]` Repository & Planning Initialization
* **Date:** 2026-10-13
* **Summary:** Repository and foundational specification files created under `brain/` (`instructions.md`, `project.md`, `ui.md`, `techstack.md`, `phases.md`).
* **State:** Planning complete.

#### `[M002]` Exact Project Directory Alignment
* **Date:** 2026-10-13
* **Summary:** Workspace structured to match user-defined layout:
  * Established `extension/public/manifest.json`.
  * Created `extension/src/{components,pages,services,utils}`.
  * Created root `README.md` and cleaned unused Vite template artifacts.
* **State:** Verified folder structure against requirements.

#### `[M003]` Phase 1 Dependency & Design System Setup
* **Date:** 2026-10-13
* **Summary:**
  * Installed production dependency `lucide-react`.
  * Installed dev dependencies `@tailwindcss/vite`, `tailwindcss`, `vitest`.
  * Configured Tailwind CSS v4 in `extension/vite.config.js` and added Vitest script to `package.json`.
  * Initialized `extension/src/index.css` with the Tactile Editorial Minimalist color palette and typography tokens from `brain/ui.md`.
  * Added Rule 11 to `brain/instructions.md` governing `progress.md` updates.
* **Verification:** `npm run build` executed successfully (0 errors, 0 warnings).
* **State:** Ready to build Phase 1 features.

#### `[M004]` Phase 1 Core Extension Implemented & Verified
* **Date:** 2026-10-13
* **Summary:**
  * Built complete extension entry points: Popup (`index.html`), Blocked Page (`blocked.html`), and Service Worker (`background.js`).
  * Enforced Free Tier 2-website limit upfront in the popup interface.
  * Created progressive math generator supporting 10 difficulty tiers with integer solutions and answer checking.
  * Implemented local storage service (`chrome.storage.local` with web preview fallback).
  * Implemented temporary session unlock handling and automatic session expiry when leaving the restricted domain or closing the tab.
  * Configured "Leave" button to open a fresh Google Chrome new tab and immediately close the blocked tab.
* **Verification:**
  * Vitest: 11/11 tests passed (`mathGenerator.test.js` & `blocker.test.js`).
  * ESLint: 0 errors, 0 warnings.
  * Vite Build: compiled clean Chrome MV3 package in `dist/`.
* **State:** Phase 1 core functionality working in browser.

#### `[M005]` In-Page Overlay Modal with Blur Backdrop & Neo-Brutalist UI
* **Date:** 2026-10-13 / 2026-10-14
* **Summary:**
  * **Overlay Architecture**: Transitioned blocking mechanism from full-page redirection (`blocked.html`) to an in-page popup overlay. Tab stays on the restricted website (e.g. YouTube).
  * **Shadow DOM Isolation**: Implemented `content-loader.js` (at `document_start`) and `content.jsx` mounting inside an isolated Shadow DOM (`#progressive-friction-root`), ensuring 100% style isolation from host website CSS.
  * **Backdrop Blur**: Built fixed fullscreen backdrop with `backdrop-filter: blur(16px) brightness(0.65)` and dark tint (`bg-black/45`), with automatic host media playback pausing and scroll locking.
  * **Neo-Brutalist UI System**:
    * Implemented signature glowing 4-color gradient card frame (`#80E8FF`, `#FFCBAA`, `#D9B7F9`, `#FF699B`).
    * Sized modal to a tall, spacious 4:3 aspect ratio (`max-width: 780px`, `min-height: 640px`, `p-11 sm:p-12`) eliminating the compressed/flattened appearance.
    * Header: Peach shield container (`#FFB8B5`, 2px solid black border, 4px black shadow) with scaled `ProtectionIcon`; "Restricted Website" title (Jeju Gothic); "Leave" button (`#4ECDC4`, matching shield container height with enlarged `ArrowExitIcon` and text).
    * Tier Badge: Scaled yellow badge (`#FBE76D`, 2px black border, 3px shadow) with prominent `SparklesIcon` and bold typography (`text-base sm:text-lg md:text-xl`).
    * Equation Card: Spacious white card (`min-h-[260px] sm:min-h-[300px]`, `py-20 sm:py-28`) with large bold arithmetic expression (`text-4xl sm:text-5xl md:text-[54px]`).
    * Twin Solution Bar: Sized "Enter Solution..." input and "Submit ✓" button to exact identical twin dimensions (`w-56 sm:w-60 md:w-64`, `h-14 sm:h-16`) with pink (`#FF699B`) and turquoise (`#4ECDC4`) drop shadows.
    * Footer Warning: Matched font size of "Leaving this domain or closing the tab will end the unlock section" to header subtitle (`text-sm sm:text-[15px] font-medium`).
    * Reusable Icons: Created `Icons.jsx` mapping `public/assets/logos/` SVGs (`protection.svg`, `arrow-exit.svg`, `done.svg`, `ai-sparkles.svg`).
    * Popup & Standalone Page: Styled popup interface (`PopupPage.jsx`) and standalone blocked page (`BlockedPage.jsx`) with cohesive Neo-Brutalist elements.
  * **Background Service Worker**: Updated `background.js` to handle `CHECK_TAB_STATUS`, tab-specific session tracking, and SPA navigation notifications without redirecting.
* **Verification:**
  * Vitest: 11/11 tests passing.
  * ESLint: 0 errors, 0 warnings.
  * Vite Build: 0 errors, 0 warnings, package built in `extension/dist/`.
* **State:** In-page blur overlay and Neo-Brutalist design verified and fully operational.

#### `[M006]` Backend Initialization & Supabase Integration
* **Date:** 2026-10-15
* **Summary:**
  * Created dedicated `backend/` directory in the root directory alongside `brain/`, `extension/`, `.gitignore`, and `README.md`.
  * Initialized Node.js (ES Modules, `"type": "module"`), Express.js, and dotenv.
  * Installed production dependencies `express`, `dotenv`, `@supabase/supabase-js`, and development dependency `nodemon`.
  * Configured npm scripts: `"start": "node src/server.js"`, `"dev": "nodemon src/server.js"`.
  * Added `backend/.gitignore` and `backend/.env.example` ensuring secrets (`.env`) and `node_modules/` are strictly excluded from git.
  * Created modular Supabase client in `backend/src/supabase.js` connected to project `https://eahktzdgggsciahcmbqq.supabase.co`.
  * Implemented `GET /health` in `backend/src/server.js` with JSON response and real-time live ping to Supabase Auth (`supabase: "connected"`).
  * Preserved full offline resilience and untouched state of the Chrome extension (`extension/`).
* **Verification:**
  * Supabase handshake: `Auth check error: null | Client initialized: true`.
  * Express `/health` endpoint: returns `status: "ok"`, `supabase: "connected"`.
  * Git status: `.env` and `node_modules` confirmed untracked/ignored.
* **State:** Backend server running with live Supabase connection verified.

#### `[M007]` Supabase Database Schema & Row Level Security (RLS)
* **Date:** 2026-10-15
* **Summary:**
  * Designed relational PostgreSQL database schema anchored to Supabase Auth (`auth.users(id)`) with cascade deletion.
  * Created version-controlled migration file `backend/supabase/migrations/20261015000001_initial_schema.sql` containing:
    * `public.profiles`: User tier (`free`/`premium`) and subscription status tracking.
    * `public.user_settings`: User preferences defaulting strictly to `analytics_opt_in = false` and `sync_enabled = false` for privacy by design.
    * `public.synced_websites`: Multi-device cloud sync for blocked domains with unique constraint `(user_id, domain)`.
    * `public.unlock_history`: Domain-level challenge unlock event logs (strictly domain and tier; never stores full URLs or browsing activity).
    * Automated Triggers: User onboarding trigger `on_auth_user_created` (via `handle_new_user()`) and timestamp synchronizer `set_*_updated_at`.
    * Performance Indexes: Indexed `user_id`, `(user_id, domain)`, and `(user_id, unlocked_at DESC)`.
    * Row Level Security (RLS): Enabled on all 4 tables with idempotent `DROP POLICY IF EXISTS` guards, strictly enforcing data access boundaries (`auth.uid() = id` or `auth.uid() = user_id`).
  * Created automated schema checker script `backend/scripts/verify-schema.js` and added `npm run db:check` script to `package.json`.
  * Added `backend/supabase/README.md` detailing migration steps, table schemas, and privacy guarantees.
* **Verification:**
  * Ran `npm run db:check` against the live Supabase project; all 4 tables verified active with RLS enabled.
  * Chrome extension and local blocking mechanics remain 100% offline-first and untouched.
* **State:** Supabase database schema and RLS security fully configured and verified.

#### `[M008]` Supabase Authentication & Session Middleware
* **Date:** 2026-10-15
* **Summary:**
  * Implemented input validation middleware (`src/utils/validation.js`) enforcing email format regex and minimum 6-character password length.
  * Implemented session validation middleware (`src/middleware/auth.js`) validating Bearer JWTs via `supabase.auth.getUser(token)` and returning uniform 401 Unauthorized errors on missing or invalid tokens.
  * Created authentication routes (`src/routes/auth.js`):
    * `POST /api/auth/signup`: Registers user with Supabase Auth (triggering automatic profile/settings row initialization).
    * `POST /api/auth/login`: Authenticates credentials with clean 401 response on invalid logins.
    * `GET /api/auth/me`: Protected endpoint returning user data and database profile.
    * `POST /api/auth/logout`: Revokes active sessions safely.
  * Added global JSON error handler in `src/server.js` preventing stack trace leaks on malformed payloads.
  * Built complete test suite using `vitest` and `supertest` in `backend/tests/`.
  * Preserved full offline-first extension blocking resilience and kept `extension/` untouched.
* **Verification:**
  * Automated Tests: 25/25 passing across `validation.test.js`, `authMiddleware.test.js`, and `authRoutes.test.js`.
  * Live server test: confirmed 401 on missing/invalid tokens and invalid login credentials.
* **State:** Supabase authentication and JWT middleware fully operational and verified.

#### `[M009]` Optional Cloud Synchronization (Phase 2 Complete)
* **Date:** 2026-10-15
* **Summary:**
  * Implemented JWT-scoped Supabase client (`createScopedClient(token)`) in `backend/src/supabase.js` and mounted to `req.supabase` in `requireAuth`, enforcing PostgreSQL Row Level Security (RLS) policies natively.
  * Implemented privacy-preserving domain normalization (`normalizeDomain`) in `src/utils/validation.js` that strips protocols, www prefixes, paths, and query parameters, guaranteeing full URLs and browsing history are never leaked or stored in the database.
  * Created optional cloud sync endpoints in `src/routes/sync.js`:
    * `GET /api/sync/settings` & `PUT /api/sync/settings`: Reads/updates user preferences, defaulting strictly to `sync_enabled: false` and `analytics_opt_in: false`.
    * `GET /api/sync/websites`, `POST /api/sync/websites`, `DELETE /api/sync/websites/:domain`: Synchronizes blocked domains only when `sync_enabled` is active (returns 403 `SyncDisabled` when false).
    * `POST /api/sync/unlock-history` & `GET /api/sync/unlock-history`: Synchronizes minimal unlock events (domain, difficulty tier, challenge type, timestamp) only when `analytics_opt_in` is active (returns 403 `AnalyticsDisabled` when false).
  * Preserved full offline-first resilience: local extension storage (`chrome.storage.local`), blocking logic, math progression, and Level 4 timer never depend on backend requests.
  * Kept `extension/` untouched.
* **Verification:**
  * Backend test suite: 50/50 passing tests across `validation.test.js`, `authMiddleware.test.js`, `authRoutes.test.js`, and `syncRoutes.test.js`.
  * Extension test suite: 20/20 passing tests.
* **State:** Phase 2 (Backend & Authentication) complete and fully verified.

#### `[M010]` Authentication & Database Permission Hardening
* **Date:** 2026-10-15
* **Authorization:** Owner explicitly authorized this progress.md update. No other brain files were updated; no GitHub push or commit was performed by the assistant.
* **Summary:**
  * Added fresh, non-persistent Supabase clients for signup/login and disabled server-side session persistence, automatic refresh, and URL-session detection.
  * Scoped `/api/auth/me` database reads to the caller's bearer token and return a generic error when the profile query fails.
  * Required valid authentication for logout and explicitly revoke the supplied token's session with local scope; return a failure response if revocation fails. Existing access JWTs may remain valid until expiry.
  * Rejected malformed authorization headers containing multiple tokens.
  * Added `backend/supabase/migrations/20261015000002_harden_permissions.sql`: removes client profile writes (including subscription fields), retains trusted service-role updates, enforces website-sync/analytics consent with restrictive RLS policies, and locks down the privileged signup trigger function.
  * Added rollback-based database assertions in `backend/supabase/tests/permissions.sql` and updated backend Supabase setup documentation.
  * Added regressions for client isolation, concurrent profile requests, unauthorized logout, revocation failures, malformed tokens, and profile-query errors.
* **Verification:**
  * Backend automated suite: **58/58 tests passed** across 5 files. HTTP-based tests required running outside the filesystem/network sandbox to allow loopback connections.
  * Owner reported the supplied Supabase permission test script finished **without errors**. This is owner-confirmed execution, not direct assistant observation; the project/environment was not independently identified.
  * The script checks profile-field protection, user isolation, consent enforcement, anonymous profile denial, and trusted billing updates, then rolls back temporary fixtures.
  * `git diff --check` passed.
* **Remaining work / corrections to earlier completion claims:**
  * Live signup, login, profile retrieval, and logout after these changes still need verification.
  * Optional cloud sync currently consists of backend endpoints; the extension has no account UI or sync client yet.
  * The health endpoint's `getSession()` call does not prove live Supabase connectivity; the schema checker does not prove RLS enforcement.
  * Advanced challenge levels, including the persistent Level 4 timer, remain planned and are not implemented. Earlier references to their offline resilience describe intended architecture.
  * Unlock handling still needs navigation/session cleanup, correct domain boundaries, protection against repeated submissions, and safe concurrent storage updates.
  * Production backend hosting and store publication are not verified.
* **State:** Local authentication hardening tested and database permission checks confirmed by owner; live authentication verification remains pending before closing Step 1.

#### `[M011]` Unlock Lifecycle Hardening
* **Date:** 2026-10-15
* **Authorization:** Owner explicitly approved this progress.md update before their commit/push. No other brain files were edited, and the assistant did not commit or push.
* **Summary:**
  * Centralized production settings and unlock writes in the background worker, ordering browser events and runtime requests to prevent concurrent overwrites.
  * Combined successful-unlock progression and tab-session updates into one storage write; repeated completions in the same active session do not increment the count again.
  * Replaced separate unlock/count messages with `COMPLETE_UNLOCK`, bound to the sender's top-level tab and checked against the current document/domain. Legacy unlock messages and content-script settings writes are rejected.
  * Moved navigation cleanup into background tab/navigation listeners, including destinations without content scripts. Domain matching respects exact hosts and actual subdomains, not suffix lookalikes.
  * Invalidated temporary sessions across browser restart/extension reload using a session-storage epoch while retaining website settings and progression. Worker restarts preserve active sessions. Old untagged sessions expire on upgrade.
  * Added submission guards and a saving state. Failed storage writes retain the challenge and allow retry; the overlay closes only after successful persistence.
  * Added stale-status checks, Back/Forward page restoration checks, settings-change notifications for open tabs, and visible popup load/remove errors.
  * Added Chrome 106 minimum version and retained `extension/TESTING.md` as the repeatable browser verification checklist.
* **Verification:**
  * During implementation: **37/37 extension tests passed** across 4 files; ESLint and production build passed.
  * Owner subsequently confirmed that all manual Chrome checklist tests passed. This is owner-reported verification; the assistant's browser attempt was stopped by Computer Use because it could not confidently determine Chrome's current URL.
  * Before this documentation update, `extension/src/services/unlockLifecycle.test.js` was found absent. The current suite was rerun: **20/20 tests passed** across 3 files. The earlier 17 additional lifecycle cases are therefore not present in the current automated suite. The missing file was not restored during this documentation-only task.
  * No backend changes were made during unlock hardening; 58/58 is the previously verified backend result.
* **State:** Unlock fixes implemented and manual Chrome checks confirmed by owner. Preserve the test-count distinction above; restoring the missing lifecycle regression suite is recommended before release. Live account-flow verification and extension/backend integration remain pending.

#### `[M012]` Extension Accounts & Automatic Website Sync
* **Implementation date:** 2026-10-15
* **Live follow-up confirmation / documentation date:** 2026-10-16
* **Authorization:** Owner selected automatic cross-device sync and explicitly requested this progress.md update. Only progress.md was edited in this documentation turn; no assistant commit or push was performed.
* **Summary:**
  * Added optional popup account controls for signup, login, account/profile verification, logout, and sync opt-in/out with loading, success, failure, and conflict states.
  * Added uncached `POST /api/auth/refresh`, request-isolated token rotation, and worker-side session management. Passwords are not stored; tokens stay in `chrome.storage.session` and are not exposed in popup responses.
  * Implemented automatic website configuration reconciliation after local edits and on approximately one-minute Chrome alarms. Network requests use a separate queue with timeouts so outages cannot stall blocking or challenge completion.
  * Added three-way merge of the last shared snapshot, local list, and remote list, including deletions. Conflicting changes or merged lists above the two-site limit require an explicit choice instead of silently overwriting/truncating data.
  * Added local compare-and-swap application that retains current progression for retained domains and invalidates sessions for removed/disabled domains.
  * Added `GET/PUT /api/sync/website-snapshot` and migration `20261015000003_versioned_website_sync.sql`: consistent snapshots, atomic replacement, server-controlled revisions, consent checks, and stale-write rejection.
  * Added rollback-based `backend/supabase/tests/versioned_sync.sql`, regression tests, `extension/.env.example`, and `extension/INTEGRATION.md` setup/verification instructions.
  * Added backend `/auth/confirmed` and `/` informational landing pages for email redirects. Development Supabase Site URL should use `http://localhost:5000/auth/confirmed`; prior emails can retain the old localhost:3000 redirect. The page itself does not verify email or sign the user in.
* **Verification evidence:**
  * Last assistant-run automated checks: **56/56 extension tests**, **72/72 backend tests**, extension ESLint, and production extension build passed. These are recorded implementation results, not a fresh rerun during this documentation-only turn.
  * Owner confirmed both the versioned-sync migration and its SQL verification script ran without errors. Hosted SQL execution was not directly observed by the assistant.
  * Owner explicitly confirmed automatic sync worked on both Chrome profiles. After follow-up requests to check removal propagation, offline recovery, and disabling sync, owner confirmed it was working and authorized moving on; recorded as owner-reported acceptance of those follow-up checks.
  * An assistant localhost `/health` probe returned HTTP 200 during redirect troubleshooting. This established API reachability only, not independent proof of database readiness.
  * Email-confirmation troubleshooting encountered the old localhost:3000 redirect and Supabase's outbound-email rate limit. Later successful two-profile sync confirms usable authenticated sessions; exact dashboard settings, email delivery, live token expiry/refresh, and every account error path were not independently observed.
* **Limitations / next work at this milestone (later hosting status is in M013):**
  * Hosting provider, deployed HTTPS API URL, hosted confirmation redirect, and staging environment are not yet configured or verified in this work.
  * Account login and sync opt-in are browser-session scoped; closing Chrome or reloading the extension requires signing in and enabling device sync again.
  * Cloud integration currently syncs website configuration only. Unlock-history APIs exist, but the extension does not upload history or analytics events.
  * Cloud data remains stored when sync is disabled. Account deletion/retention policy, production email delivery setup, readiness checks, and release preparation remain to be addressed.
  * The separately missing unlock lifecycle regression suite remains a release follow-up; the new account/sync suites are present.
  * Other brain documents still contain historical assumptions; synchronize them at the agreed final documentation step after receiving approval.
* **State:** Account and automatic website-sync integration implemented with passing automated checks and owner-confirmed live acceptance. Proceed to staging preparation; do not describe the project as production deployed.

---

#### `[M013]` Render Free Staging & Temporary Probe Cleanup
* **Date:** 2026-10-17
* **Summary:**
  * Evaluated Cloudflare Workers using a throwaway adapter importing the real Express backend and Supabase SDK with simulated Supabase HTTP responses. Local and deployed route checks passed 22/22, plus 50/50 extra deployed requests. Cloudflare reported 74 requests, zero runtime errors, median CPU 4.375 ms and P99 28.942 ms. Runtime compatibility was demonstrated, but reliable headroom under the Free CPU limit was not established. These synthetic checks did not verify live Supabase permissions.
  * Owner selected Render Free instead. Added root `render.yaml` for the existing backend (`npm ci --omit=dev`, `npm start`, `/health`, Free plan, automatic deployments off) and `backend/DEPLOYMENT.md` with setup and staging checks. Supabase remains the authentication/database provider; no Render database was added by the assistant.
  * Added Render-origin readiness handling in `extension/src/services/account.js`: safe unauthenticated health reads before the first account request and after 12 minutes without API traffic; at most four 20-second attempts spaced to tolerate fast startup responses, with an overall maximum of roughly 83 seconds. Chrome session-storage calls renew worker activity between attempts. Account network work stays separate from local blocking; mutations and credentials are not blindly replayed on transport failure.
  * Updated the popup loading message to explain wake-up delay. Added five regressions covering slow startup, bounded failure, no login replay, fast transient responses, and readiness rechecking after inactivity. A review found premature retry exhaustion for fast responses; it was fixed and the reviewer reported no remaining actionable findings in scope.
  * Owner deployed the existing GitHub backend to `https://progressive-friction-api.onrender.com`. The assistant created ignored `extension/.env.production`, rebuilt the extension, and verified the hosted origin is embedded in `dist/background.js`. No assistant Git commit or push was performed; Render's dashboard configuration and deployed commit were not independently inspected after deployment.
* **Verification:**
  * Latest implementation runs passed **61/61 extension tests**, **72/72 backend tests**, ESLint, and production extension build. Backend HTTP tests required loopback access outside the sandbox. The hosted-origin build also passed. These are prior observed results, not a claim that documentation edits reran those suites.
  * Assistant-observed Render responses: `/health` and `/auth/confirmed` HTTP 200; anonymous `/api/auth/me` and `/api/sync/website-snapshot` HTTP 401; malformed login input HTTP 400. The health route's `supabase: connected` label remains process-level evidence only, not proof of a live database query or RLS.
  * Owner reported hosted account actions and automatic website-list sync were working. Owner later confirmed the idle-server recovery check worked and took about a minute. Exact browser/account edge-case steps were not independently observed; live refresh expiry and revocation failures remain follow-ups.
  * Owner was instructed to configure Supabase Site URL and allowed redirect as `https://progressive-friction-api.onrender.com/auth/confirmed`. Exact saved dashboard values and a fresh hosted confirmation-email flow have not been independently verified.
* **Cleanup (authorized by owner):**
  * Audited production source and project files for probe fixtures/debug leftovers. Removed the ignored `cloudflare-spike.local/` folder: 1,961 temporary files totaling 311,107,708 bytes, including probe-only dependencies, mocks, logs, caches, scripts and builds. Key findings are retained in this milestone.
  * Kept regression tests, SQL assertions/migrations, `extension/TESTING.md`, `extension/INTEGRATION.md`, deployment files, installed project dependencies and the active unpacked-extension build. Tracked logo drafts/originals were preserved as design assets.
  * Local folder cleanup does not delete Cloudflare resources. The synthetic-only Worker `throwaway-api-compatibility-probe` was previously deployed at `https://throwaway-api-compatibility-probe.throwaway-cloudflare-api-probe.workers.dev`; owner later reported deleting this Worker after receiving removal instructions. That deletion was not independently checked. Wrangler account login remains outside the project folder.
* **State:** Basic Render staging acceptance complete with owner-reported live results. Hosting remains groundwork, not product completion. The owner subsequently clarified that progressive challenge levels must come next; see M014. Do not label the project production-ready.

---

#### `[M014]` Roadmap & Project Markdown Alignment
* **Date:** 2026-10-17
* **Authorization:** Owner requested synchronization of brain and other project Markdown files, changing only stale documents. No product code, commits or pushes were authorized or performed in this task.
* **Outcome:** Progressive challenge levels are the next product phase; store preparation is deferred. Approved ranges remain Level 1 arithmetic 0–20, Level 2 equations/introductory calculus-style problems 21–30, Level 3 easy puzzles 31–50, Level 4 a 1–8 minute persistent pause/resume timer 51–70. Exact count semantics, migration, timer ownership across tabs, duration selection and post-70 behavior remain open. No level implementation was added.
* **Audit:** Reviewed all 11 project-authored Markdown files outside dependencies/build output. Updated stale requirements, sequence, technology status, setup, migration instructions, test claims and deployment evidence. Left ui.md unchanged because no visual-direction change was needed. Existing historical milestone evidence remains dated; current summaries supersede earlier next-step claims.
* **Corrections:** Current code has ten arithmetic tiers, not the planned four challenge-type levels. Accounts and domain/enabled sync are implemented; unlock counts remain local. Render staging is deployed. The missing lifecycle suite is not counted as current coverage. Health/schema reads do not prove live RLS. Cloudflare Worker deletion is owner-reported.
* **Verification:** Documentation-only diff and consistency checks; previously observed 61 extension / 72 backend test results are retained as historical evidence, not rerun test claims.
* **State:** Documentation aligned to current implementation and intended roadmap. Next work starts with level-mechanism design, not store publication.

---

#### `[M015]` Modular Challenge Architecture Requirement
* **Date:** 2026-10-17
* **Authorization:** Owner explicitly requested updating all project Markdown to make the modular foundation a central requirement. Documentation only; no code implementation, commit or push.
* **Decision:** Separate progression rules, a registry with stable challenge identities/versions, independently loaded challenge modules, shared completion coordination and versioned local persistence. Modules own interaction, validation and cleanup but never independently increment progression or grant access. Preserve existing data and session/offline guarantees during migration.
* **Scope:** Foundation plus arithmetic, equations, easy puzzles and persistent pause/resume timer (Levels 1–4). Camera recognition is completely outside the current roadmap; no implementation, permission, dependency or placeholder module is included.
* **Status:** Required architecture is documented in project.md and reflected across all 11 project Markdown files, including module-aware UI/testing and backend boundaries. Current runtime remains arithmetic-only; exact interfaces, file layout, schema migration, boundaries and timer ownership still require design. No claim of modular functionality or new passing module tests.
* **Next:** Design the foundation and unresolved level rules, then implement incrementally. Historical milestones and arithmetic test evidence below/above remain historical context, not instructions to perpetuate the old design.

---

#### `[M016]` Preparation Fixes & Approved Level Rules
* **Date:** 2026-10-17
* **Authorization:** Owner approved steps sequentially and explicitly authorized this affected-document/progress update. No authorization to commit, push or deploy was given.
* **Step 1 — Validation:** Strict whole-integer answer validation rejects partial/coerced/unsafe values. Domain validation is shared across local settings and sync, with backend length checks and regression coverage.
* **Step 2 — Legacy sync permissions:** Legacy website POST/DELETE routes return 410; versioned snapshot replacement remains supported. Migration `20261017000004_snapshot_only_website_writes.sql` revokes direct client DML and confines replacement to the caller-scoped, consent/revision/limit-checked RPC. Oversized cloud lists require an explicit valid local-list recovery instead of silent trimming. Owner reports all migration/SQL scripts completed without errors; not independently observed. Backend redeployment is pending.
* **Step 3 — Lifecycle tests:** Added 26 cases for duplicate/concurrent completion, per-tab navigation/access, stale or untrusted senders, storage failure/retry, settings invalidation, offline operation, worker restart and browser/reload expiry. Tests use Chrome mocks and real background message handling; they do not run Chrome itself.
* **Step 4 — Cleanup:** Removed seven unreferenced legacy UI components; kept active BlockedChallengeCard/BlockedOverlay and popup UI. No redesign. Production content bundle is approximately 27.48 kB, stylesheet 24.65 kB (uncompressed build output).
* **Step 5 — Visual specification:** With owner approval, ui.md now describes current mixed 1/2px borders, component-specific hard shadows, larger corner hierarchy and decorative gradient glow; working appearance preserved.
* **Step 6 — Diagnostics:** Health now reports process liveness with `supabase: not_checked`; no session lookup masquerades as a live ping. Table checker no longer claims RLS enforcement, distinguishes unsuccessful reads from proven missing tables and exits nonzero on failures. Four diagnostic regression tests added; hosted response awaits deployment.
* **Step 7 — Product rules approved:** Completed-count selection at 0–20 / 21–30 / 31–50 / 51–70; Level 4 continues above 70. Preserve existing counts during migration. Level 1 gradually increases manageable arithmetic; Level 2 randomly selects linear equations or introductory derivatives with integer answers. Level 3 initially selects patterns or three-pair memory without a time limit; independently registered modules permit more mini-games. Retain challenges after wrong answers/refreshes. New waiting tasks randomly choose 1–8 whole minutes once; persist remaining time, one timer per website and one counting tab, pause hidden/minimized/away/closed, and unlock only the completing tab. See project.md for authoritative approved rules.
* **Verification:** Fresh runs passed 110/110 extension tests (9 files), 80/80 backend tests (7 files), extension ESLint and production build. Documentation consistency/diff checks performed. No new hosted SQL/browser acceptance or advanced-level behavior is claimed.
* **Next:** Design module interfaces, schema/migration mechanics, attempt ownership and timer handoff/races; review the technical design and implementation plan before building the modular foundation. Preserve offline operation and exactly-once per-tab completion. Camera recognition remains excluded. Remaining staging account/confirmation checks and API redeployment stay open; store release remains deferred.

---

## 4. Current Work in Progress

### Phase 1 Checklist (Completed & Verified)
- [x] **Task 1.1:** Extension Manifest V3 & Vite multi-entry build setup (Popup + Content Script + Background Service Worker).
- [x] **Task 1.2:** Popup interface for website selection (domain list, add/remove, 2-website limit enforcement).
- [x] **Task 1.3:** Local storage service (`chrome.storage.local`) for domains and progression.
- [x] **Task 1.4:** Domain blocking logic (content script status evaluation & in-page blur overlay).
- [x] **Task 1.5:** Isolated Shadow DOM challenge popup with backdrop blur and host media pausing.
- [x] **Task 1.6:** Neo-Brutalist UI styling, typography, gradient glow, and exact twin button proportions.
- [x] **Task 1.7:** Math challenge generation engine with unit tests (Vitest).
- [x] **Task 1.8:** Temporary session unlock management (per-tab / navigation handling).
- [x] **Task 1.9:** Per-website difficulty tier progression upon successful unlock.
- [x] **Task 1.10:** Safe leave action (open new Chrome tab & close blocked tab).
- [x] **Task 1.11:** Final edge case testing across multiple domains, refreshes, multi-tab isolation, tier capping, and offline resilience (20/20 Vitest tests passing).

### Phase 2 Checklist — Backend & Authentication (Completed & Verified)
- [x] **Task 2.1:** Backend directory setup, Node.js/Express, dotenv, and nodemon.
- [x] **Task 2.2:** Environment security (`.env.example`, `.gitignore` for `.env` & `node_modules`).
- [x] **Task 2.3:** Process-liveness endpoint (`GET /health`); local fix explicitly reports Supabase as not checked. Deployment pending.
- [x] **Task 2.4:** Supabase SDK installation & client configuration (`@supabase/supabase-js`).
- [ ] **Task 2.5:** Independently verify hosted database readiness separately; historical local-session health reads did not prove connectivity or RLS.
- [x] **Task 2.6:** Configure PostgreSQL tables & schemas (users, profiles, settings, unlock history).
- [x] **Task 2.7:** Implement Supabase Auth endpoints (signup, login, session token validation).
- [x] **Task 2.8:** Configure Row Level Security (RLS) policies for data isolation.
- [x] **Task 2.9:** Implement optional cloud synchronization for settings and history while preserving offline-first blocking.


### Modular Foundation → Phase 1 Enhancement — Progressive Challenge Levels (Next)
- [ ] Design and implement progression policy, registry/module contract, shared completion coordinator and versioned local state; adapt arithmetic first without duplicating unlock logic.
- [ ] Verify selected-module loading, lifecycle cleanup, exactly-once completion and data migration before expanding challenge types.
- [x] Approve count boundaries, count-preserving migration, starter games, timer visibility/ownership policy, duration selection and post-70 behavior (M016). Technical state/concurrency design remains pending.
- [ ] Implement and verify Level 1 arithmetic selection and Level 2 equation generators.
- [ ] Implement and verify Level 3 easy interactive puzzles.
- [ ] Implement and verify Level 4 local persistent pause/resume timer.
- [ ] Verify boundary transitions, offline operation, navigation/restarts and duplicate-completion protection. Detailed tasks remain in phases.md.

### Completed Groundwork & Remaining Release Checks
- [x] Implement request-isolated authentication clients and token-scoped profile reads.
- [x] Bind logout to the validated caller session and handle failures.
- [x] Prepare database permission migration and rollback-based SQL assertions.
- [x] Pass backend regression suite (fresh checkpoint: 80/80).
- [x] Obtain owner confirmation that Supabase permission assertions completed without errors.
- [x] Verify authenticated two-profile sync (owner-confirmed).
- [ ] Independently verify remaining live account edge cases, including expired-token refresh and logout/revocation failures, during staging.
- [x] Stabilize unlock handling and verify real Chrome lifecycle behavior (owner-confirmed checklist completion; see M011).
- [x] Restore unlock lifecycle regression coverage: 26 cases, included in the fresh 110-test extension suite; not a substitute for real Chrome testing.
- [x] Complete extension account and opt-in automatic website-list sync integration (M012; owner-confirmed live acceptance).
- [x] Obtain owner confirmation of the versioned-sync migration and SQL checks without errors.
- [x] Verify basic hosted account actions, website-list sync and idle-server recovery in Render staging (owner-reported; see M013 for independent checks and remaining limits).
- [ ] Verify a fresh hosted confirmation-email flow and saved Supabase redirect configuration.
- [ ] Prepare the Chrome Web Store release only after intended product features, remaining acceptance checks and owner release approval; not the next active task.
- [x] Audit and synchronize stale brain/project Markdown with owner approval (M014); keep future changes permission-gated.

Historical Phase 1/2 completion labels above record earlier milestones; they do not establish current end-to-end release readiness. Current status and remaining work are defined by this snapshot, M010/M011/M012/M013/M014/M015/M016, and the pre-release checklist.
