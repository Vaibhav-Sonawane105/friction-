# Modular challenge foundation

Date: 2026-10-17
Status (2026-10-20): approved design implemented for the development foundation, Level 1 arithmetic and temporary controls. M017 records 199 passing extension tests and owner confirmation that controls/blocking work after the MV3 fix. Detailed browser checklist items remain separately tracked; Levels 2–4 are unimplemented. This document describes their required future integration where noted.

Owner-approved addition: temporary development-only challenge testing controls (2026-10-17).

## Outcome and scope

Make challenge types independently maintainable while preserving local blocking, per-tab access and existing website counts. This design covers the foundation and arithmetic adapter. Equations, puzzles and the waiting timer follow as separate implementation slices using this contract. No new dependency, backend request, cloud data, browser permission or visual redesign is required by the foundation.

The approved product rules in `brain/project.md` remain authoritative. The next challenge uses completed counts: 0–20 arithmetic, 21–30 equations, 31–50 randomly selected pattern or three-pair memory modules, 51+ waiting. Counts never reset during migration. Failed answers do not advance them.

## Architecture choice

Use the existing serialized background writer as the authority for attempts, validation, progression and access. React renders an attempt supplied by that authority. Keep the existing website configuration records and session epoch; add a separately versioned challenge store.

MV3 implementation correction: the service worker cannot use dynamic imports or DOM-dependent preload helpers. Its runtime and pure module models are statically linked through a worker registry, with only the selected model invoked. Registry metadata is shared with the browser registry; interactive views remain independently lazy-loaded. A build-time alias removes the entire development worker implementation from the production graph. The development build verifies its emitted worker in a DOM-free, static-import-only sandbox.

Alternatives considered:

- Putting every challenge into the overlay is initially shorter but couples validation, persistence and lifecycle across games, contrary to the approved architecture.
- A separate engine or event-sourcing framework adds dependencies and recovery machinery that this extension does not currently need.
- The recommended approach adds small modules around the working queue and storage flow, with explicit persisted identities and pure validators.

## Responsibilities and proposed files

- `src/challenges/progression.js`: pure count-to-level policy and arithmetic complexity selection. No React or storage imports.
- `src/challenges/registry.js`: stable module IDs, supported versions, candidate selection and explicit dynamic import loaders. No eager React/game imports.
- `src/challenges/modules/arithmetic/model.js`: generation, persisted-state checks and answer validation; reusable in worker and preview.
- `src/challenges/modules/arithmetic/View.jsx`: arithmetic interaction and accessible feedback.
- `src/services/challenges.js`: attempt creation/restoration, action validation and shared completion coordination.
- `src/services/challengeState.js`: schema validation, migration and challenge-store helpers using existing storage primitives.
- `src/components/blocked/ChallengeShell.jsx`: website identity, level, Leave, loading, error and saving states using existing visual tokens.
- Existing `BlockedOverlay`, background handler and storage service integrate these pieces. Account and website sync remain configuration-only.

File boundaries may be split further for clarity during planning; authority and data ownership must remain as specified here.

## Module contract

Shared metadata declares `id`, `version`, `level` and `persistence`. The browser registry supplies separate `loadModel()` / `loadView()` loaders; the worker registry supplies `loadModel()` backed by statically imported pure models and has no view dependency. IDs are `arithmetic`, `equations`, `pattern`, `memory`, `wait`; only arithmetic is currently registered as available. Future modules are described here, not added as placeholder code.

A model exports pure functions:

```js
createState({ count, random })
validateState(state)
toPublicState(state)
reduceAction({ state, action }) // { state, completed, feedback }
```

Creation receives an injected random source for deterministic tests. The coordinator checks action shape and passes only allowed module actions to the model. A module cannot mutate global storage, counts or sessions. `toPublicState` supplies the view with the prompt and interaction state, excluding answer keys. This reduces accidental coupling; local extension state is not a tamper-proof security boundary.

The React view receives public state, `disabled`, and `onAction(action)`. It owns transient input and display effects; it cleans up every listener, timeout and animation on unmount. Persisted progress is updated through the coordinator. Completion is inferred from validated actions, never accepted as a client-supplied boolean.

Arithmetic adapts the existing generator and validator, with count-based approachable bounds required by the approved Level 1 rules: small addition/subtraction/multiplication, then two operations and exact division, all integer answers. Its exact number bounds and deterministic examples belong in the implementation plan. Wrong answers preserve the prompt.

## Attempts, identities and refresh retention

Every attempt has a UUID, module ID/version, selected level, count at creation, domain identity, revision, status and private module state. Bind runtime requests to the trusted sender's tab and current document, using the existing top-level and document checks. Never use a tab ID from a request body as authority.

Non-timer attempts belong to one tab/domain within the current browser epoch. Refresh and same-domain navigation reattach the new document to the existing attempt and preserve the selected prompt and puzzle state. Leaving the domain, closing the tab, disabling/removing the website or ending the browser epoch invalidates that binding. Returning starts a new attempt. Another tab receives its own attempt.

