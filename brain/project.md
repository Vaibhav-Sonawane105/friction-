Project Context — Progressive-Friction Website Blocker
Working concept
A Chrome extension that helps users interrupt unwanted browsing habits through progressive challenges before accessing websites they explicitly choose to restrict. The intended product supports arithmetic, equations, easy puzzles and a waiting timer; current shipped code still uses arithmetic only. Each successful unlock advances that website’s count; progression rules determine the next challenge level.
The product combines:
- Website blocking
- Progressive math challenges
- Per-website access and difficulty tracking
- A motivational anime video sequence
- A full-stack account and subscription system
- Optional analytics and future premium features
The current extension name is Progressive Friction. Final branding remains an owner decision; do not rename it without approval.

Implementation status (2026-10-20)
- Production build (`dist`): in-page blocking overlay, per-tab unlocks, local counts and ten legacy arithmetic tiers; optional accounts and automatic domain/enabled-list sync.
- Development build (`dist-dev`): modular foundation, count-to-level policy, versioned local attempts/migration, shared validated completion, Level 1 arithmetic adapter and temporary developer controls. Owner confirms controls and blocking work after the MV3 worker fix; broader browser checklist evidence remains distinct. Latest recorded checks: 199 extension tests, 80 backend tests, lint and both builds passed (M017).
- Hosted groundwork: Express API on Render Free at https://progressive-friction-api.onrender.com; Supabase supplies authentication and PostgreSQL. Owner confirmed hosted sync and roughly one-minute cold-start recovery.
- Next: Level 2 linear equations and introductory derivative questions at completed counts 21–30; then independent Level 3 puzzles and the persistent Level 4 timer. Later-level count jumps currently report unavailable modules. Full-range production activation and eventual removal of temporary testing controls follow implementation and owner testing of every level. Subscriptions, dashboard/analytics and motivational media remain future work.
- Hosting is not product completion. Follow phases.md; store release is deferred pending intended features and release acceptance.
Problem and intended outcome
Traditional website blockers can be easy to ignore or disable. This product adds deliberate friction between an impulse and access. The intended outcome is to help users pause and reconsider unwanted browsing—not to claim guaranteed habit change or provide medical treatment.
Core user flow
1. Install the Chrome extension.
2. Choose the websites/domains to restrict.
3. Navigate to a restricted website.
4. The extension selects a challenge module using the website’s progression.
5. The user completes its interaction: an answer, puzzle or waiting task.
6. After the shared completion flow validates and saves success, the website is temporarily unlocked.
7. The user can browse that site during the active session.
8. When the user leaves the website, the unlock ends.
9. On the next access attempt, the appropriate challenge is presented; a persistent task resumes when its defined rules require it.
10. Each successful unlock increments the website’s count once; progression rules choose its next level.
11. The extension records relevant counts and progress.
Session behavior
Implemented session policy:
- Same-domain navigation should not trigger a new challenge within an active session.
- Refreshes should not count as new unlocks.
- Closing a tab ends that tab's session.
- Navigating away from the restricted domain ends that tab's session.
- Multiple tabs unlock independently. Browser restart or extension reload ends temporary unlocks but retains counts; a service-worker restart preserves active tab sessions.
## Required modular challenge architecture

**Owner-approved architecture (2026-10-17); foundation implemented in the development build (M017).** Extend the existing interfaces rather than adding every challenge to one component. Production activation of the full level system remains pending.

Separate these responsibilities:

1. **Progression policy:** map each website's successful-unlock count to a level and select a registered challenge type. Keep count thresholds independent from challenge rendering and answer checking.
2. **Challenge registry:** stable identifiers/versions and common generation, validation, public state, action and cleanup contracts. Shared metadata feeds separate registries: MV3 workers statically link pure models and invoke the selected one; browser views load on demand. Do not call dynamic imports or DOM preload helpers in a worker, or initialize every game in a content script.
3. **Independent modules:** arithmetic, equations, easy puzzles and persistent timer each own their interaction, validation and module-specific state. Modules request completion through the common flow; they must not increment counts or grant tab access independently.
4. **Shared completion coordinator:** check that the attempt still belongs to the active tab/domain and is not already completed, then persist progression and temporary access consistently. Preserve duplicate-submission protection and the background writer. Stale results, navigation, storage failure and repeated callbacks must not create extra unlocks.
5. **Versioned local state:** distinguish per-website progression, module/attempt state and temporary per-tab access sessions. Use stable identifiers and explicit schema versions so updates can migrate existing data. Preserve counts and configured websites; do not silently reset progression or active saved timer state. Product migration and timer rules are approved below; their technical mechanics still need design.
6. **Lifecycle and performance:** stop module timers, animations, workers and listeners when disposed. Pause/save resumable tasks according to their rules. Heavy optional dependencies must not enter every page's initial challenge bundle; measure real Chrome behavior as well as unit tests.

