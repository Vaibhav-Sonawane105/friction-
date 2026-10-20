# Unlock lifecycle verification

Run `npm test`, `npm run lint`, and `npm run build` from `extension/`.

## Modular foundation development build

The modular foundation and arithmetic adapter are available only in the explicit development build. Default production builds retain the legacy arithmetic flow until all four levels exist. Equations, pattern/memory puzzles and the waiting module are not implemented yet; selecting their counts displays an unavailable message, never an arithmetic substitute.

From `extension/`, run `npm run build:challenge-dev`. Load **`C:\Crome Extention\extension\dist-dev`** as an unpacked extension in Chrome. This is a separate output from production `dist`; rebuilding development does not overwrite production. Reload the extension and refresh existing site tabs after a build. Use one build at a time when checking blocking to avoid two extensions overlaying the same page.

Open the popup and use **Development challenge controls**:

1. Select a configured website. Set an exact count or jump to 0, 21, 31 or 51 using the level buttons.
2. Check arithmetic at counts 0 and 20, then exact transition boundaries 21, 30, 31, 50, 51, 70 and 71. Only Level 1 is playable in this slice. The panel shows the derived level and available modules.
3. Use **Prepare next challenge** to force an implemented module once. It resets existing challenges/access for that website; refresh must retain the generated prompt. Puzzle/variant selectors and short-duration controls become usable when their modules are implemented.
4. Use **Reset challenge (keep count)** to clear that website's attempts and pending choice without removing it or changing its count. Other websites must retain their data. A late answer from before the reset must not unlock or increment anything.
5. Counts changed for testing remain local and persist. Return each website to its desired count explicitly after testing; removing the testing panel does not automatically undo count edits.

Production `npm run build` scans every emitted JavaScript chunk and fails if development controls leak into it. Production includes neither the panel nor its mutation handlers. It removes saved development test attempts/access on startup while preserving counts and ordinary state. Do not use a runtime toggle or hidden password to enable testing in production.

`npm run build:challenge-dev` also executes the emitted background worker in a DOM-free sandbox that rejects dynamic imports, matching those MV3 restrictions. It checks blocking, challenge creation/completion and popup control inspection. This caught the development-only `document is not defined` failure caused by Vite's preload helper. Worker code and pure validators now use static imports; browser views still load on demand. The sandbox uses Node's experimental VM-module flag and may print its standard experimental-feature notice; it is not a Chrome acceptance test.

After rebuilding, click **Reload** on the installed `dist-dev` extension at `chrome://extensions`, then refresh existing restricted-site tabs. A separately loaded `dist-dev` extension has its own website list; configure the website in that copy's popup.

### Automated evidence and pending browser acceptance

The foundation adds progression, model, migration, coordinator, real-background-handler, development-control and build-verifier tests. Coverage includes simultaneous completions, persisted-write/response-loss retry, stale documents during processing, standalone refresh, worker/browser restart, sync retention/disable, count-change invalidation and production test-state cleanup. Run the suite for the current total; the implementation verification currently includes 199 passing tests across 17 files.

**Real Chrome acceptance remains pending.** The available in-app browser timed out connecting to the local preview server, and it did not expose the installed Chrome extension. Automated Chrome API mocks are not browser acceptance. Before considering the foundation accepted:

- Test the injected overlay and `chrome-extension://<development-extension-id>/blocked.html?target=https%3A%2F%2Fexample.com` after configuring `example.com`.
- Verify keyboard submission, visible focus, small-window layout, loading/error Retry, wrong/correct feedback and no duplicate submission. Retry reloads saved state; after a failed save, the prompt remains the same and you can submit again. A response lost after a successful save must restore completed access without another increment.
- Refresh and navigate within a domain; compare prompts before/after. Open two tabs and complete near-simultaneously. Leave the domain, close/reopen its tab and test Back/Forward.
- Reset/set count while an overlay is open, including the standalone page. Confirm the displayed challenge refreshes and old responses cannot dismiss the new one.
- Stop/restart the worker, then fully restart Chrome; check the documented differences between saved attempts and temporary access. Repeat offline.
- Switch to production and confirm testing controls are absent and saved development attempts/access cannot revive when switching back. Counts remain unchanged by cleanup.

After the remaining levels pass their own acceptance, remove the temporary panel/handlers, override creation and development build option. Keep regression tests and production cleanup for previously saved test state, then repeat release-bundle and lifecycle verification.

Current automated suites cover arithmetic, domain validation, blocking/storage, account messages, sync merging and Render wake-up behavior. The restored `src/services/unlockLifecycle.test.js` adds 26 regression cases using asynchronous Chrome API mocks and the real background message handler. It covers duplicate/concurrent completions, concurrent settings edits, per-tab access, domain departures, committed/iframe navigation, tab closure, sender/document rejection, atomic write failure/retry, remove/toggle invalidation, offline completion and distinct worker/browser restarts. Worker restart is modeled by re-importing production modules with stored data retained; browser restart/reload additionally clears session storage. These tests do not execute Chrome itself or render React UI; retain the manual checks below.

The lifecycle suite is restored during preparation step 3. Fresh checkpoint verification passed 110 extension tests across 9 files, plus lint/build; see brain/progress.md M016. Current challenges are ten arithmetic tiers. Planned Levels 1–4 require new boundary, puzzle, timer and migration tests; see ../brain/phases.md.

## Required tests for full Levels 1–4 (foundation automated coverage added; remaining modules pending)

Follow [project.md](../brain/project.md#required-modular-challenge-architecture) and phases.md before adding game-specific behavior. Test:

- Progression boundaries separately from module rendering/validation; distinguish level from arithmetic difficulty.
- Registry resolution, supported module/state versions and initialization of only the selected challenge.
- Each module's validation and resource cleanup; no surviving game timers/listeners after disposal.
- Shared completion: valid active attempt succeeds once; duplicate/stale/cross-tab results cannot increment counts or unlock another tab.
- Storage failures and safe retry; modules cannot bypass the common persistence flow.
- Migration from existing arithmetic state without losing website settings or successful-unlock counts; restoration of resumable tasks after restart/update.
- Puzzle keyboard interaction and actual Chrome responsiveness; timer pause/resume across navigation, closure and restart according to the approved rules in ../brain/project.md#approved-level-rules-2026-10-17-not-implemented.
- Website-list sync preserves local module/progression state where appropriate; core challenges work offline.

The existing manual checks below are the arithmetic baseline to preserve, not evidence the modular system exists. Extend them as each module is implemented. Camera recognition is excluded and needs no tests or scaffolding now.

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
