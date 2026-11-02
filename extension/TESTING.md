# Unlock lifecycle verification

Run `npm test`, `npm run lint`, and `npm run build` from `extension/`.

## Testing the redesigned challenges

From `extension/`, run `npm run build:challenge-dev`. In Chrome's extensions page choose **Load unpacked** and select `extension/dist-dev`, or reload that extension if already installed. Use a separate testing profile and disable other copies of Progressive Friction in it. Add a test website in the popup. Open **Development challenge controls**, choose the site and jump to 0, 21, 31 or 51 successful unlocks. Select a type and choose **Prepare next challenge**. Use just one tab on that site when forcing a particular type; the first new attempt consumes the override.

Try maths, memory, route and ordering at each level. Refresh mid-puzzle and check that work remains. Complete the selected challenge, verify the site's count advances once, and leave and return. In ordinary selection, each group of four fresh attempts includes all four types without consecutive repeats. Counts 51+ continue at level 4. The [pilot worksheet](../docs/private-preview/REDESIGN-PILOT.md) separates completion speed from usefulness.

Build checks: `npm test`, `npm run lint`, `npm run build:challenge-dev`, `npm run build` and `npm run build:private-preview`. The development worker verifies all 16 combinations. The private-preview verifier still checks the previous Levels 1–3 design; do not use that build to assess the redesign.

## Modular foundation development build (historical checklist)

The following subsection describes the **earlier** development milestones. It does not describe the current redesigned development build; the private preview remains on the earlier behaviour.

The modular foundation, arithmetic adapter, Level 2 equations and standalone Level 3 tracking/memory/attention are available in the explicit development build and private daily-use preview. Default production builds retain the legacy arithmetic flow until all four levels exist and UI acceptance passes. Level 3 selects one random game per attempt at counts 31–50; completing only that game unlocks. The waiting module remains unimplemented. Level 4 counts display an unavailable message, never an arithmetic substitute. Level 2 and memory have owner-reported acceptance. Tracking has owner-reported acceptance with visual polish deferred (M022); M023 records the corrected single-game rule. Repeatable browser checklists remain below and do not imply every case was observed.

From `extension/`, run `npm run build:challenge-dev`. Load **`C:\Crome Extention\extension\dist-dev`** as an unpacked extension in Chrome. This is a separate output from production `dist`; rebuilding development does not overwrite production. Reload the extension and refresh existing site tabs after a build. Use one build at a time when checking blocking to avoid two extensions overlaying the same page.

Open the popup and use **Development challenge controls**:

1. Select a configured website. Set an exact count or jump to 0, 21, 31 or 51 using the level buttons.
2. Check arithmetic at counts 0 and 20, equations at 21 and 30, then tracking at 31 and 50 (three rounds with 3, 4 and 5 objects). Counts 51/70/71 still report unavailable modules. The panel shows the derived level and available modules.
3. Use **Prepare next challenge** to force an implemented module once. It resets existing challenges/access for that website; refresh must retain the generated prompt/board. At Level 3 explicitly select **tracking**, **memory** or **attention** for repeatable testing. Normal selection randomly chooses one of the three modules for a new attempt; completing that selected game alone unlocks. Refresh must retain the selection rather than reroll it. For equations, **Question type** offers Random, Linear equation, or Derivative at a point. Short-duration controls become usable when the waiting module is implemented.
4. Use **Reset challenge (keep count)** to clear that website's attempts and pending choice without removing it or changing its count. Other websites must retain their data. A late answer from before the reset must not unlock or increment anything.
5. Counts changed for testing remain local and persist. Return each website to its desired count explicitly after testing; removing the testing panel does not automatically undo count edits.

Production `npm run build` scans every emitted JavaScript chunk and fails if development controls leak into it. Production includes neither the panel nor its mutation handlers. It removes saved development test attempts/access on startup while preserving counts and ordinary state. Do not use a runtime toggle or hidden password to enable testing in production.

`npm run build:challenge-dev` also executes the emitted background worker in a DOM-free sandbox that rejects dynamic imports, matching those MV3 restrictions. It checks blocking, arithmetic, both forced Level 2 question types, three-round tracking with worker-validated playback time, six-pair memory boards and all three attention grids. It checks retained prompts/progress, hidden-card projection, mismatch recovery, duplicate actions/completion and popup inspection. This caught the earlier `document is not defined` failure caused by Vite's preload helper. Worker code/pure models use static imports; browser views remain lazy. The sandbox uses Node's experimental VM-module flag and may print its standard notice; it is not a Chrome acceptance test.

