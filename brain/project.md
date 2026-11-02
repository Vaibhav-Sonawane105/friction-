Project Context — Progressive-Friction Website Blocker
Working concept
A Chrome extension for sites people choose to restrict. Access costs deliberate effort, and repeated successful unlocks increase that effort permanently for that site, up to a moderate ceiling.
The product combines:
- Website blocking
- Progressive math challenges
- Per-website access and difficulty tracking
- A motivational anime video sequence
- A full-stack account and subscription system
- Optional analytics and future premium features
The current extension name is Progressive Friction. Final branding remains an owner decision; do not rename it without approval.

Implementation status (2026-11-02)
- Production build (`dist`): in-page blocking overlay, per-tab unlocks, local counts and ten legacy arithmetic tiers; optional accounts and automatic domain/enabled-list sync.
- Development (`dist-dev`) runs four rotating challenge types at all four levels. The friends’ preview (`dist-preview`) retains the earlier Levels 1–3 and reports Level 4 unavailable; production (`dist`) retains legacy arithmetic. See M024 for technical verification; human difficulty targets are not yet validated.
- Hosted groundwork: Express API on Render Free at https://progressive-friction-api.onrender.com; Supabase supplies authentication and PostgreSQL. Owner confirmed hosted sync and roughly one-minute cold-start recovery.
- The owner will handle the GitHub checkpoint before UI polish. Difficulty calibration with volunteers and owner acceptance remain pending before updating friends’ preview; production activation is a separate decision.
- Hosting is not product completion. Follow phases.md; store release is deferred pending intended features and release acceptance.
Problem and intended outcome
Traditional website blockers can be easy to ignore or disable. This product adds deliberate friction between an impulse and access. The intended outcome is to help users pause and reconsider unwanted browsing—not to claim guaranteed habit change or provide medical treatment.
Core user flow
1. Install the Chrome extension.
2. Choose the websites/domains to restrict.
3. Navigate to a restricted website.
4. The extension selects a challenge module using the website’s progression.
5. Complete the selected challenge or leave the site.
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
3. **Independent modules:** maths, memory, route planning and logical ordering each own their interaction and validation. Only the shared coordinator increments counts and grants access.
4. **Shared completion coordinator:** check that the attempt still belongs to the active tab/domain and is not already completed, then persist progression and temporary access consistently. Preserve duplicate-submission protection and the background writer. Stale results, navigation, storage failure and repeated callbacks must not create extra unlocks.
5. **Versioned local state:** keep site counts, rotation history, saved attempts and temporary access separate. Preserve valid older memory boards and matches; retire incompatible unfinished challenges without granting access or counting success.
6. **Lifecycle and performance:** stop module timers, animations, workers and listeners when disposed. Pause/save resumable tasks according to their rules. Heavy optional dependencies must not enter every page's initial challenge bundle; measure real Chrome behavior as well as unit tests.

Adding a future challenge should normally mean a new module, a registry entry, relevant progression configuration and tests, rather than edits to every existing module. A module's own capabilities may require extra implementation, but the common unlock flow should remain reusable.

Scope now is the foundation plus Levels 1–4 only. Camera recognition is excluded from the current roadmap and architecture implementation; no camera permission, recognition library, placeholder module or backend image pipeline is required. Any post-release proposal needs separate approval.

<a id="approved-level-rules-2026-10-17"></a>

## Challenge progression

Use the site’s successful count **before** the new attempt. Counts do not decay or reset overnight. All four types appear at every level; each new attempt draws one from a shuffled per-site bag. Avoid consecutive repeats across refills. Refresh restores the assigned task and progress. Another tab’s success does not change the active level.

| Level | Prior unlocks | Practiced time target | Memory pairs |
| --- | --- | --- | --- |
| 1 | 0–20 | 15–30 s | 3 |
| 2 | 21–30 | 30–45 s | 4 |
| 3 | 31–50 | 45–75 s | 6 |
| 4 | 51+ | 75–120 s | 8 |

- **Maths:** solve a set of 2, 2, 3 or 4 questions respectively, mixing arithmetic, missing values, number constraints and operator selection. Retry the same question; completed answers stay completed.
- **Memory:** match pairs on one board; matches stay visible. No time or move limit.
- **Route planning:** visit every checkpoint and reach the exit without crossing walls or revisiting cells. Any valid route passes; moves can be undone. Level 4 adds ordered checkpoints.
- **Logical ordering:** submit a full arrangement against visible clues. Incorrect submissions preserve the arrangement and identify violated clues.
- **Timing:** these are pilot targets, never mandatory waits. Completion unlocks the current tab once. Level 4 continues indefinitely with active challenges; the old timer proposal is superseded.

See the [approved design](../docs/superpowers/specs/2026-11-01-challenge-redesign-design.md) and [implementation checkpoint](../docs/superpowers/plans/2026-11-02-challenge-redesign.md). Earlier level-specific module rules remain historical context for the private preview.

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
- UI polish and human calibration: do the new tasks remain demanding after practice without frustrating intentional use?
- Payment provider and pricing
- Final premium feature list
- Data retention and account-deletion policy
- Longer-term production hosting/readiness beyond the current Render Free staging setup

Checklist note: unchecked MVP acceptance items above are the final release checklist, not a claim that implemented groundwork is absent. Current verified scope and outstanding checks are recorded in progress.md.
