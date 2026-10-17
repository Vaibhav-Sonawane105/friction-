# Unlock lifecycle verification

Run `npm test`, `npm run lint`, and `npm run build` from `extension/`.

Current automated suites cover arithmetic, domain validation, blocking/storage, account messages, sync merging and Render wake-up behavior. The restored `src/services/unlockLifecycle.test.js` adds 26 regression cases using asynchronous Chrome API mocks and the real background message handler. It covers duplicate/concurrent completions, concurrent settings edits, per-tab access, domain departures, committed/iframe navigation, tab closure, sender/document rejection, atomic write failure/retry, remove/toggle invalidation, offline completion and distinct worker/browser restarts. Worker restart is modeled by re-importing production modules with stored data retained; browser restart/reload additionally clears session storage. These tests do not execute Chrome itself or render React UI; retain the manual checks below.

The lifecycle suite is restored during preparation step 3. Fresh checkpoint verification passed 110 extension tests across 9 files, plus lint/build; see brain/progress.md M016. Current challenges are ten arithmetic tiers. Planned Levels 1–4 require new boundary, puzzle, timer and migration tests; see ../brain/phases.md.

## Required tests for the modular foundation and Levels 1–4 (not implemented yet)

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
