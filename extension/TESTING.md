# Unlock lifecycle verification

Run `npm test`, `npm run lint`, and `npm run build` from `extension/`.

The automated lifecycle tests use asynchronous Chrome API mocks. They verify duplicate requests, concurrent tab unlocks/settings edits, domain boundaries, departures to pages without content scripts, tab closure, worker/browser restart behavior, storage failures and retry, and sender/document validation. They do not replace real Chrome testing.

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