After rebuilding, click **Reload** on the installed `dist-dev` extension at `chrome://extensions`, then refresh existing restricted-site tabs. A separately loaded `dist-dev` extension has its own website list; configure the website in that copy's popup.

### Automated evidence and browser acceptance scope

Attention coverage includes three distinct target grids, correct/wrong selections, immutable state, current-stage projection, corrupt-state preservation, seeded board variation, saved selections and stage transitions through refresh/worker restart, stale/duplicate action reconciliation, failed saves, final completion exactly once, tab isolation and browser/reset expiry. Rendered markup verifies labelled tiles, disabled selections and the stylesheet embedded inside the game root for Shadow DOM. CSS motion and actual keyboard focus still require the manual Chrome checks below. No animation library was added.

Latest tracking replacement verification: 267 passing extension tests across 30 files, lint, production build/exclusion scan and development build/emitted-worker smoke. Memory coverage includes six shuffled pairs, preservation of existing four-pair attempts, generated-board diversity, valid saved boards/progress, hidden symbol projection, immutable flips, retained mismatches/matches, static accessible markup, first-flip and match save/restore, stale/duplicate actions, save-failure recovery, all-pairs completion, per-tab isolation, reset and browser-restart expiry. Tracking coverage includes generated swaps, timeline/answer agreement, playback-time validation, per-round persistence, wrong-answer replay, final completion, save retries, duplicate actions and retirement of pattern attempts/overrides. Mounted React timer lifecycle and actual motion still require Chrome testing. This is automated evidence, not observed Chrome acceptance. Earlier checkpoints: patterns had 233 tests; Level 2 had 215; foundation had 199.

The foundation adds progression, model, migration, coordinator, real-background-handler, development-control and build-verifier tests. Coverage includes simultaneous completions, persisted-write/response-loss retry, stale documents during processing, standalone refresh, worker/browser restart, sync retention/disable, count-change invalidation and production test-state cleanup. Run the suite for the current total; the original foundation checkpoint was 199 passing tests across 17 files, superseded by the current 267-test checkpoint above.

**Owner confirms controls and blocking work in Chrome after the MV3 worker fix (2026-10-20).** This does not independently establish every detailed UI/lifecycle case below. The assistant's in-app browser timed out connecting to the local preview and did not expose the installed extension. Keep the following repeatable acceptance checklist and record results separately from mocked/sandbox tests:

- Test the injected overlay and `chrome-extension://<development-extension-id>/blocked.html?target=https%3A%2F%2Fexample.com` after configuring `example.com`.
- Verify keyboard submission, visible focus, small-window layout, loading/error Retry, wrong/correct feedback and no duplicate submission. Retry reloads saved state; after a failed save, the prompt remains the same and you can submit again. A response lost after a successful save must restore completed access without another increment.
- Refresh and navigate within a domain; compare prompts before/after. Open two tabs and complete near-simultaneously. Leave the domain, close/reopen its tab and test Back/Forward.
- Reset/set count while an overlay is open, including the standalone page. Confirm the displayed challenge refreshes and old responses cannot dismiss the new one.
- Stop/restart the worker, then fully restart Chrome; check the documented differences between saved attempts and temporary access. Repeat offline.
- Switch to production and confirm testing controls are absent and saved development attempts/access cannot revive when switching back. Counts remain unchanged by cleanup.

After the remaining levels pass their own acceptance, remove the temporary panel/handlers, override creation and development build option. Keep regression tests and production cleanup for previously saved test state, then repeat release-bundle and lifecycle verification.

Current automated suites cover arithmetic, domain validation, blocking/storage, account messages, sync merging and Render wake-up behavior. The restored `src/services/unlockLifecycle.test.js` adds 26 regression cases using asynchronous Chrome API mocks and the real background message handler. It covers duplicate/concurrent completions, concurrent settings edits, per-tab access, domain departures, committed/iframe navigation, tab closure, sender/document rejection, atomic write failure/retry, remove/toggle invalidation, offline completion and distinct worker/browser restarts. Worker restart is modeled by re-importing production modules with stored data retained; browser restart/reload additionally clears session storage. These tests do not execute Chrome itself or render React UI; retain the manual checks below.