Adding a future challenge should normally mean a new module, a registry entry, relevant progression configuration and tests, rather than edits to every existing module. A module's own capabilities may require extra implementation, but the common unlock flow should remain reusable.

Scope now is the foundation plus Levels 1–4 only. Camera recognition is excluded from the current roadmap and architecture implementation; no camera permission, recognition library, placeholder module or backend image pipeline is required. Any post-release proposal needs separate approval.

Current interfaces, versioned schema, identities and completion flow are implemented and documented in `docs/superpowers/specs/2026-10-17-modular-challenge-foundation-design.md`; see its matching implementation plan and execution ledger. Exact generator bounds for later modules, puzzle content and timer ownership/checkpoint mechanics still need slice-specific design. Follow the approved rules below.

## Challenge progression
- Difficulty is tracked separately for each configured website.
- Increment successful-unlock count after each success; choose challenge level using the separate progression policy. A level can span many unlocks.
- Failed answers may be recorded separately but must not increase difficulty unless the owner explicitly changes this rule.
- Use valid, solvable equations and puzzles with reliable module-specific checking; the waiting module completes only after its defined active duration.
- Define a sensible maximum difficulty and avoid accidental impossible equations.
- Prevent repeated submissions, page reloads, or navigation events from incrementing the unlock count more than once.
- Current code advances arithmetic difficulty on each successful unlock and caps it at tier 10. This is distinct from the planned challenge levels.
- Approved next level design: Level 1 arithmetic at counts 0–20; Level 2 linear equations/introductory calculus-style problems at 21–30; Level 3 easy interactive puzzles at 31–50; Level 4 a 1–8 minute waiting challenge at 51–70, paused while away and resumed from local state.
## Approved level rules (2026-10-17)

Implementation scope: the policy, migration and Level 1 adapter run in development only. Level 2, Level 3 and Level 4 modules remain planned; this section defines their required behavior, not completed functionality.

- Select the next challenge using the website's completed successful-unlock count before that challenge: Level 1 at 0–20, Level 2 at 21–30, Level 3 at 31–50, Level 4 at 51–70 and every count above 70. A new website therefore receives 21 Level 1 completions. Completion increments the count once; the next attempt uses the resulting count.
- Level 1 stays approachable without being trivial: addition, subtraction and small multiplication, gradually introducing two-operation expressions and exact division toward count 20. Use manageable numbers and whole-number answers; wrong answers never increase difficulty.
- Level 2 randomly selects simple linear equations or introductory derivative questions with integer answers and clear instructions.
- Level 3 starts with missing-item pattern puzzles and memory matching with three pairs and no time limit. Randomly choose a game for each new challenge. Each mini-game is independently registered and versioned, leaving room for more modules without rewriting existing games or the shared unlock flow.
- Wrong answers and refreshes retain the selected challenge. Generate a new challenge after successful completion; saved waiting challenges retain their remaining time.
- Level 4 selects a random duration of 1–8 whole minutes once per new waiting challenge. Persist its duration and remaining time; returning or refreshing must not reroll it. Continue Level 4 after 70, cap waits at eight minutes, and keep incrementing the count.
- Keep one saved waiting timer per website, counting down in only one tab at a time. Pause when its challenge tab is hidden, Chrome is minimized, the user leaves the website, or the tab/browser closes. Resume saved remaining time on return; time spent away does not count. Completion unlocks only the completing tab, not every tab for that website.
- Migration preserves configured websites and successful-unlock counts, replacing legacy arithmetic-tier selection with the new ranges. For example, an existing count of 35 selects Level 3. Preserve temporary-session lifecycle guarantees separately from saved challenge state.
- The common module contract, versioned attempt schema, migration and completion races are covered by the foundation. Later generators, puzzle content and timer ownership/handoff/checkpoint behavior still require design and tests. Do not infer shared non-timer completion across tabs from the planned shared waiting timer.

Motivational video
The owner wants an anime motivational speech when the user tries to disable the extension, with the title:
Ahh look at you, running from a war, what a coward

