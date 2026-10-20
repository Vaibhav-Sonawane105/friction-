# Modular Challenge Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the reusable challenge coordinator, arithmetic adapter and temporary development testing panel without prematurely activating incomplete Levels 1–4 in production.

**Architecture:** Retain the serialized background writer and existing configuration/session storage. Add versioned attempts, pure module models, lazy views and one validated completion path. Exercise the new path in an explicit development extension build while production retains its current complete arithmetic flow until all levels exist.

**Tech Stack:** JavaScript ES modules, React 19, Vite 8, Vitest, Chrome MV3 and existing Tailwind styles. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-17-modular-challenge-foundation-design.md`

## Global Constraints

- Counts select levels: 0–20 arithmetic, 21–30 equations, 31–50 puzzles, 51+ waiting. Jump targets are 0, 21, 31, 51.
- Keep selected prompts across wrong answers and refresh. Completion increments the latest domain count once and unlocks only the completing tab.
- Preserve domain settings, counts and temporary-session lifecycle during migration. Keep all challenge execution offline.
- Only the background writer mutates extension state; all settings, challenge and lifecycle mutations share its queue.
- Default production output excludes testing UI, chunks and executable handlers. Separate development output must not overwrite `dist`.
- Do not edit `brain/`, commit, push or deploy without owner permission. This overrides skill commit steps.
- Scope here is foundation, arithmetic and testing controls. Equation/puzzle/timer implementation and final production activation require subsequent slice plans.

## Review Focus

- A saved response is lost before UI confirmation: retry returns one receipt and never increments twice (Task 3).
- A domain is removed and re-added while an answer is pending: old generation is rejected (Tasks 2–3).
- A document refresh overlaps an old answer: old document is rejected, prompt remains stable (Task 4).
- Unsupported saved schema survives upgrade untouched, with a visible recovery error (Tasks 2 and 4).
- A development short timer survives into production storage: access and test attempt are invalidated, ordinary counts/state remain (Tasks 2 and 5).

## File map

Create `extension/src/challenges/progression.js`, `registry.js`, `modules/arithmetic/model.js` and `View.jsx` for policy, loaders and arithmetic.

Create `extension/src/services/challengeState.js` for pure schema/migration helpers and `challenges.js` for the coordinator. Extend `storage.js` with internal snapshot read/write operations; preserve existing public settings interfaces.

Create `extension/src/components/blocked/ChallengeShell.jsx` and `ChallengeHost.jsx` for shared chrome and selected-module interaction. Modify `BlockedOverlay.jsx`, `background.js` and `content.jsx` for development-only integration initially.

Create `extension/src/dev/ChallengePanel.jsx`, `challengeControls.js`, and build-verification script `extension/scripts/verify-production-build.js`. Modify popup integration, `package.json` and `vite.config.js`. Place tests adjacent to the production modules using current Vitest conventions.

## Task 1: Pure policy, registry and arithmetic model

**Interfaces:** Produce `getLevel(count): number`, `getArithmeticTier(count): number`, `getModuleDescriptor(id): descriptor`, `selectModuleIds(level): string[]`. Descriptor loaders return model/view modules with the spec's `createState`, `validateState`, `toPublicState`, `reduceAction` exports.

- [ ] Add failing `progression.test.js`, `registry.test.js` and `modules/arithmetic/model.test.js` tests. Assert level results for `[0,20,21,30,31,50,51,70,71]` equal `[1,1,2,2,3,3,4,4,4]`; negative, fractional, nonfinite and unsafe integer counts throw. Unimplemented levels return no available IDs, never arithmetic fallback.
- [ ] Run `npm test -- src/challenges` from `extension/`; confirm failures arise from missing interfaces.
- [ ] Implement pure policy. For arithmetic count 0–20 use tiers 1–5 at counts 0–3, 4–7, 8–11, 12–15, 16–20. Generate operands 1–12 for simple addition/subtraction, multiplication factors 2–9, then two-operation expressions using those bounds and exact division with divisors 2–9. Keep intermediate values/answers integer and absolute answers at most 150. Reuse existing validator semantics; keep the legacy generator untouched for production.
- [ ] Implement arithmetic model state `{ expression, answer }` with strict shape/finite integer validation, public prompt without answer, and action `{ type: 'submit', answer: string }`. A wrong answer returns unchanged state and feedback; a valid correct answer returns `completed: true`.
- [ ] Implement explicit lazy registry with only arithmetic available. Test no view loader runs during policy/model resolution; unknown IDs and versions reject. Add deterministic generated-example tests including exact division and two operations.
- [ ] Run the focused tests; require all pass and check legacy arithmetic tests still pass.

## Task 2: Versioned storage and lifecycle identities

**Interfaces:** Produce `migrateChallengeState({ domains, stored, epoch }): state`, `validateChallengeState(state): void`, `invalidateDomain(state, domain): state`. Add internal `readChallengeSnapshot(): Promise<{ domains, sessions, challengeState, epoch }>` and `writeChallengeSnapshot({ domains, sessions, challengeState }): Promise<void>` in `storage.js`; never expose these through settings messages.

- [ ] Add failing `challengeState.test.js` and storage integration cases covering migration twice, original counts/settings preserved, current-epoch access preserved, unknown schema unchanged, invalid count rejected and new domain generation after remove/re-add.
- [ ] Run `npm test -- src/services/challengeState.test.js src/services/unlockLifecycle.test.js`; establish intended failure.
- [ ] Implement schema version 1 with domain-generation map, attempt map and receipt map. Attempts carry ID, domain/generation, epoch/tab binding, level, count at creation, module/version, revision, status, private state and optional `developmentTest` marker. Receipts carry attempt ID, binding and committed result. Validate deserialized shapes before using them.
- [ ] Add snapshot operations using existing callback/error-aware Chrome storage helpers. Missing schema initializes state; unsupported schema/invalid records return explicit errors without writes. Do not mutate caller objects.
- [ ] Implement invalidation/pruning for removed/disabled domains, closed/departed tabs and changed epoch. Preserve resumable ordinary domain attempts on epoch changes; clear their owner. Production sanitization removes test-tagged attempts and associated access, retaining ordinary settings/counts. Test with a synthetic saved short timer even before the timer module exists.
- [ ] Run focused migration/storage/lifecycle tests and require all pass.

## Task 3: Shared coordinator and idempotent completion

**Interfaces:** Produce `createChallengeCoordinator({ readSnapshot, writeSnapshot, registry, random, uuid, now })` with async `getChallenge(context)` and `dispatchAction(context, { attemptId, revision, action })`. Context is worker-validated `{ tabId, domain, documentId, epoch }`; public results contain attempt ID, revision, module ID/version, level, public state and completion/feedback flags.

- [ ] Add failing `challenges.test.js` cases for restoration, wrong answer retention, revision conflict, valid completion, response-loss retry, cross-tab rejection, generation mismatch and two independent attempts completing against the latest domain count.
- [ ] Run `npm test -- src/services/challenges.test.js`; verify expected missing implementation failures.
- [ ] Implement create-before-return persistence, selected-model-only loading, model state validation and public projection. Restore non-timer attempt by epoch/tab/domain; document authority is checked by the message layer, so refresh reuses the same prompt.
- [ ] Implement revision checking with a reconciliation response. Correct answers commit latest count + one, session, completed attempt and receipt in one snapshot write. A valid receipt returns original result; an invalid binding never restores access. Failed storage leaves no in-memory successful result and retry rereads storage.
- [ ] Add write-failure, persisted-write/lost-response, worker re-creation and domain remove/re-add tests. Verify no code path increments count based on a client completion boolean.
- [ ] Run coordinator, storage and existing lifecycle suites; require all pass. Keep coordinator calls queue-owned, not independently racing background events.

## Task 4: Challenge shell and development-flow integration

**Interfaces:** Produce `ChallengeHost({ domain, onUnlocked, onLeave })` using `GET_CHALLENGE` and `CHALLENGE_ACTION`; `ChallengeShell` receives level, instructions, status, error, retry/leave callbacks and module children. Arithmetic `View` receives `{ state, disabled, onAction }`.

- [ ] Add failing message-handler tests in `challengeMessages.test.js` for top-level same-extension sender checks, trusted tab lookup, stale document, disabled domain, unsupported schema response and retained prompt after a new document attaches. Reuse asynchronous Chrome mocks from `unlockLifecycle.test.js`.
- [ ] Run that file and confirm expected failures before adding routing.
- [ ] In `background.js`, route the new protocol through the existing queue and verified context. Gate this initial route with `__PF_CHALLENGE_DEV__`; ordinary production continues its existing complete protocol until later activation. The new flow must not expose `COMPLETE_UNLOCK` as an alternate bypass in development mode.
- [ ] Implement shared shell and arithmetic view with existing CSS/tokens, semantic input label, keyboard form submission, explicit Retry and Leave. Add request sequence/disposal guards, pending-action disablement and no close before successful persistence. Reconcile stale revisions with current state.
- [ ] Integrate `ChallengeHost` in development builds of `BlockedOverlay`; on domain invalidation remount/reload the relevant attempt even if the overlay was already present. Verify late old responses cannot close the replacement. Keep the standalone page functional through the same trusted target checks.
- [ ] Run `npm test`, `npm run lint`, and `npm run build`. Verify output loads lazy assets with existing manifest rules; change asset declarations only if the generated chunks require it, without adding permissions. Record actual browser rendering/cleanup acceptance in Task 6; do not claim mock tests cover React rendering.

## Task 5: Temporary development panel and build exclusion

**Interfaces:** Produce development-only `handleChallengeControl(message, sender)` accepting `SET_COUNT`, `PREPARE_CHALLENGE`, `RESET_CHALLENGE`. Arguments specify domain, optional safe integer count, implemented module/variant, and optional integer `durationSeconds` in 1–480 for waiting only. Overrides live in session storage and are consumed after attempt persistence.

- [ ] Add failing `challengeControls.test.js` tests for jump targets `[0,21,31,51]`, invalid counts/durations, content-script sender rejection, unsupported level/module/variant, unrelated-domain preservation and stale completion after reset/count change.
- [ ] Run the focused file; confirm failures before implementation.
- [ ] Add Vite constant `__PF_CHALLENGE_DEV__`, true only for explicit mode `challenge-dev`. Add `build:challenge-dev` command targeting `dist-dev`; default build remains `dist` with false constant. Configure test globals explicitly where the runtime gate is imported.
- [ ] Implement popup panel with domain selector, count editor, four jump buttons, implemented-module selector and reset. Show derived level, pending override, development label and local-count persistence notice. Unimplemented levels can have their count set but show unavailable in the challenge UI. Duration/variant controls appear only as matching modules become available.
- [ ] Add development-only dynamic imports in popup and worker. Validate exact popup sender URL/extension ID. Serialize count/reset mutations, rotate selected domain generation, revoke selected-domain access, clear replaced attempt/timer and receipts, commit once, then notify affected tabs. Preserve website configuration and do not schedule cloud sync for these actions.
- [ ] Handle session override persistence failure before changing persistent state. Consume overrides by storing their identity on the saved attempt before clearing session metadata; replay after a failed cleanup must recognize consumption instead of applying it twice.
- [ ] Add production bundle verifier checking every emitted JavaScript chunk for distinctive panel/operation sentinels and test handler chunk names; invoke it after default build. Verify no test registration path exists in a production-mode handler test. Add retained-state transition test proving production rejects development test attempts/access.
- [ ] Run `npm test`, lint, development build, default build and production verifier. Both outputs must build, development controls must exist only in `dist-dev`, and release checks must pass without excluding emitted chunks from inspection.

## Task 6: Browser acceptance and handoff to remaining slices

**Files:** Update `extension/TESTING.md` with actual new commands and acceptance checklist; keep `brain/` unchanged. Any limitations belong in the handoff, not as completed checkboxes.

- [ ] Load `dist-dev` as an unpacked extension. Check arithmetic at counts 0/20, wrong/correct answers, refresh retention, keyboard use, load/save errors, same-domain navigation, two tabs, departure/return, worker restart and browser restart. Verify one completion, per-tab access and cleaned-up resources. If browser access is unavailable, leave this step pending and provide executable manual steps.
- [ ] Set counts 21/31/51 and verify unavailable modules are explicit and never replaced by arithmetic. Reset one domain while a second domain has an active attempt; verify only the selected domain changes. Verify old callbacks cannot complete after reset.
- [ ] Load default `dist` separately and confirm panel absence and unchanged legacy arithmetic behavior. Verify production bundle checks and saved-test-state rejection.
- [ ] Run final extension tests, lint and both builds once after changes. Report command outcomes and distinguish automated from real-browser evidence.
- [ ] Document subsequent slice order: equations; independently registered pattern/memory; waiting with reviewed lease/checkpoint intervals; full-range production activation. Each slice extends development selectors and tests through the real coordinator.
- [ ] Carry a mandatory final release task forward: after every level and lifecycle passes acceptance, remove `src/dev`, test override creation, panel imports and `build:challenge-dev`; retain regression tests and production saved-test-state rejection. Repeat release bundle inspection and full lifecycle tests. Do not remove controls before the owner has finished testing.

## Completion boundary

This plan completes the foundation and an arithmetic development flow, not the four-level product. Production activation is deferred until every count range has its intended verified module. No commits, deployment, brain updates or release publication are part of this execution authorization.