The 26-case lifecycle suite was restored in M016. Production retains ten arithmetic tiers; development supports Levels 1–2 and standalone tracking/memory/attention. Level 4 timer behavior still needs implementation and its own tests. M021 records accepted memory and visuals; M022 records tracking acceptance/attention context; M023 confirms one random game per attempt and synchronizes brain files.

## Level 2 Chrome acceptance (owner reports testing passed; repeatable checklist)

1. Run `npm run build:challenge-dev`, reload the installed `dist-dev` extension at `chrome://extensions` and refresh the restricted-site tabs.
2. In the popup select the configured website and click **Level 2 (21)**. Select **equations**, choose **Linear equation**, then **Prepare next challenge**. The site should ask for x, with one integer solution. For example, `2x + 3 = 11` requires `4`; negative and zero solutions are valid.
3. Enter a wrong answer, refresh and confirm the same equation remains. A correct answer unlocks only that tab and moves count 21 to 22 once. Repeated Enter/clicks must not increment again.
4. Reset count to 21, select **Derivative at a point**, then prepare again. Read the evaluation point: for example `f(x) = 2x² + 3x + 1` at x = 2 requires the numeric derivative `11`, not a symbolic expression. Confirm wrong answers/refresh preserve the function and point, and success increments once.
5. Select **Random**, prepare a new challenge and check both types across several fresh attempts. Forced selection is consumed only after the attempt is saved; it is not a permanent preference. Switch back to Level 1 and check arithmetic still prepares normally.
6. Set count 20, complete arithmetic, leave the domain and return: the next question is Level 2. Set count 30, complete an equation, leave/return: count 31 offers the Level 3 modules. Existing unlocked access still lasts until departure.
7. Repeat with two tabs, offline and after stopping/restarting the worker. Confirm per-tab access, one count per completion, no question reroll on refresh and preservation of the website list/counts. Include the standalone blocked page, keyboard submission and narrow-window layout.

## Level 3 tracking Chrome acceptance (owner accepted; repeatable checklist)

When tracking is selected at counts 31–50, three successful rounds unlock once. No other game is required in that attempt. Each round highlights one target, then shuffles 3, 4 and 5 identical objects with increasing speed. A moving task does not guarantee resistance to AI or automation.

1. Reload the rebuilt `dist-dev` extension and refresh the restricted-site tab. Select its website, **Level 3 (31)**, **tracking**, then **Prepare next challenge**. Start round one, follow the highlighted target through the swaps, and choose its final position. Confirm the motion is readable, objects remain inside the board and the target is hidden after the initial highlight.
2. A wrong position must replay the current round without losing completed rounds. A correct choice advances to the next round without granting access or incrementing the website count. Only the final correct choice unlocks that tab and increments once; rapid duplicate clicks must not skip rounds or add counts.
3. Refresh during playback or before choosing; the current round must require a full replay while retaining completed rounds. Stop/restart the worker and repeat. Switching away from the window/tab must stop playback and require replay. Reset midway and confirm old actions cannot affect the replacement.
4. Enable reduced motion or select **step-by-step**. Confirm the target's starting position and each positional swap are readable at your own pace, then choose the final position. Switch modes midway: replay must be required. Check keyboard Tab/Enter/Space, visible focus and screen-reader labels.
5. Repeat offline, in a narrow window, in two tabs and on the standalone blocked page. The second tab remains independently blocked. A failed save must show Retry; retry must restore saved progress without an extra count. Closing/leaving the tab or restarting Chrome/extension expires the non-timer attempt, preserving counts.
6. At count 50, finish all three rounds, leave and return: Level 4 remains unavailable. Check an existing unfinished pattern attempt is replaced and its old developer override is ignored, while website counts and already valid access survive. Record completion time and judge speed/fairness for later difficulty tuning.

## Level 3 memory Chrome acceptance (owner accepted; repeatable checklist)

When memory is selected at counts 31–50, matching all six pairs unlocks that tab once; no other game is required in that attempt. New boards at every Level 3 count use six pairs in three rows of four; tracking increases its object count and speed across its three rounds. There is no countdown, automatic mismatch timeout or initial board preview.

