# Progressive Friction challenge redesign implementation plan

> **For agentic workers:** Use superpowers:executing-plans for native execution or superpowers:subagent-driven-development for delegated execution. Steps use checkboxes.

**Goal:** Deliver four rotating, level-scaled active challenges that still require meaningful effort after practice.
**Architecture:** Keep the existing tab-bound coordinator as the only writer of unlocks. Register versioned models in the static worker registry and lazy views in the browser registry. Store rotation history alongside the corresponding domain's challenge state.
**Tech stack:** Existing MV3, React, Vite and Vitest. No new dependencies, permissions, backend service or telemetry.
**Spec:** [Approved challenge design](../specs/2026-11-01-challenge-redesign-design.md). Read both documents; the spec supplies numerical bounds, UX rules and acceptance criteria.

## Global constraints

- Keep successful-count bands 0–20 / 21–30 / 31–50 / 51+. Active work targets 15–30 / 30–45 / 45–75 / 75–120 seconds; elapsed time never grants or delays access.
- All four types are eligible at every level. Select once per attempt. Maths retains answered questions; memory retains matches; route accepts any valid path; ordering identifies broken clues only after submission.
- Preserve local state, offline access controls, existing browser-session boundaries and exactly-once completion. Errors offer Retry/Leave, never fallback access.
- Work on main; preserve unrelated preview changes. Do not stage, commit, push, change brain files or publish a build. Build development first; gate preview activation on verified development behaviour and owner testing. Default production stays legacy.
- Paths below are relative to extension/ unless explicitly prefixed with repository root. Run npm commands from extension/. For each test-first task, run its named test before implementation and confirm the intended failure; rerun after implementation and require PASS. Keep each task's tests as regressions.

## Review focus

1. Legacy memory boards survive format changes, including mismatched revealed cards (tasks 2 and 7).
2. Two queued tabs cross a count boundary without rerolling either active puzzle (task 7).
3. Forced generator exhaustion returns a verified same-level reserve or a recoverable error (tasks 1 and 6).
4. Equivalent operator assignments and alternative route solutions pass even if different from the generator witness (tasks 3 and 4).
5. An ordering correction made by keyboard removes stale error indications and preserves the row on refresh (task 5).

## File map and work sequence

Tasks 1–5 prepare pure modules and matching views without switching selection in any build. Task 6 connects them in development. Task 7 covers the stored-state transition and lifecycle; develop and verify these changes together before anyone uses the development build with existing data. Task 8 verifies the built extension and gates preview promotion. Shared module interface throughout: createState({count, random, history}), validateState(state), toPublicState(state), reduceAction({state, action, now}) returning {state, completed, feedback}. Use the existing view contract and dispatch path; no view writes storage.

### 1. Difficulty profiles and bounded generation

Files: create src/challenges/profiles.js, generation.js and their colocated .test.js files; retain progression.js for the count policy.

- [ ] Test all four profiles; for example expect(getProfile(3).memoryPairs).toBe(6) and expect(getProfile(4).routeCheckpoints).toBe(5). Force a candidate and reserve validator to reject every candidate; assert bounded attempts and an error. With a valid reserve assert same level/type and independent cloned state.
- [ ] Run npm test -- profiles.test.js generation.test.js; confirm missing behaviour. Implement getProfile(level), generateVerified({make,validate,reserves,maxAttempts,random,recent,fingerprint}) returning a verified puzzle. Encode the exact profile table and maths bounds from the spec; reject invalid levels. Bound solver work separately inside relevant validators.
- [ ] Repeat the tests; verify reserve selection avoids recent identical fingerprints when possible and never substitutes a different type.

### 2. Memory v2 while retaining v1

Files: src/challenges/modules/memory/model.js, View.jsx, model.test.js, View.test.jsx; create v1.js for the old model; update src/challenges/components/ShapeSymbol.jsx.

- [ ] Preserve old model behaviour in v1.js. Write tests for all four pair counts, restore with two mismatches, old 8/12-card board validation, and distinct visible symbols for eight identities. Assert hidden identities are absent from public values and accessible labels.
- [ ] Run npm test -- src/challenges/modules/memory. Implement v2 using getProfile(level).memoryPairs, a Fisher–Yates shuffle and eight or more shape identities; keep original flip/mismatch action semantics. Update layout and keyboard labels for 6/8/12/16 cards. View reads totalPairs from state, including on old boards.
- [ ] Rerun memory tests; expect current board retained on restore and completion only after the last match.

