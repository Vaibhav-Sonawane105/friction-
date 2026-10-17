Development Phases & Progress Tracker
Purpose
This document tracks the implementation progress of the Progressive Website Blocker Chrome extension.
It defines the development phases, their objectives, implementation tasks, completion criteria, and dependencies.
Current Phase: Modular challenge foundation → Phase 1 Enhancement — Progressive Challenge Levels (next implementation; neither foundation nor four-level mechanism implemented yet).
Current Status: Core arithmetic extension and account/website-sync foundations are implemented. Render Free staging works with owner-confirmed live acceptance. The intended product is not release-ready.
Overall Status: Fresh checkpoint verification: 110 extension tests across 9 files and 80 backend tests across 7 files passed, plus extension lint/build. Lifecycle regression coverage is restored. Owner reports migration/SQL scripts passed; independent hosted SQL verification, API redeployment and live account edge cases remain follow-ups (see progress.md M016).

Agreed sequence: first design and implement the modular foundation required by project.md, then implement and verify progressive challenge Levels 1–4; then continue Phase 3 subscriptions, Phase 4 dashboard/analytics and Phase 5 signature features in order unless the owner changes priorities. Chrome Web Store preparation/publication is a later release decision, not the next phase merely because hosting works.
Current implementation uses ten arithmetic difficulty tiers capped at 10, increasing after each successful unlock. Those tiers are not the planned four challenge-type levels below.
Development Rules
1. Work on one phase at a time unless a dependency requires otherwise.
2. Do not start implementing a later phase simply because its features are described here.
3. Break each phase into small, testable tasks before implementation.
4. With owner permission, update this document when a task is started, completed, postponed, or changed; do not edit brain files automatically.
5. Never mark a task complete unless the implementation has been verified.
6. Keep the project consistent with instructions.md, project.md, and ui.md.
7. Avoid unnecessary complexity, premature optimization, and features outside the current scope.
8. Preserve working functionality when introducing new features.
9. When a phase is completed, test its acceptance criteria before moving forward.
10. If requirements change, update the relevant documentation before implementing significant architectural changes.
Phase 1 — Core Extension
Status: Implemented; owner-confirmed browser acceptance, with 26 restored automated lifecycle regression cases.
Objective
Build a functional Chrome extension that allows users to select distracting websites, block them, solve math challenges to unlock them temporarily, and experience increasing difficulty for repeated unlocks.
Tasks
- [x] Initialize the Chrome extension structure and manifest.
- [x] Implement the extension popup and website-selection interface.
- [x] Store selected website domains locally.
- [x] Implement website detection and blocking.
- [x] Create the blocked-page interface.
- [x] Implement math challenge generation.
- [x] Validate submitted answers.
- [x] Implement temporary unlock sessions.
- [x] Track unlock attempts and difficulty progression per website.
- [x] Persist required extension state locally.
- [x] Handle invalid input, navigation, refreshes, and expired sessions.
- [x] Test blocking and unlocking across multiple websites.
- [x] Test edge cases and ensure existing functionality remains stable (refreshes, same-domain nav, multi-tab isolation, tier capping, offline resilience).
Completion Criteria
- Users can add and remove websites from their block list.
- Selected websites are blocked consistently.
- Users must solve a valid math challenge to unlock a blocked website.
- Successful challenges grant only a temporary unlock.
- Difficulty progresses independently for each website according to the defined rules.
- Relevant settings and progression survive browser restarts where required.
- The extension handles refreshes, expired sessions, and invalid answers correctly.
- Core functionality works without a backend or account.
Phase 1 Enhancement — Progressive Challenge Levels
Status: Next active implementation — not yet implemented
Objective
Extend the verified basic-math challenge into a configurable progression of challenge types. This is an extension-side feature and must remain functional without authentication, network access, or the backend.
Approved Level Design
Level	Successful unlock count before the next challenge	Challenge type
Level 1	0–20	Existing beginner-friendly arithmetic problems
Level 2	21–30	Linear equations and introductory calculus-style problems, including solving for x
Level 3	31–50	Very easy interactive mini-games and puzzles, such as patterns, sequences, memory, or spatial reasoning
Level 4	51 and above	Random 1–8 whole-minute waiting challenge, persisted and paused while hidden/away
Future levels	To be defined	Additional modules require separate design/approval; no camera work is included