Challenge selection is fixed when an attempt is created. A completion in another tab may advance the domain count, but does not replace an already displayed challenge. Completing that older valid attempt increments the latest domain count once. A newly created attempt uses the latest count.

## Persistence and migration

Keep `pf_blocked_domains` and `pf_unlock_sessions` compatible with current configuration consumers. Add `pf_challenge_state` containing `schemaVersion: 1`, domain generations, attempts and completion receipts. Domain generations are UUIDs preventing removal/re-addition from reviving an old callback. Existing counts remain the progression source; legacy `difficultyLevel` is retained for compatibility but ceases to select challenge type when the new policy is activated.

Migration runs in the worker queue before serving a challenge request. Missing challenge state initializes an empty versioned store and identities for existing domains. Preserve configured domains, enabled flags, counts, timestamps and any current-epoch sessions. Migration is idempotent. It does not infer counts from legacy difficulty or create completions. Invalid or unknown future schemas show a recoverable error while preserving original stored data; do not overwrite them with defaults. Invalid counts similarly require a surfaced recovery path, not a silent reset.

All completion values—updated website count, tab session, completed attempt and receipt—are passed to one existing `chrome.storage.local.set` operation under the worker queue. This is the project's logical commit boundary, not a database transaction guarantee. On a reported write failure, keep the attempt retryable and grant no UI access. On retry, reread persisted data and use the receipt to avoid double counting even if the previous response was lost. Include failure and worker-restart cases in tests.

Receipts last for the bound attempt's browser epoch and are checked only after sender/domain validation; a receipt cannot revive access after departure. Prune receipts and non-resumable attempts on epoch change and tab/domain invalidation so storage does not grow with historical browsing.

## Message and completion flow

1. Existing status checking decides whether to mount the shared shell.
2. `GET_CHALLENGE` validates the sender and current restriction, migrates state if needed, and creates/restores an attempt. Persist creation before returning the public state.
3. The shell loads only the selected view. Load failure shows Retry and Leave without generating another attempt.
4. `CHALLENGE_ACTION` includes attempt ID, expected revision and module action. The worker validates sender, epoch, domain generation, active binding, module version and revision before invoking the model.
5. Incomplete valid actions persist revised module state where it changes. Wrong arithmetic answers return feedback without rerolling the prompt. A stale revision returns current public state for reconciliation.
6. A validated completion rereads current configuration and count, then commits count + one, access for only this tab, completed attempt and receipt together. The shell dismisses only after confirmed success.
7. Duplicate delivery returns the original successful result while its binding remains valid; navigation, removed domains and cross-tab requests are rejected.

Route all mutations and lifecycle events through the existing worker queue. Replace the client-trusted `COMPLETE_UNLOCK` path when the new protocol activates; leaving an alternate unvalidated completion route would bypass the contract. The preview uses the same coordinator/model interfaces through a local adapter; it does not claim to reproduce Chrome lifecycle behavior.

## Later waiting-module requirements

The foundation reserves the persistence distinction, not an active timer implementation. Waiting is one resumable domain attempt, with duration selected once, remaining milliseconds, owner tab, lease identity and revision. A browser restart clears ownership while retaining saved remaining time. A waiting completion still unlocks only its owner tab.

Its separate design/plan must implement worker-validated ownership, bounded active-time checkpoints, visibility/focus/minimization pause signals, safe ownership handoff and lease expiry. Never subtract wall-clock time since the last visit after restart. Missing signals must conservatively pause rather than credit time away. Abrupt shutdown may lose at most one explicitly bounded checkpoint interval of earned time; it must never credit unobserved time. Exact checkpoint/lease intervals require review in that timer slice, before timer code is written.

## Incremental activation

Build and test the foundation and arithmetic adapter before switching the production challenge selector. Do not map a migrated count of 35 to arithmetic as a fallback for a missing puzzle module. Existing production behavior remains active until every approved count range has an available tested module; the final activation changes policy, protocol and migration together. Foundation tests can exercise the new coordinator directly without exposing a user-facing half-implemented progression system.

This staging preserves working arithmetic while subsequent slices implement equations, independent pattern/memory modules and waiting. No permanent user-facing feature flag or settings control is needed.

## Temporary development testing panel

Provide a visibly marked development panel in the extension popup so the owner and developer can test challenges without accumulating real unlocks. It operates on a selected configured website and displays its current count, derived level, active attempts and any active test override. This is access through a local development build, not personal authentication: anyone using that build can use the controls.

Controls:

- Set the successful-unlock count to an explicit nonnegative safe integer, including exact boundary values.
- Jump to a level by setting its starting count: Level 1 = 0, Level 2 = 21, Level 3 = 31, Level 4 = 51.
- Select a registered challenge within that level, including pattern or memory and, once implemented, linear-equation or derivative variants. The selector lists only implemented options. A forced choice applies to the next new attempt and is consumed when that attempt is persisted; refreshing restores the same attempt rather than rerolling it.
- Choose a short waiting duration, between 1 and 480 whole seconds, for a newly created development waiting attempt. Normal creation still randomly selects 1–8 whole minutes. Short waits use the real timer ownership, pause/resume, persistence and completion logic.
- Reset that website's active challenge state without removing the configured website or changing its count, and clear pending overrides. Clearing an active timer requires an explicit reset action; ordinary refreshes must preserve it.