### 3. Varied maths sets

Files: create src/challenges/modules/maths/{templates.js,model.js,View.jsx,templates.test.js,model.test.js,View.test.jsx}. In this plan braces list individual files, not a literal directory name.

- [ ] Test family selection, bounds, counts [2,2,3,4], unique structural IDs in each set, strict signed integer parsing and kept progress after wrong input. Include an operator-selection fixture with multiple correct assignments and one invalid assignment. Solve expected answers independently of generator-provided answers.
- [ ] Run npm test -- src/challenges/modules/maths. Implement buildMathSet({level,random,history}) with at least three structural templates per family per level. Generate integer solutions first; validate exact division, intermediate bounds and unambiguous clues. Enumerate all allowed operator assignments for the displayed expression. Provide verified same-profile reserve sets. Save the complete set and current index in private state; expose only current prompt, allowed controls and progress.
- [ ] Implement submit actions for integer text and operator choices. Show one question at a time with an accessible label, keyboard submission and progress. No evaluation of user expressions. Rerun tests; assert the final correct submission alone completes the attempt.

### 4. Route planning

Files: create src/challenges/modules/route/{generator.js,solver.js,model.js,View.jsx,model.test.js,solver.test.js,View.test.jsx}.

- [ ] Test that a legal detour passes, diagonals/revisited/blocked cells cannot extend the path, missed or out-of-order checkpoints prevent completion, and undo/clear retain the same board. Assert alternate solutions are accepted. Test generator rejection of corridors without two reachable decision junctions.
- [ ] Run npm test -- src/challenges/modules/route. Implement buildRoute({level,random,history}), solveRoute(board,budget) and the shared model. Generate witness paths, obstacles and checkpoints using the level table, verify with independent bounded search, then use a tested reserve on exhaustion. Ordered checkpoints only at level 4. Save board and current path, not the witness in public state.
- [ ] Implement extend(cell), undo, clear and submit actions. Provide keyboard and pointer controls with visible rules, path and feedback. Rerun tests and verify failed submissions and refresh preserve the path.

### 5. Logical ordering

Files: create src/challenges/modules/ordering/{clues.js,generator.js,model.js,View.jsx,model.test.js,clues.test.js,View.test.jsx}.

- [ ] Test all relation predicates, complete/permutation validation, linked clues, rejection of adjacent-chain/direct-position-only puzzles, unique generated solution and alternative valid orders for a hand-built ambiguous fixture. Assert only violated clue IDs are shown after submission; keyboard reorder keeps the new arrangement and clears obsolete indicators until resubmission.
- [ ] Run npm test -- src/challenges/modules/ordering. Implement brokenClueIds(order,clues) and buildOrdering({level,random,history}); verify solutions by bounded enumeration, up to 7!, using the profile counts. Provide a verified same-profile reserve. Present explicit relation wording including non-immediate “between.” Do not start with a solved row.
- [ ] Implement reorder and submit actions; persist row and submitted feedback, require a full arrangement, support pointer and keyboard. Rerun tests; assert restore reproduces the row and no solution is exposed.

### 6. Registry, rotation and development integration

Files: src/challenges/{catalog.js,registry.js,workerRegistry.js,registry.test.js}; create rotation.js and rotation.test.js in that directory. Update src/services/{challenges.js,challenges.test.js,challengeRuntime.js}, src/dev/{ChallengePanel.jsx,challengeControls.js,challengeControls.test.js}, and build configuration as needed to keep preview on its prior catalog until promotion.

- [ ] Test selectModuleIds(level) yields maths, memory, route, ordering at all levels; version lookup distinguishes memory v1/v2. Test two consecutive bags contain four distinct IDs each and do not repeat across refill. Confirm invalid RNG and failed generation do not consume an assignment.
- [ ] Run npm test -- registry.test.js rotation.test.js challenges.test.js challengeControls.test.js. Implement reserveType({history,choices,random}) returning {moduleId,nextHistory}; persist nextHistory with the new validated attempt in the same coordinator save. Keep last eight maths template IDs and four fingerprints per type. On refresh return existing attempt before selection. Generated state must provide internal fingerprint/template metadata without exposing answers. Development-forced picks bypass bag accounting; restore the saved forced attempt on refresh.
- [ ] Ensure dev selectors cover every level/type and maths family forcing remains development-only; update old tests asserting level-specific types or missing Level 4 for the dev build. Maintain separate build-selected catalog/runtime adapters where needed: the pending preview code shares services, so exercise its previous worker contract before switching it later. Do not delete code still imported by preview or production.
- [ ] Rerun the targeted tests; verify pure models load through static worker imports, views through browser imports only, and shared completion remains sole authority.

