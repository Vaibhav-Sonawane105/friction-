# Tech Stack — Progressive Website Blocker

## 1. Project Overview

Status (2026-10-17): React/Vite/Tailwind MV3 extension, local arithmetic tiers, Express/Supabase accounts, automatic website-list sync and Render Free staging are implemented. Next is Phase 1 Enhancement — Progressive Challenge Levels. Algebra/calculus generators, mini-puzzles, timer, subscriptions, dashboard, analytics and motivational media below are planned, not current features. Store release is deferred; follow phases.md.

The Progressive Website Blocker is a Chrome extension that helps users control distractions by blocking selected websites, requiring math challenges to unlock them, and progressively increasing challenge difficulty for repeated unlocks.

The application will be developed in phases, beginning with a fully functional local Chrome extension and gradually introducing authentication, cloud synchronization, subscriptions, analytics, and signature features.

**Core principles:**
- Build a functional, lightweight Chrome extension first.
- Prefer free and open-source tools where practical.
- Keep the core blocking experience independent of the backend.
- Use secure, maintainable, and modular architecture.
- Minimize unnecessary collection of browsing data.
- Avoid adding dependencies or services without a clear purpose.

---

## 2. Frontend Technologies

### React.js
**Purpose:** Build reusable, interactive user interfaces.

**Used for:**
- Extension popup.
- Website management interface.
- Blocked-page experience.
- Progressive challenge interfaces (arithmetic, linear/intro-calculus equations, interactive puzzles, countdown timer).
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
- Progressive challenge engines (Levels 1–4: arithmetic, algebraic/calculus generators, puzzle state, pause/resume timer logic).
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
- Level 4 countdown timer state (remaining duration, pause-on-exit, resume-on-return per domain).
- Temporary unlock session records.
- Local preferences and focus settings.

**Phase:** 1 & Phase 1 Enhancement

Local storage is the implemented default for blocking and arithmetic progression. Opt-in automatic sync already reconciles domain/enabled configuration only; counts and difficulty stay local. Planned puzzles and the Level 4 timer must also stay local-first; they are not implemented yet.

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

Latest recorded implementation checks: 61 extension tests across 7 files, 72 backend tests across 6 files, extension lint/build. These were not rerun for this documentation-only audit. Tests listed for advanced levels below are intended coverage, not implemented tests. The separate unlockLifecycle.test.js regression suite is absent and remains a follow-up.

### Vitest
**Purpose:** Unit testing for JavaScript modules.

**Used for:**
- Progressive challenge generators and solvers (Level 1 arithmetic, Level 2 linear/calculus equations).
- Answer validation and puzzle state (Level 3 sequences, patterns, memory).
- Level 4 countdown timer pause/resume math and state transitions.
- Unlock-count boundary calculations (0–20, 21–30, 31–50, 51–70).
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
| Phase 1 Enhancement — Progressive Challenge Levels | Progressive challenge engines (arithmetic, linear/calculus equations, interactive puzzles, Level 4 persistent timer), local-first state storage |
| Phase 2 — Backend & Authentication | Node.js, Express, Supabase Auth, PostgreSQL, Supabase client libraries, RLS |
| Phase 3 — Subscription System | Express, Supabase, payment provider (Razorpay / Stripe candidates), server-side entitlement checks, webhooks |
| Phase 4 — Dashboard & Analytics | Next.js / React, Tailwind CSS, Recharts, PostgreSQL, Supabase |
| Phase 5 — Signature Features | HTML5 video/audio playback, voluntary disable flow, focus schedules, Chrome APIs |

---

## 12. Architecture and Data Principles

1. **Local-first blocking and challenges:** Website blocking, progressive challenge selection (Levels 1–4), puzzle verification, and Level 4 timer pause/resume mechanics must work entirely offline without requiring network access, backend requests, or user login. Backend outages or being logged out must never break core blocking or challenge completion.
2. **Minimal synchronization:** Sync only settings and history required for account features.
3. **Privacy by default:** Do not upload complete browsing histories or detailed analytics by default.
4. **Secure authentication:** Protect account data using Supabase Auth and database authorization policies.
5. **Server-controlled subscriptions:** Premium entitlements must be validated through trusted server-side operations.
6. **Modular code:** Separate UI components, blocking services, challenge logic, storage operations, and backend communication.
7. **Incremental development:** Add technologies only when their phase requires them.
8. **Maintainability:** Prefer stable, documented APIs and avoid unnecessary dependencies.

---

## 13. Technical Decisions Still Open

The following technical decisions should be finalized when their implementation phase approaches:

- Exact equation generators and difficulty ceilings for advanced challenge tiers.
- Exact Level 3 interactive puzzle mechanics and accessible UI representations.
- Long-term production hosting/readiness beyond current Render Free staging. Email/password auth with worker-owned session storage is already implemented.
- Final payment provider selection (Razorpay vs Stripe) and pricing tiers.
- Analytics event definitions, retention periods, and opt-in UX.
- Chrome Web Store publishing requirements.