Count changes and challenge resets are explicit test operations, not successful completions. Send them through development-only messages accepted only from the extension popup with the same extension ID and exact popup URL checks used for account controls. Reject website content-script senders, malformed values, unregistered choices and incompatible level/module combinations. Serialize operations with normal navigation, sync and completion events in the existing worker queue.

Each operation changes only the selected domain. Rotate its domain generation, invalidate its active attempts, receipts and temporary tab access, and clear its saved timer when the operation replaces the challenge. Persist related changes together before notifying affected tabs to refresh their challenge. Late callbacks must fail validation. A test count change does not invent unlock-history events, change website-list configuration or trigger cloud sync. Counts remain device-local. Display a notice that test count changes persist locally; removing the panel does not restore the previous count automatically.

Forced choices and duration overrides are browser-session-only metadata in `chrome.storage.session`. The resulting saved attempt is tagged as development test state, including any overridden duration, so worker restarts and browser restarts can exercise real restoration without losing that identity. Production startup invalidates test-tagged attempts, clears their test-derived access and generates normal challenges at the retained count. It must never resume a short test timer in production. Ordinary user state remains intact. Keep only this production state-validation rule; production includes no testing controls or mutation handlers.

Use a dedicated build-time constant that is false for the default production build, with an explicit development build command for an unpacked Chrome build. Do not rely solely on `import.meta.env.DEV`: an unpacked development extension is also bundled with `vite build`. Gate both popup entry and worker handler imports at build time so the release output has no panel chunks, test operation names or executable test mutation handlers. There is no password, hidden click sequence or runtime toggle that enables them in production. Build outputs must use distinct directories so testing does not overwrite the release artifact.

During incremental development, the development build may exercise the new challenge flow before production activation. Missing modules show an explicit unavailable message and cannot fall back to another challenge. This permits testing each implemented slice through the normal coordinator while the production build retains the existing complete behavior.

After level and lifecycle acceptance, remove the temporary panel, its handler module, override creation logic and development build option. Keep regression coverage and the compatibility rule rejecting previously saved test attempts. Verify the release bundle both before and after removal. The implementation plan must include this removal task so these controls do not become a permanent product feature.

## UI and failure behavior

Preserve current borders, shadows, colors, typography and Leave behavior. Replace tier-only copy with level and module instructions on activation. Give answer inputs semantic labels and keyboard submission. The shared shell supports loading, load failure/retry, wrong answer, state reconciliation, saving, save failure/retry and success. Disable repeated action dispatch while a request is pending. Late responses from disposed views cannot close a newer attempt.

Unknown module/version, missing restriction or state recovery problems must not silently grant access or reset saved work. Removal/disable follows existing enforcement behavior and invalidates outstanding attempts. Sync preserves local state for retained domains and invalidates removed/disabled domains in the same queued settings operation. Re-enabling a domain may retain its count, but receives a fresh attempt binding.

## Verification and acceptance

- Pure progression tests cover 0, 20, 21, 30, 31, 50, 51, 70 and 71, plus invalid counts.
- Registry/model tests verify supported versions, selected-module-only loading, state round trips, answer validation and absence of game-owned access writes.
- Migration tests preserve legacy records/counts and current-epoch access, repeat migration safely and preserve unsupported/corrupt state for recovery.
- Coordinator tests cover duplicate delivery, response loss, concurrent completions in different tabs, stale revisions/documents, domain removal/re-addition, sync races, storage failures and worker/browser restarts.
- Refresh retains the prompt; wrong answers preserve it; count changes in other tabs do not reroll an active attempt.
- View lifecycle checks cover loading Retry, saving failure, keyboard interaction, unmount cleanup and late responses.
- Development controls cover every level jump and exact boundary count, module/variant forcing, short-timer pause/resume, targeted reset, persistence, malformed input, sender rejection and stale completion after a count change. Confirm other websites are unchanged.
- Build a development extension and a default production extension separately. Verify the panel and test handlers work only in development, are absent from all release chunks, and test messages cannot mutate production state. Verify production rejects saved development test attempts and short timers while preserving counts and ordinary state.
- Before release, verify removal of temporary panel code, handler imports and the development build option; repeat release bundle inspection and lifecycle regression checks.
- Run existing extension tests, lint and build. Run backend tests if shared integration behavior changes. Inspect build chunks to verify challenge views are independently loaded and extension asset URLs are resolvable.
- Real Chrome acceptance must cover injected and standalone views, refresh, SPA navigation, two tabs, offline operation, worker restart and browser restart. Unit mocks do not establish Chrome acceptance.

The foundation is complete when these contracts and the arithmetic adapter are verified. Full four-level progression is complete only after the remaining modules and final activation pass their own automated and real-browser acceptance checks.

## Review and repository handling

Owner review of this written spec precedes the implementation plan under the brainstorming workflow. Do not edit `brain/`, commit, push or deploy without the separately required owner permission. The spec records proposed technical decisions; it does not mark roadmap tasks complete.