### 7. Migration, stale actions and access integrity

Files: src/services/{challengeState.js,challengeState.test.js,challenges.test.js,storage.js}; src/services/challengeRuntime.js and existing storage/lifecycle tests as needed.

- [ ] Seed legacy snapshots with valid sessions/receipts, active retired types and partially revealed memory boards. Test idempotent migration, preserves counts and valid access, no progress transfer across tabs, late retired actions rejected. Test unknown schema preserved without access and storage write failures preserve persisted state. Include old completed attempts: existing same-epoch access and duplicate result delivery must not require loading a retired active model.
- [ ] Run npm test -- challengeState.test.js challenges.test.js. Implement version-aware migration on the redesign path, initialize bounded domain history lazily, prune only obsolete active attempts/overrides, retain old memory readers and retain receipt replay where session remains valid. Serialize with existing settings/completion queue.
- [ ] Add a coordinator test starting at count 20 with simultaneous tabs: both active levels remain fixed, one completion advances to 21, next new attempt is level 2, duplicate delivery does not advance again. Rerun tests, including existing navigation/restart and development-to-production invalidation coverage.

### 8. Verify development, calibrate, then prepare preview

Files: create src/challenges/generation.samples.test.js; update scripts/verify-development-worker.js, scripts/verify-private-preview.js, src/services/privatePreview.test.js, extension/TESTING.md (repository root path) and docs/private-preview/FEEDBACK.txt (repository root path).

- [ ] For 1,000 reproducible seeds per type per level (16,000 samples), validate profile, solvability and public-state privacy independently of generation. Use arithmetic/reference enumeration, route search independent of the witness, ordering permutation checks and memory multiplicities. Emit seed/type/level on failure; exercise reserve and failure paths explicitly.
- [ ] Update emitted-worker checks to exercise creation, restoration, completion and level boundaries for redesigned modules. From extension/ run npm test, npm run lint, npm run build:challenge-dev and npm run build. Require passing tests/checks, working static worker imports and absence of developer controls in production. Run original preview verifier with its current build before promotion to catch accidental coupling.
- [ ] Run real Chrome acceptance in development: both overlay and standalone views, keyboard/pointer, refresh, two tabs, same-domain navigation, offline operation, worker/browser restart, save failure retry and Leave. Record observations separately from automated evidence.
- [ ] Use development controls for the manual pilot: five volunteers × four types × four levels × three exposures across sessions; note practiced median and spread, mistakes, abandonments, frustration and reconsidered visits. Tune profiles with evidence, repeat affected checks and obtain owner acceptance before switching private preview. No automatic telemetry.
- [ ] After that gate, point private preview to the accepted catalog, migration and normal rotation; exercise all four levels in its verifier, including count 51+, unsupported dev messages and emitted-bundle exclusion. Run npm test and npm run build:private-preview. Update private testing instructions and feedback prompts; prepare for owner distribution separately. Keep default production and unrelated local changes untouched. Update brain documentation only when authorized.

**Done means:** code/tests/builds, real-browser results and pilot observations are reported separately. A green build alone is not evidence that real people find the challenges appropriately difficult.

## Execution checkpoint — 2 November 2026

Development implementation and technical verification are complete. The old registry and memory v1 reader remain available to keep the friends’ preview on its previous behaviour. Development selects the new catalog at build time. The independent implementation review found two malformed-board completion paths and gaps in puzzle verification; regression tests, saved-state validation and independent reference checks address those findings.

Evidence: 298 extension tests passed across 34 files, including 1,000 deterministic samples per type and level (16,000 total). Lint and the production, development and prior private-preview build checks passed. The built development worker completed all 16 combinations, restored state and counted duplicate completion once.

Real Chrome 156, using a temporary profile and local fixture site: injected and standalone challenges loaded; pointer and keyboard actions, offline interaction, tab isolation, refresh, worker restart, injected save failure/Retry, Leave, real completion, same-site navigation and browser restart were exercised. A full restart retained the site's successful count and reinstated blocking. The standalone check exposed a document-identity lookup failure; the fix was verified in Chrome.

**Next gate:** run the [human pilot](../../private-preview/REDESIGN-PILOT.md), tune difficulty from observations, and obtain owner acceptance before promoting the redesign to friends’ preview. No human timing data or release acceptance is claimed.

