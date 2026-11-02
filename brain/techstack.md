# Tech Stack — Progressive Website Blocker

## 1. Project Overview

Development (`dist-dev`) runs four rotating challenge types at all four levels. The friends’ preview (`dist-preview`) retains the earlier Levels 1–3 and reports Level 4 unavailable; production (`dist`) retains legacy arithmetic. See progress.md M024 for the implementation and verification checkpoint.

The Chrome extension requires deliberate effort before access to chosen sites and scales that effort by the site's successful unlock count.

The application will be developed in phases, beginning with a fully functional local Chrome extension and gradually introducing authentication, cloud synchronization, subscriptions, analytics, and signature features.

**Core principles:**
- Build a functional, lightweight Chrome extension first.
- Prefer free and open-source tools where practical.
- Keep the core blocking experience independent of the backend.
- Use secure, maintainable, and modular architecture.
- Minimize unnecessary collection of browsing data.
- Avoid adding dependencies or services without a clear purpose.

---

## Required challenge module structure

See [project.md](project.md#required-modular-challenge-architecture) for the authoritative requirement. The React/JavaScript implementation must separate count-to-level policy, a stable module registry, on-demand challenge components/validators, one shared completion coordinator and versioned local state. Keep the background writer responsible for progression and access persistence; modules never mutate those records directly. The existing arithmetic generator/UI are the pre-migration baseline, not the architecture to copy for each new game.

Development selects redesignCatalog.js, redesignRegistry.js (lazy browser views) and redesignWorker.js (statically imported models) through build-time aliases. The previous registries remain for the friends’ preview. services/challenges.js owns completion; challengeState.js migrates local attempts and retains compatible memory boards. No new dependency, permission or backend is required.

## 2. Frontend Technologies

### React.js
**Purpose:** Build reusable, interactive user interfaces.

**Used for:**
- Extension popup.
- Website management interface.
- Blocked-page experience.
- Shared challenge shell and four accessible puzzle views.
- Unlock and progression feedback.
- Voluntary disable-flow modal and motivational sequence.

**Phase:** 1–5

### Next.js (Planned)
**Purpose:** Framework for companion web dashboard.

**Used for:**
- Web-based user account and subscription management dashboard.
- Analytics visualization and focus trends.
- Cross-device settings review.

**Phase:** 4

### JavaScript (ES Modules)
**Purpose:** Primary programming language for the application.

**Used for:**
- Extension logic.
- Local generators, solvers and validators for all redesigned levels.
- Website and session management.
- API communication.
- Frontend interactions.

**Phase:** 1–5

### HTML5 Video & Media Handling
**Purpose:** Display local motivational media sequences.

**Used for:**
- Voluntary in-extension flow before disabling the extension (e.g., motivational anime video sequence).
- Licensed or original static video/audio asset playback bundled within the extension.

**Phase:** 5 (and voluntary extension flow)

### Vite
**Purpose:** Frontend development server and production build tool.

**Used for:**
- Local development.
- Fast builds.
- Bundling React interfaces.
- Producing extension assets through an appropriate Chrome extension build configuration.

**Phase:** 1

**Important:** Vite must be configured for Chrome Extension Manifest V3. Extension-specific entry points and the background service worker must be built correctly; a default Vite website build is not sufficient.

### Tailwind CSS
**Purpose:** Utility-first styling framework.

**Used for:**
- Responsive layouts.
- Popup and blocked-page styling.
- Consistent spacing, typography, and colors.
- Dashboard and settings interfaces.

**Phase:** 1–5

### Lucide React
**Purpose:** Consistent, lightweight interface icons.

**Used for:**
- Navigation icons.
- Website management controls.
- Challenge and progress indicators.
- Dashboard visual elements.

**Phase:** 1–5

---

## 3. Chrome Extension Technologies

### Chrome Extension Manifest V3
**Purpose:** Platform and extension configuration standard.

**Used for:**
- Declaring extension permissions.
- Registering the popup and background service worker.
- Configuring extension pages and content scripts where needed.
- Defining the extension's required capabilities.

**Phase:** 1–5

### Chrome Extensions API
**Purpose:** Access browser extension functionality.

**Relevant APIs:**
- `chrome.storage.local` — store selected websites and local progression data; chrome.storage.session holds browser-lifetime account tokens and the unlock-session epoch.
- `chrome.alarms` — schedule supported background tasks when required.
- `chrome.runtime` — communicate between extension components.
- `chrome.tabs` — inspect or manage tabs when permissions and use cases require it.
- Content scripts with isolated Shadow DOM — current in-page overlay; chrome.declarativeNetRequest is not used by the current manifest.
- `chrome.webNavigation` — monitor relevant navigation events when necessary.

**Phase:** 1–5

**Permission principle:** Request only the permissions required for the features being implemented. Current enforcement is an in-page overlay, not network blocking. The manifest declares storage, tabs, webNavigation, alarms and all-URL host/content matches. Avoid collecting full browsing history.

### Chrome Storage
**Purpose:** Local persistence without requiring an account.

**Used for:**
- User-selected website domains.
- Per-website difficulty progression and cumulative unlock counts.
- Per-site shuffled bag, bounded recent puzzle history and versioned tab-scoped attempts.
- Temporary unlock session records.
- Local preferences and focus settings.

**Phase:** 1 & Phase 1 Enhancement

Counts, rotation and puzzle state stay local. Opt-in sync reconciles domain/enabled configuration only.

---

## 4. Backend Technologies

### Node.js
**Purpose:** JavaScript runtime for backend services.

**Used for:**
- Subscription-related business logic.
- Secure server-side operations.
- Payment webhook processing.
- Server-only integrations.

**Phase:** 2–3

### Express.js
**Purpose:** Backend API framework.

**Used for:**
- API routes.
- Authenticated operations.
- Subscription management endpoints.
- Request validation and error handling.

**Phase:** 2–3

### Supabase
**Purpose:** Managed backend platform using PostgreSQL.

Supabase replaces MongoDB in this project.

**Services we intend to use:**

#### Supabase Auth
- User registration and login.
- Session management.
- Authentication for protected resources.
- Support for account recovery.

#### Supabase PostgreSQL Database
- User profiles.
- Synced website settings where necessary.
- Unlock history.
- Subscription metadata.
- Aggregated analytics.

#### Row Level Security (RLS)
- Restrict access to each user's own records.
- Protect user data at the database level.
- Prevent unauthorized access through client-side requests.

#### Supabase Client Libraries
- Communicate with Supabase from the extension or backend.
- Retrieve and update permitted data.
- Access authenticated database operations.

**Phase:** 2–4

**Security rules:**
- Enable and test RLS on tables exposed through the Supabase Data API.
- Never expose the Supabase service-role key in the extension.
- Keep payment secrets and privileged operations server-side.
- Use appropriate authentication and authorization checks.
- Store only the cloud data required by the feature.

### PostgreSQL
**Purpose:** Relational database managed by Supabase.

**Why PostgreSQL:**
- Structured relationships between users, settings, subscriptions, and events.
- Constraints and indexes for data integrity.
- SQL queries and aggregation for dashboard analytics.
- Row Level Security for access control.

**Phase:** 2–4

---

## 5. Build and Extension Packaging

### Vite Extension Build Configuration
**Purpose:** Produce a Chrome-compatible extension package.

The build must support:
- `manifest.json`.
- Popup entry point.
- Blocked-page entry point.
- Background service worker.
- Required CSS, JavaScript, and static assets.

Implemented in extension/vite.config.js: popup, standalone blocked-page, background and content-script entries with stable background.js/content-main.js names. Public manifest/loader/assets are copied into dist. No extension build plugin is used. VITE_API_URL is embedded at build time; ignored .env.production selects Render for production builds.

Build modes: `npm run build:challenge-dev` emits and verifies the redesigned worker in `dist-dev`; `npm run build:private-preview` verifies the previous worker in `dist-preview` without developer controls. `npm run build` keeps legacy production arithmetic in `dist` and scans for developer-control leakage. Generated build directories are ignored by Git.

**Phase:** 1

### Chrome Developer Mode
**Purpose:** Install and test the unpacked extension locally.

**Used for:**
- Loading the development build.
- Testing website blocking.
- Inspecting service-worker logs.
- Debugging extension permissions and navigation behavior.

**Phase:** 1–5

---

## 6. Subscription and Payment Technologies

### Payment Provider — Candidates Under Evaluation
**Purpose:** Process subscription payments.

The provider will be selected based on supported regions, recurring billing, fees, webhook reliability, and integration requirements.

**Candidates under evaluation:**
- **Razorpay:** Considered for an India-focused launch, subject to business eligibility and onboarding requirements.
- **Stripe:** Considered for global coverage where the business entity and account are eligible.

**Expected capabilities:**
- Monthly and yearly plans.
- Subscription creation and cancellation.
- Payment status verification.
- Renewal and failure handling.
- Webhook event processing.

**Phase:** 3

### Server-Side Entitlement Management
**Purpose:** Enforce free and premium feature access.

The backend will determine whether a user is entitled to premium features. The extension will not be the authority for subscription status.

**Phase:** 3

---

## 7. Analytics and Visualization

### Recharts — Planned
**Purpose:** Build dashboard charts.

**Potential use cases:**
- Unlock frequency over time.
- Per-website trends.
- Difficulty progression.
- Focus and progress summaries.

**Phase:** 4

Charts will use data needed for meaningful user insights. Detailed cloud analytics will remain opt-in where applicable.

---

## 8. Testing and Quality Assurance

Recorded development verification (M024): 298 extension tests across 34 files, including 16,000 seeded puzzle samples. Lint and all three build checks passed. The built development worker verified all 16 type/level combinations. No tests were rerun during this documentation update. Chrome 156 checks covered injected and standalone challenges, tab isolation, refresh, offline input, failed-save recovery and restarts. Backend’s prior 80-test checkpoint is unchanged.

### Vitest
**Purpose:** Unit testing for JavaScript modules.

**Used for:**
- Seeded generation, independent reference checks, saved-state validation, migration and exactly-once completion.
- Count boundaries 0–20, 21–30, 31–50 and 51+; all four challenge types at every level.
- Difficulty progression and unlock counts.
- Unlock-session expiry calculations.
- Website-domain normalization.

**Phase:** 1–5 (including Phase 1 Enhancement)

### React Testing Library — Planned
**Purpose:** Test React components and user interactions.

**Used for:**
- Popup interactions.
- Challenge submission.
- Website selection.
- Loading, empty, and error states.

**Phase:** 1–5

### Manual Chrome Testing
**Purpose:** Verify real browser behavior.

**Test scenarios:**
- Add and remove websites.
- Navigate to blocked websites.
- Refresh blocked pages.
- Solve correct and incorrect challenges.
- Expire unlock sessions.
- Restart Chrome and verify persistence.
- Confirm unrelated websites remain accessible.

**Phase:** 1–5

---

## 9. Version Control and Collaboration

### Git
**Purpose:** Track source-code history.

**Used for:**
- Feature commits.
- Bug-fix history.
- Safe experimentation.
- Tracking implementation progress.

### GitHub
**Purpose:** Remote repository and collaboration.

**Used for:**
- Remote backups.
- Branches and pull requests when needed.
- Issue tracking.
- Sharing the project.

### Markdown Documentation
**Purpose:** Maintain project knowledge and implementation consistency.

The `brain/` directory contains instructions.md (development rules) and progress.md (execution evidence), alongside:

- `instructions.md` — development rules for AI-assisted implementation.
- `project.md` — product vision, requirements, and architecture.
- `ui.md` — visual design and interface guidelines.
- `phases.md` — phase roadmap and progress tracker.
- `techstack.md` — technologies, responsibilities, and phase assignments.

**Phase:** 1–5

---

## 10. Deployment and Distribution

### Chrome Web Store — Planned
**Purpose:** Distribute the extension publicly.

**Phase:** Later release stage

### Backend Hosting — Render Free staging
**Purpose:** Host the Express API if server-side functionality requires it.

The API is deployed at https://progressive-friction-api.onrender.com. Root render.yaml declares a Free Node service rooted at backend, npm ci --omit=dev, npm start, health path /health and automatic deployment off. See backend/DEPLOYMENT.md. Actual dashboard settings/deployed commit were not independently inspected after owner deployment.

Render can sleep after inactivity. The extension uses bounded safe health reads before credentials/writes when needed, plus a loading message. Owner confirmed recovery took about a minute. The current health response proves process liveness, not a real database query or RLS.

Cloudflare was evaluated but not selected for this build. Its local probe folder was removed; owner later reported deleting the synthetic Worker. Cloudflare is not a product dependency.

**Phase:** 2–3

### Supabase Hosting
Supabase will manage the database and authentication services. It is not a replacement for hosting the Chrome extension itself.

**Phase:** 2–4

---

## 11. Technology by Development Phase

| Phase | Main Technologies |
|---|---|
| Phase 1 — Core Extension | React, JavaScript, Vite, Tailwind CSS, Chrome Manifest V3, Chrome APIs, Chrome Storage, Vitest |
| Phase 1 Enhancement — Progressive Challenge Levels | Four local challenge models, per-site rotation, versioned attempt state and shared completion |
| Phase 2 — Backend & Authentication | Node.js, Express, Supabase Auth, PostgreSQL, Supabase client libraries, RLS |
| Phase 3 — Subscription System | Express, Supabase, payment provider (Razorpay / Stripe candidates), server-side entitlement checks, webhooks |
| Phase 4 — Dashboard & Analytics | Next.js / React, Tailwind CSS, Recharts, PostgreSQL, Supabase |
| Phase 5 — Signature Features | HTML5 video/audio playback, voluntary disable flow, focus schedules, Chrome APIs |

---

## 12. Architecture and Data Principles

1. **Local-first blocking and challenges:** all four levels must work offline without sign-in or backend availability.
2. **Extensible challenge execution:** Keep module behavior separate from progression policy and shared completion; use versioned local state and selected-module loading.
3. **Minimal synchronization:** Sync only settings and history required for account features.
4. **Privacy by default:** Do not upload complete browsing histories or detailed analytics by default.
5. **Secure authentication:** Protect account data using Supabase Auth and database authorization policies.
6. **Server-controlled subscriptions:** Premium entitlements must be validated through trusted server-side operations.
7. **Modular code:** Separate UI components, blocking services, challenge logic, storage operations, and backend communication.
8. **Incremental development:** Add technologies only when their phase requires them.
9. **Maintainability:** Prefer stable, documented APIs and avoid unnecessary dependencies.

---

## 13. Technical Decisions Still Open

The following technical decisions should be finalized when their implementation phase approaches:

- Tune difficulty from the repeated-use pilot before private-preview promotion.
- Deferred puzzle artwork and shared UI polish, followed by responsive/accessibility acceptance.
- Long-term production hosting/readiness beyond current Render Free staging. Email/password auth with worker-owned session storage is already implemented.
- Final payment provider selection (Razorpay vs Stripe) and pricing tiers.
- Analytics event definitions, retention periods, and opt-in UX.
- Chrome Web Store publishing requirements.