1. Reload the rebuilt `dist-dev` extension, refresh the restricted-site tab, choose its website in the popup, click **Level 3 (31)**, select **memory**, then **Prepare next challenge**. Expect twelve face-down cards in three rows of four and **0 of 6 pairs matched**. An existing four-pair board is intentionally preserved; explicitly prepare a new memory challenge to test the larger board.
2. Flip one card, refresh and confirm the same card remains visible at the same position. Flip a different symbol: both cards stay visible. Refresh/stop-restart the worker and confirm the same mismatch remains. Select another face-down card: the mismatched pair turns down, revealing the new selection without reshuffling.
3. Find a matching pair. Both cards stay visible and cannot be selected again; the matched-pair count increases, but the website remains blocked and its unlock count stays unchanged. Refresh and confirm the match survives.
4. Finish every pair. Only the sixth match unlocks that tab and increments the website count once. Rapid duplicate clicks must not reveal extra cards, skip matches or add counts. A second tab remains independently blocked.
5. Repeat at count 50 and offline. Test keyboard Tab/Enter/Space, visible focus, shape names, narrow-window layout and the standalone blocked page. After completing count 50, leaving/returning reports Level 4 unavailable. Closing/leaving the tab or restarting Chrome/extension expires the non-timer board, while counts remain.
6. Reset partly through a board and confirm old flips cannot affect the replacement. Reset/configuration changes for this website must not erase other websites. Record approximate completion time for later difficulty tuning; there is no fixed two-minute requirement.

## Level 3 attention Chrome acceptance (pending owner testing)

**Difficulty refinement:** explicitly prepare new attention challenges after reloading. Older saved games remain valid and retain their simpler rules. New attention uses independent shape/colour attributes and deliberate near matches, with filled/outline distinction in stage three. Screen-reader labels include these attributes; visible shape-name captions remain absent. Test the same-shape/same-colour wrong-fill tile in the final stage and confirm that it does not advance progress. No forced delay or full-round reset was added. Recheck completion time through owner testing to tune difficulty; there is no fixed two-minute requirement.

When attention is selected at counts 31–50, completing it alone unlocks that tab. Complete three stages with 12, 16 and 20 tiles, finding all 3, 4 and 5 target shapes respectively. The target changes each stage; wrong clicks preserve progress. There is no deadline or forced delay. Only the last target of stage three grants one standalone unlock. No other game is required in that attempt.

1. Reload the rebuilt `dist-dev` extension and refresh the restricted website. In the popup choose the website, **Level 3 (31)**, **attention**, then **Prepare next challenge**. Expect **Stage 1 of 3**, a target icon and twelve tiles. New games require matching shape and colour together; stage three also requires matching filled versus outlined.
2. Select a near match with the right shape but wrong colour, or the right colour but wrong shape: feedback should appear without changing the grid or found count. Select the target: it stays marked and disabled. Refresh and stop/restart the worker; confirm the same target, tile arrangement and selections return. The website stays blocked and its count stays unchanged.
3. Find every target. Stage two should show a different target and sixteen tiles, with earlier stages retained as completed. Finish it to reach the twenty-tile third stage. Rapid repeat clicks around a transition must not select targets in the next stage. Only the final target in stage three grants access and increments the website count once.
4. Repeat at count 50, offline, with two tabs and on the standalone blocked page. The other tab must remain independently blocked. Reset midway and confirm old selections cannot affect the replacement. Browser/extension restart or leaving/closing the tab follows existing non-timer attempt expiry while counts remain.
5. Check keyboard Tab/Enter/Space, visible focus, target/tile screen-reader labels and narrow-window layout. New stages move focus to their heading. Correct selections have a check mark and colour change; visible shape captions remain absent. Stage fades and tile feedback should work in both the Shadow DOM overlay and standalone page. Enable reduced motion and confirm movement/fades are suppressed without changing game behavior.
6. Record approximate completion time for later difficulty tuning. The CSS transitions (150–180 ms) are visual feedback only; saving, validation and completion do not wait for animation timers. No animation library, new extension permission or backend request was added.

## Required tests for full Levels 1–4 (foundation automated coverage added; remaining modules pending)

