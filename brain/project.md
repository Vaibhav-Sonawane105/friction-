Project Context — Progressive-Friction Website Blocker
Working concept
A Chrome extension that helps users interrupt unwanted browsing habits by requiring them to solve a math equation before opening websites they have explicitly chosen to restrict. Each successful unlock makes the next challenge for that website more difficult.
The product combines:
- Website blocking
- Progressive math challenges
- Per-website access and difficulty tracking
- A motivational anime video sequence
- A full-stack account and subscription system
- Optional analytics and future premium features
The current extension name is Progressive Friction. Final branding remains an owner decision; do not rename it without approval.

Implementation status (2026-10-17)
- Implemented: in-page blocking overlay, per-tab unlocks, local counts and ten arithmetic difficulty tiers; optional email/password accounts and automatic domain/enabled-list sync.
- Hosted groundwork: Express API on Render Free at https://progressive-friction-api.onrender.com; Supabase supplies authentication and PostgreSQL. Owner confirmed hosted sync and roughly one-minute cold-start recovery.
- Next: Phase 1 Enhancement — Progressive Challenge Levels. Levels 2–4, puzzles and the persistent timer are not implemented. Subscription processing, dashboard/analytics and motivational media remain future roadmap work.
- Hosting is not product completion. Follow phases.md; store release is deferred pending intended features and release acceptance.
Problem and intended outcome
Traditional website blockers can be easy to ignore or disable. This product adds deliberate friction between an impulse and access. The intended outcome is to help users pause and reconsider unwanted browsing—not to claim guaranteed habit change or provide medical treatment.
Core user flow
1. Install the Chrome extension.
2. Choose the websites/domains to restrict.
3. Navigate to a restricted website.
4. The extension presents a math challenge.
5. The user submits an answer.
6. If correct, the website is temporarily unlocked.
7. The user can browse that site during the active session.
8. When the user leaves the website, the unlock ends.
9. On the next access attempt, a new equation is presented.
10. After each successful unlock, that website's difficulty increases.
11. The extension records relevant counts and progress.
Session behavior
Implemented session policy:
- Same-domain navigation should not trigger a new challenge within an active session.
- Refreshes should not count as new unlocks.
- Closing a tab ends that tab's session.
- Navigating away from the restricted domain ends that tab's session.
- Multiple tabs unlock independently. Browser restart or extension reload ends temporary unlocks but retains counts; a service-worker restart preserves active tab sessions.
Math challenge progression
- Difficulty is tracked separately for each configured website.
- Increase difficulty after every successful unlock.
- Failed answers may be recorded separately but must not increase difficulty unless the owner explicitly changes this rule.
- Use valid, solvable equations with reliable answer checking.
- Define a sensible maximum difficulty and avoid accidental impossible equations.
- Prevent repeated submissions, page reloads, or navigation events from incrementing the unlock count more than once.
- Current code advances arithmetic difficulty on each successful unlock and caps it at tier 10. This is distinct from the planned challenge levels.
- Approved next level design: Level 1 arithmetic at counts 0–20; Level 2 linear equations/introductory calculus-style problems at 21–30; Level 3 easy interactive puzzles at 31–50; Level 4 a 1–8 minute waiting challenge at 51–70, paused while away and resumed from local state.
- Exact count semantics/boundaries, generators, puzzle choices, timer rules across multiple tabs, migration from existing arithmetic tiers, duration selection and behavior beyond 70 remain to be designed before implementation. See phases.md for tasks and acceptance criteria.
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
- Exact challenge-level boundaries, generator/puzzle design, migration and timer semantics (approved ranges above)
- Payment provider and pricing
- Final premium feature list
- Data retention and account-deletion policy
- Longer-term production hosting/readiness beyond the current Render Free staging setup

Checklist note: unchecked MVP acceptance items above are the final release checklist, not a claim that implemented groundwork is absent. Current verified scope and outstanding checks are recorded in progress.md.
