import { createRoot } from 'react-dom/client';
import { BlockedOverlay } from './components/blocked/BlockedOverlay';
import inlineStyles from './index.css?inline';

let overlayHost = null;
let overlayRoot = null;

/**
 * Pauses background audio/video if running on a site like YouTube while blocked.
 */
function pauseHostMedia() {
  try {
    const mediaEls = document.querySelectorAll('video, audio');
    mediaEls.forEach((media) => {
      if (!media.paused) {
        media.pause();
      }
    });
  } catch {
    // Ignore DOM access issues
  }
}

/**
 * Mounts the Neo-Brutalist challenge popup inside an isolated Shadow DOM.
 */
function mountBlockedOverlay({ domain, difficultyLevel, tabId }) {
  if (overlayHost) {
    return; // Already mounted
  }

  // Create host container
  overlayHost = document.createElement('div');
  overlayHost.id = 'progressive-friction-root';
  overlayHost.style.position = 'fixed';
  overlayHost.style.top = '0';
  overlayHost.style.left = '0';
  overlayHost.style.width = '100vw';
  overlayHost.style.height = '100vh';
  overlayHost.style.zIndex = '2147483647';
  overlayHost.style.pointerEvents = 'auto';

  // Attach Shadow DOM for 100% style isolation
  const shadowRoot = overlayHost.attachShadow({ mode: 'open' });

  // 1. Injected compiled Tailwind / Neo-Brutalist CSS
  const styleEl = document.createElement('style');
  styleEl.textContent = inlineStyles;
  shadowRoot.appendChild(styleEl);

  // 2. Injected font links
  const fontLink1 = document.createElement('link');
  fontLink1.rel = 'stylesheet';
  fontLink1.href = 'https://fonts.googleapis.com/earlyaccess/jejugothic.css';
  shadowRoot.appendChild(fontLink1);

  const fontLink2 = document.createElement('link');
  fontLink2.rel = 'stylesheet';
  fontLink2.href =
    'https://fonts.googleapis.com/css2?family=Istok+Web:ital,wght@0,400;0,700;1,400;1,700&display=swap';
  shadowRoot.appendChild(fontLink2);

  // 3. React Mount Target
  const appContainer = document.createElement('div');
  appContainer.id = 'progressive-friction-app';
  shadowRoot.appendChild(appContainer);

  // Lock host scrolling
  if (document.documentElement) {
    document.documentElement.style.overflow = 'hidden';
  }
  if (document.body) {
    document.body.style.overflow = 'hidden';
  }

  // Mount React Component
  overlayRoot = createRoot(appContainer);
  overlayRoot.render(
    <BlockedOverlay
      domain={domain}
      difficultyLevel={difficultyLevel}
      tabId={tabId}
      onUnlocked={unmountBlockedOverlay}
    />
  );

  // Append host element to documentElement (available at document_start)
  const targetParent = document.documentElement || document.body;
  if (targetParent) {
    targetParent.appendChild(overlayHost);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      (document.documentElement || document.body).appendChild(overlayHost);
    });
  }

  // Pause distracting media playback
  pauseHostMedia();
  const mediaInterval = setInterval(pauseHostMedia, 600);
  overlayHost._mediaInterval = mediaInterval;
}

/**
 * Unmounts the overlay and restores normal page browsing.
 */
function unmountBlockedOverlay() {
  if (overlayHost?._mediaInterval) {
    clearInterval(overlayHost._mediaInterval);
  }

  // Restore scrolling
  if (document.documentElement) {
    document.documentElement.style.overflow = '';
  }
  if (document.body) {
    document.body.style.overflow = '';
  }

  if (overlayRoot) {
    try {
      overlayRoot.unmount();
    } catch {
      // Ignore unmount error if already cleaned up
    }
    overlayRoot = null;
  }

  if (overlayHost) {
    overlayHost.remove();
    overlayHost = null;
  }
}

/**
 * Queries the extension background worker to check if the current page should be blocked.
 */
async function evaluateCurrentPage() {
  // Never block browser internals or extension pages
  const url = window.location.href;
  if (
    !url ||
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:')
  ) {
    return;
  }

  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_TAB_STATUS',
      url,
    });

    if (window.location.href !== url) return;
    if (!response || response.success === false) {
      throw new Error(response?.error || 'Could not check restriction status.');
    }

    if (response?.shouldBlock) {
      mountBlockedOverlay({
        domain: response.matchedDomain,
        difficultyLevel: response.difficultyLevel || 1,
        tabId: response.tabId,
      });
    } else {
      // If previously blocked but now unlocked or navigating away to an allowed url
      if (overlayHost) {
        unmountBlockedOverlay();
      }
    }
  } catch (err) {
    console.debug('[Progressive Friction] Status check warning:', err);
  }
}

// Initial evaluation as soon as script runs
evaluateCurrentPage();

// Also re-check once DOM is ready (in case document_start was before documentElement was fully ready)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', evaluateCurrentPage);
}

// Listen for SPA navigation and URL changes
window.addEventListener('popstate', evaluateCurrentPage);
window.addEventListener('hashchange', evaluateCurrentPage);
window.addEventListener('pageshow', evaluateCurrentPage);

// Listen for messages from background service worker (e.g. TAB_URL_UPDATED)
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'TAB_URL_UPDATED') {
      evaluateCurrentPage();
    }
  });
}