Technical limitation: a normal Chrome extension cannot reliably intercept its own disable/uninstall action in Chrome's extension-management UI. Implement a voluntary in-extension flow before the user proceeds with a disable-related action, and optionally show a comeback screen when the extension is re-enabled. Never claim the extension can force a video to play after it has been disabled.
Use only media the owner has permission to use. Copyrighted anime clips/music may require permission; consider original, licensed, or otherwise authorized media.
Platform and intended stack
Chrome extension
- Chrome Extension Manifest V3
- HTML, CSS, JavaScript
- chrome.storage.local for local settings and local state
- Content-script overlay in isolated Shadow DOM at document_start; chrome.declarativeNetRequest is not used by the current manifest or enforcement code
- Other Chrome APIs only when necessary and with the minimum required permissions
Backend
- Node.js
- Express.js
- Supabase (PostgreSQL, Supabase Auth, Row Level Security)
Possible companion dashboard
- Next.js
- Tailwind CSS
- JavaScript
Payments
- A provider such as Razorpay may be considered for an India-focused launch, subject to current eligibility and integration requirements.
- Stripe may be considered where the business and account are eligible.
- Provider, prices, taxes, and billing details are not finalized.
Avoid adding services or dependencies until they solve a defined requirement.
Backend responsibilities
The backend is intended to support:
- User authentication and account management
- Subscription status and premium entitlements
- Free-plan website limit enforcement
- Optional account-based settings sync
- User-requested analytics and account dashboards
- Future premium features
Keep local blocking functional if the backend is temporarily unavailable. Do not make network access a prerequisite for every navigation or equation challenge.
Do not store privileged secrets in extension code. Verify payment webhooks on the backend. Treat all client-supplied plan status and entitlement claims as untrusted.
Monetization
Free tier
- Up to 2 configured websites.
Premium tier
- More or unlimited configured websites is a proposed benefit.
- Monthly and yearly subscriptions are planned.
- Advanced difficulty customization, analytics, schedules and custom motivational media are possible future benefits. Opt-in website-list sync already exists; future monetization of that feature has not been decided.
Pricing, exact limits, final premium features, trial policy, and cancellation behavior remain undecided. Do not present proposals as finalized decisions.
Privacy and data handling
Agreed principle: collect the minimum data needed to provide the product.
- Users choose which websites to restrict.
- Keep selected domains and blocking enforcement local where practical.
- Send only data needed for authentication, subscription enforcement, explicitly requested settings sync, and requested account features.
- Detailed cloud analytics are opt-in.
- Do not upload the user's full browsing history by default.
- Clearly document local versus server-side storage.
- Use HTTPS for API communication.
- Provide a way to delete account data and explain what is retained when accounts or subscriptions are closed.
- Avoid logging sensitive domain names or browsing events unnecessarily.
Suggested data model (initial proposal)
Adapt this model to the actual implementation rather than treating it as immutable.
User
- id
- email or authentication-provider identifier
- createdAt
- plan
- subscriptionStatus
- subscriptionProviderCustomerId (only if required)
User preferences
- userId
- analyticsOptIn
- syncEnabled
- UI and challenge preferences
Website configuration
The domain/enabled list is local by default and automatically reconciled with Supabase after explicit sync opt-in. Counts, challenge difficulty and unlock sessions stay local; enabling sync does not upload browsing history or unlock-history events. Tokens live only in chrome.storage.session; closing Chrome or reloading the extension requires sign-in and device sync consent again.
- domain
- enabled
- optional user-defined label
- optional sync timestamp
Local website state
- domain
- successfulUnlockCount
- difficultyLevel
- local session state
- optional local aggregate statistics
Subscription record
- userId
- provider
- providerSubscriptionId
- status
- currentPeriodEnd
- verified webhook/event references where necessary
Avoid storing a detailed, permanent server-side visit-by-visit history by default.
Non-goals for the initial MVP
Do not begin with:
- AI website classification
- Blockchain rewards
- Social feeds or public leaderboards
- Complex gamification
- Cloud storage of full browsing history
- Mobile apps
- A large microservice architecture
These may be reconsidered later if a real need emerges.
MVP acceptance checklist
- [ ] User can add and remove domains.
- [ ] Free users cannot configure more than 2 websites through the supported product flow.
- [ ] Restricted pages show the local in-page challenge overlay (standalone blocked page remains a fallback).
- [ ] Correct answers grant temporary access.
- [ ] Same-domain navigation and refreshes do not create duplicate unlock events.
- [ ] Leaving the domain ends the relevant access session.
- [ ] Each successful unlock increases only that website's difficulty.
- [ ] Equations are valid and answer validation is tested.
- [ ] Basic settings and blocking continue working during a backend outage.
- [ ] Authentication is validated server-side; planned paid entitlements must also be verified server-side when subscriptions are implemented.
- [ ] Detailed cloud analytics are opt-in.
- [ ] The user can remove the extension through normal browser controls.
- [ ] Privacy behavior and permissions are documented.
Open decisions
Keep this list current:
- Product name and visual identity
- Later-level generator bounds, puzzle content and timer ownership/handoff/checkpoint mechanics; reuse the existing module interfaces, state schema and migration flow
- Payment provider and pricing
- Final premium feature list
- Data retention and account-deletion policy
- Longer-term production hosting/readiness beyond the current Render Free staging setup

Checklist note: unchecked MVP acceptance items above are the final release checklist, not a claim that implemented groundwork is absent. Current verified scope and outstanding checks are recorded in progress.md.