The ranges use completed unlocks before the next challenge: 0–20 gives 21 Level 1 completions. Level 4 continues above 70. Product rules, challenge retention, migration and timer behavior are approved in project.md#approved-level-rules-2026-10-17-not-implemented; technical design and implementation remain pending.
Tasks
- [ ] Design the module contract, progression policy and registry, shared completion coordinator, versioned local state and migration strategy as required by [project.md](project.md#required-modular-challenge-architecture).
- [ ] Implement the reusable foundation and adapt existing arithmetic through its module interface before adding other challenge types.
- [ ] Keep thresholds separate from rendering/validation. Load only the selected module and dispose its resources when leaving it.
- [ ] Preserve website counts and settings during migration; prevent stale or duplicate module callbacks from completing an attempt twice.
- [ ] Test registry selection, module lifecycle, state migration/restoration and shared completion independently of each game.
- [ ] Update the challenge architecture to select a challenge type from the per-website progression level.
- [ ] Preserve the current beginner-friendly arithmetic behavior for Level 1.
- [ ] Add validated, solvable Level 2 equation generators and answer checking.
- [ ] Add accessible, very easy interactive puzzles for Level 3.
- [ ] Add the Level 4 timer UI and persistent timer state.
- [ ] Pause the Level 4 timer when the user leaves the restricted website or closes its tab; resume with the saved remaining time when they return.
- [ ] Ensure closing/reopening the overlay does not reset the timer or cumulative unlock count.
- [ ] Store progression and timer state locally; do not require Supabase or an Express request to complete a challenge.
- [ ] Ensure the timer grants a temporary unlock only after reaching zero.
- [ ] Prevent duplicate timers, duplicate unlock-count increments, and incorrect progression across refreshes or navigation.
- [ ] Add unit and manual Chrome tests for each level and all count boundaries.
- [ ] Evaluate copy/paste restrictions as supplemental friction only, not as a security guarantee.
Completion Criteria
- Progression, registry, module implementations, shared completion and persisted state are independently maintained; game modules do not own count increments or tab unlock writes.
- A new challenge type can be registered without rewriting existing challenge modules or duplicating the unlock flow.
- Migration preserves existing settings/counts; on-demand loading and cleanup are verified.
- The correct challenge type is selected for each defined unlock-count range.
- Progression is tracked independently for each configured website according to the existing per-website model.
- Level 4 remaining time survives overlay closure, tab closure, navigation away, and browser/service-worker restarts as specified; elapsed time while away does not reduce the remaining time.
- Reopening the site resumes the saved timer rather than restarting it.
- Completing a challenge does not reset cumulative progression.
- The extension remains usable offline and when the user is logged out.
- Existing blocking and unlocking behavior remains stable, and tests cover all level transitions.
Dependency and sequencing
This enhancement does not depend on the backend. Phase 2 can be developed independently because authentication and cloud sync must not control local challenge execution. However, the new levels must be implemented and verified before claiming the expanded challenge system is complete.
Phase 2 — Backend & Authentication
Status: Foundations implemented; hosted login and website-list sync owner-confirmed. Remaining live refresh/revocation/email checks are tracked in progress.md.
Objective
Introduce a backend to support user accounts, authenticated API requests, cross-device settings, and unlock history.
Tasks
- [x] Set up the Node.js and Express server.
- [x] Configure Supabase project, PostgreSQL tables, and schemas.
- [x] Implement Supabase Auth (registration, login, logout, and session management).
- [x] Implement Row Level Security (RLS) policies to protect user data at the database level.
- [x] Define user and settings data models in PostgreSQL.
- [x] Implement synchronization of supported settings between local storage and Supabase.
- [x] Implement opt-in unlock-history database/API support (the extension does not upload history or sync unlock counts).
- [x] Handle API errors, network failures, offline state, and expired authentication sessions.
- [x] Add environment-variable configuration; current backend uses caller-scoped anon/publishable credentials, with no service-role key required.
- [x] Test authentication, authorization, and data access boundaries.
Completion Criteria
- Users can create accounts and authenticate securely using Supabase Auth.
- Protected API endpoints reject unauthorized requests.
- Row Level Security (RLS) guarantees users can access and modify only their own account data.
- Opted-in website configuration persists in Supabase. Unlock-history API support exists separately; extension history uploads and analytics remain unimplemented.
- Backend failures do not break core extension functionality (local-first resilience).
Phase 3 — Subscription System
Status: Not Started
Objective
Introduce free and premium tiers with reliable subscription enforcement and payment processing.
Tasks
- [ ] Define free-tier limits and premium entitlements.
- [ ] Implement server-side subscription and entitlement checks.
- [ ] Define monthly and yearly subscription plans.
- [ ] Integrate a suitable payment provider.
- [ ] Implement and verify payment webhooks.
- [ ] Handle successful payments, failures, cancellations, and renewals.
- [ ] Handle subscription expiration and entitlement changes.
- [ ] Add subscription management UI.
- [ ] Test payment and subscription edge cases.
Completion Criteria
- Subscription status is verified by the backend.
- Premium access cannot be granted solely by changing client-side state.
- Payment events are verified and handled safely.
- Renewals, cancellations, and expired subscriptions update entitlements correctly.
- Free-tier restrictions are enforced consistently.
Phase 4 — Dashboard & Analytics
Status: Not Started
Objective
Provide users with useful insights into their website-specific unlocking behavior and difficulty progression.
Tasks
- [ ] Define the analytics metrics that provide meaningful value.
- [ ] Build the dashboard interface.
- [ ] Display website-specific unlock frequency.
- [ ] Visualize difficulty progression over time.
- [ ] Display relevant focus and progress trends.
- [ ] Add appropriate date filters and time ranges.
- [ ] Handle empty, incomplete, and unavailable data.
- [ ] Minimize data collection and provide appropriate privacy controls.
- [ ] Test dashboard accuracy against recorded events.
Completion Criteria
- Dashboard metrics accurately reflect recorded events.
- Users can understand their progress without misleading statistics.
- Analytics collect only the data necessary for their intended purpose.
- Detailed cloud analytics remain opt-in where applicable.
- Dashboard loading and empty states are handled properly.
Phase 5 — Signature Features
Status: Not Started
Objective
Differentiate the product through motivating, customizable, and user-requested features.
Potential Features
- [ ] Anime-inspired motivation scenes.
- [ ] Custom math challenges and challenge settings.
- [ ] Focus schedules and scheduled blocking.
- [ ] Additional challenge types.
- [ ] Optional motivational messages and progress milestones.
- [ ] User-requested quality-of-life improvements.
Completion Criteria
- Each feature has a clearly defined user benefit.
- Features are tested before release.
- Existing blocking and unlocking behavior remains reliable.
- New features respect user privacy and accessibility.
- Implementation priorities are informed by feedback rather than assumptions.
Progress Update Log
Record meaningful development milestones here.
Initial Setup
- Created the project repository.
- Initialized Git.
- Created the project documentation structure.
- Prepared the phased development roadmap.
Future Updates
- **2026-10-14**: Phase 1 Core Extension verified across all 5 browser scenarios with 20 passing Vitest tests.
- **2026-10-15**: Phase 2 Backend & Authentication completed & verified:
  - Express API skeleton with ES Modules, dotenv, nodemon, and GET /health.
  - Supabase client integration; historical health/session results did not prove live database connectivity or RLS (see M016).
  - Relational PostgreSQL schemas (profiles, user_settings, synced_websites, unlock_history) with RLS policies, indexes, and triggers.
  - Authentication endpoints (signup, login, me, logout) with JWT Bearer validation middleware and safe JSON error handling.
  - Optional cloud synchronization for preferences, website blocklists, and minimal unlock history with strict privacy guards (normalizeDomain).
  - 50/50 automated backend tests passing (Vitest + Supertest).
Current Next Step
1. Design the **modular challenge foundation** using the approved rules in project.md, then implement and test it before adding Levels 1–4. Count boundaries, migration policy, starter games, timer visibility/ownership policy, random duration and post-70 continuation are approved; interfaces, schemas and concurrency mechanics still need technical design.
2. Keep blocking, challenge progression, puzzles and the planned Level 4 timer local-first. Backend outages or sign-out must not disrupt core behavior.
3. Continue the subscription/dashboard/signature-feature roadmap after the level mechanism. Store release is deferred until intended product scope and release checks are satisfied and the owner authorizes it.

Camera recognition is explicitly outside this roadmap. No camera permissions, dependencies or placeholder implementation belong to the current phase.

2026-10-17 alignment: Render staging and safe wake-up handling are completed groundwork (see progress.md M013); the owner restored progressive challenge levels as the next priority. Historical dated test counts above describe their original milestones, not the current suite.