Follow [project.md](../brain/project.md#required-modular-challenge-architecture) and phases.md before adding game-specific behavior. Test:

- Progression boundaries separately from module rendering/validation; distinguish level from arithmetic difficulty.
- Registry resolution, supported module/state versions and initialization of only the selected challenge.
- Each module's validation and resource cleanup; no surviving game timers/listeners after disposal.
- Shared completion: valid active attempt succeeds once; duplicate/stale/cross-tab results cannot increment counts or unlock another tab.
- Storage failures and safe retry; modules cannot bypass the common persistence flow.
- Migration from existing arithmetic state without losing website settings or successful-unlock counts; restoration of resumable tasks after restart/update.
- Puzzle keyboard interaction and actual Chrome responsiveness; timer pause/resume across navigation, closure and restart according to the approved rules in ../brain/project.md#approved-level-rules-2026-10-17.
- Website-list sync preserves local module/progression state where appropriate; core challenges work offline.

The manual checks below remain the arithmetic baseline to preserve. The modular foundation has separate automated and owner-reported evidence above; extend acceptance as each later module is implemented. Camera recognition is excluded and needs no tests or scaffolding now.

## Manual Chrome checks

1. Reload the unpacked extension at `chrome://extensions`, pointing to `extension/dist`. Refresh existing website tabs so they use the new content script and message protocol.
2. Add `youtube.com`. Open two tabs on it. Both should show a challenge. Enter a wrong answer, then a correct one. Repeatedly press Enter/click Submit while completing it: only one unlock should be counted for that tab.
3. The other tab must stay blocked. Solve it too. The domain's total should have increased by two, even when both are solved at nearly the same time.
4. Refresh and navigate within the unlocked domain, including a subdomain. Access should remain unlocked and the count must not change.
5. Navigate the unlocked tab to another site, `about:blank`, or `chrome://newtab/`, then return. Each return must require a challenge. A suffix lookalike such as `notyoutube.com` must end the old session too.
6. Close an unlocked tab and open a new tab on the site: it must be blocked. Test Back/Forward restoration as well.
7. Stop the extension's service worker using Chrome's service-worker tooling and let it restart: the existing tab should retain its unlock. Fully exit Chrome and reopen it: temporary unlocks must end, while the domain list and counts survive.
8. Remove a restricted domain while its overlay is visible: it should disappear. Re-add the domain: an old unlock must not grant access. Add/remove another domain while solving a challenge and confirm neither change is lost.
9. Disconnect the network and repeat challenge completion: saving/unlocking still works. A failed extension-storage write should show an error and keep the challenge visible; retry after recovery should count once.

## Implementation notes

All production writes run in the background worker. Browser events and messages are ordered through one worker queue. Unlock completion writes progression and session data in one `chrome.storage.local.set` call. A browser-lifetime identifier in `chrome.storage.session` invalidates old temporary sessions after a browser restart or extension reload, while surviving service-worker restarts. Previous untagged sessions are treated as expired on upgrade; website counts are preserved.

The manifest requires Chrome 106 or later for session storage and document identity APIs. Core enforcement stays local and does not call the backend. This remains an in-page friction overlay, so the restricted site's network requests are not blocked.

Reference: [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage), [Chrome webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation).

## Private daily-use preview

Run `npm run build:private-preview` and load `extension/dist-preview` as unpacked. This build includes the modular Levels 1–3 with developer controls omitted at build time. The emitted-bundle scan rejects control code in any JavaScript chunk, and the worker smoke checks rejected count/prepare/reset/inspect messages, retained challenges at 0/20/21/30/31/50, exactly-once math completion and Level 4 unavailable at 51. The two preview integration tests cover ordinary completion without count-edit access and ignoring stale developer overrides. Latest verification: 269 tests across 31 files.

Before sharing, manually check this exact output in Chrome: a new website starts at zero; popup has no developer panel; wrong/correct answers and refresh work; second tabs remain independent; leave/return requires a fresh challenge. Reuse the level-specific checklists above for gameplay. There is no level-jump UI in this build, so the sandbox/service tests seed boundary fixtures outside the distributed extension. Keep separate copies from blocking the same tab.

The private build is deliberately incomplete at count 51+, as the owner requested; do not substitute an easier game or reset counts. The tester guide explains how to disable/remove a restriction then. Account requests use the production-configured hosted API origin; the preview checks do not establish live API/signup/sync behavior. No account is needed for core testing.

Share the built folder and `docs/private-preview/START_HERE.txt` plus `FEEDBACK.txt`. Do not distribute environment files, source/configuration directories, dependencies or stored browser/profile data. No feedback is submitted automatically. No new brain update is implied by preparation of this preview.
