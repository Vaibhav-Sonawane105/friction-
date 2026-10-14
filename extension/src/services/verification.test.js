import { describe, it, expect, beforeEach } from 'vitest';

// Create an in-memory store for chrome.storage.local
const memoryStore = {};

globalThis.chrome = {
  storage: {
    local: {
      get: (keys, cb) => {
        const res = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          if (memoryStore[k] !== undefined) {
            res[k] = memoryStore[k];
          }
        }
        cb(res);
      },
      set: (items, cb) => {
        Object.assign(memoryStore, items);
        if (cb) cb();
      },
      clear: (cb) => {
        for (const k in memoryStore) delete memoryStore[k];
        if (cb) cb();
      },
    },
  },
  runtime: {
    getURL: (path) => `chrome-extension://test-id/${path}`,
  },
  tabs: {
    create: () => {},
    remove: () => {},
    sendMessage: () => Promise.resolve(),
  },
};

// Now import services
import {
  getBlockedDomains,
  addBlockedDomain,
  removeBlockedDomain,
  recordSuccessfulUnlock,
  setTabUnlocked,
  getUnlockSessions,
  clearTabSession,
} from './storage';
import { getStatusForTab } from '../background';
import { generateChallenge, validateAnswer, MAX_DIFFICULTY_LEVEL } from '../utils/mathGenerator';

describe('Phase 1 Verification: Core Extension Scenarios', () => {
  beforeEach(async () => {
    // Clear storage before each test
    for (const k in memoryStore) delete memoryStore[k];
  });

  describe('Scenario 1: Blocking and Unlocking Across Multiple Websites', () => {
    it('manages multiple blocked domains independently and respects free limit', async () => {
      // 1. Add youtube.com and reddit.com (up to 2 free websites)
      await addBlockedDomain('youtube.com');
      await addBlockedDomain('reddit.com');

      const domains = await getBlockedDomains();
      expect(domains).toHaveLength(2);
      expect(domains.map((d) => d.domain)).toEqual(['youtube.com', 'reddit.com']);

      // 2. Reject 3rd website on free tier
      await expect(addBlockedDomain('twitter.com')).rejects.toThrow(/limit reached/i);

      // 3. Both websites should be blocked initially for Tab 1
      const tab1Youtube = await getStatusForTab(1, 'https://www.youtube.com');
      expect(tab1Youtube.shouldBlock).toBe(true);
      expect(tab1Youtube.matchedDomain).toBe('youtube.com');

      const tab1Reddit = await getStatusForTab(1, 'https://www.reddit.com/r/programming');
      expect(tab1Reddit.shouldBlock).toBe(true);
      expect(tab1Reddit.matchedDomain).toBe('reddit.com');

      // 4. Unlock youtube.com for Tab 1
      await setTabUnlocked(1, 'youtube.com');

      // 5. Verify youtube.com is now unlocked for Tab 1, but reddit.com remains blocked
      const tab1YoutubeAfter = await getStatusForTab(1, 'https://www.youtube.com');
      expect(tab1YoutubeAfter.shouldBlock).toBe(false);

      const tab1RedditAfter = await getStatusForTab(1, 'https://www.reddit.com/r/technology');
      // Tab 1 navigated to reddit, so session for youtube expires and reddit is blocked!
      expect(tab1RedditAfter.shouldBlock).toBe(true);
      expect(tab1RedditAfter.matchedDomain).toBe('reddit.com');

      // 6. Test removing a domain
      await removeBlockedDomain('reddit.com');
      const domainsAfterRemove = await getBlockedDomains();
      expect(domainsAfterRemove).toHaveLength(1);
      expect(domainsAfterRemove[0].domain).toBe('youtube.com');

      // reddit is no longer blocked
      const tab1RedditRemoved = await getStatusForTab(1, 'https://www.reddit.com');
      expect(tab1RedditRemoved.shouldBlock).toBe(false);
    });
  });

  describe('Scenario 2: Refreshes, Same-Domain Navigation, and Leaving Domain', () => {
    it('preserves unlock session on same-domain navigation and refreshes', async () => {
      await addBlockedDomain('youtube.com');
      await setTabUnlocked(10, 'youtube.com');

      // 1. First visit - unlocked
      const visit1 = await getStatusForTab(10, 'https://www.youtube.com/');
      expect(visit1.shouldBlock).toBe(false);

      // 2. Same-domain navigation to watch a video - remains unlocked
      const visit2 = await getStatusForTab(10, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(visit2.shouldBlock).toBe(false);

      // 3. Page refresh on the same video URL - remains unlocked
      const refresh = await getStatusForTab(10, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(refresh.shouldBlock).toBe(false);

      // 4. Subdomain navigation within same domain (e.g. music.youtube.com) - remains unlocked
      const musicSub = await getStatusForTab(10, 'https://music.youtube.com/explore');
      expect(musicSub.shouldBlock).toBe(false);
    });

    it('expires the session when leaving the domain for another website', async () => {
      await addBlockedDomain('youtube.com');
      await setTabUnlocked(20, 'youtube.com');

      // Tab 20 is unlocked for youtube
      expect((await getStatusForTab(20, 'https://www.youtube.com')).shouldBlock).toBe(false);

      // Tab 20 navigates away to google.com (leaving the domain)
      const externalVisit = await getStatusForTab(20, 'https://www.google.com/search?q=test');
      expect(externalVisit.shouldBlock).toBe(false); // Google is not in blocked list

      // Verify unlock session was cleared
      const sessions = await getUnlockSessions();
      expect(sessions['20']).toBeUndefined();

      // Tab 20 returns to youtube.com - must be BLOCKED and require challenge again
      const returnVisit = await getStatusForTab(20, 'https://www.youtube.com');
      expect(returnVisit.shouldBlock).toBe(true);
      expect(returnVisit.matchedDomain).toBe('youtube.com');
    });
  });

  describe('Scenario 3: Multiple Tabs and Session Persistence', () => {
    it('isolates unlock sessions between different tabs', async () => {
      await addBlockedDomain('reddit.com');

      // Tab 100 unlocks reddit
      await setTabUnlocked(100, 'reddit.com');
      const tab100 = await getStatusForTab(100, 'https://www.reddit.com');
      expect(tab100.shouldBlock).toBe(false);

      // Tab 200 visits reddit - must still be BLOCKED
      const tab200 = await getStatusForTab(200, 'https://www.reddit.com');
      expect(tab200.shouldBlock).toBe(true);
      expect(tab200.matchedDomain).toBe('reddit.com');
    });

    it('cleans up session when a tab is removed/closed', async () => {
      await addBlockedDomain('youtube.com');
      await setTabUnlocked(300, 'youtube.com');

      expect((await getUnlockSessions())['300']).toBeDefined();

      // Simulate tab close
      await clearTabSession(300);

      expect((await getUnlockSessions())['300']).toBeUndefined();
    });

    it('persists blocked domains and difficulty tiers in storage across restarts', async () => {
      await addBlockedDomain('youtube.com');
      await recordSuccessfulUnlock('youtube.com');

      // Simulate browser restart by reading from persisted memory store
      const persistedDomains = await getBlockedDomains();
      expect(persistedDomains).toHaveLength(1);
      expect(persistedDomains[0].domain).toBe('youtube.com');
      expect(persistedDomains[0].difficultyLevel).toBe(2);
      expect(persistedDomains[0].successfulUnlockCount).toBe(1);
    });
  });

  describe('Scenario 4: Difficulty Progression Rule Enforcement', () => {
    it('increments difficulty level and unlock count exactly once per successful unlock', async () => {
      await addBlockedDomain('youtube.com');
      await addBlockedDomain('reddit.com');

      let domains = await getBlockedDomains();
      expect(domains.find((d) => d.domain === 'youtube.com').difficultyLevel).toBe(1);
      expect(domains.find((d) => d.domain === 'youtube.com').successfulUnlockCount).toBe(0);

      // Solve 1st challenge for youtube
      const record1 = await recordSuccessfulUnlock('youtube.com');
      expect(record1.difficultyLevel).toBe(2);
      expect(record1.successfulUnlockCount).toBe(1);

      // Verify reddit difficulty remained unaffected (independent progression)
      domains = await getBlockedDomains();
      expect(domains.find((d) => d.domain === 'reddit.com').difficultyLevel).toBe(1);
      expect(domains.find((d) => d.domain === 'reddit.com').successfulUnlockCount).toBe(0);

      // Multiple page navigations/refreshes do NOT increment tier
      await getStatusForTab(1, 'https://www.youtube.com/watch?v=1');
      await getStatusForTab(1, 'https://www.youtube.com/watch?v=2');
      domains = await getBlockedDomains();
      expect(domains.find((d) => d.domain === 'youtube.com').difficultyLevel).toBe(2);
      expect(domains.find((d) => d.domain === 'youtube.com').successfulUnlockCount).toBe(1);

      // Solve 2nd challenge for youtube
      const record2 = await recordSuccessfulUnlock('youtube.com');
      expect(record2.difficultyLevel).toBe(3);
      expect(record2.successfulUnlockCount).toBe(2);
    });

    it('caps difficulty at MAX_DIFFICULTY_LEVEL (Tier 10)', async () => {
      await addBlockedDomain('youtube.com');

      // Increment 12 times
      for (let i = 0; i < 12; i++) {
        await recordSuccessfulUnlock('youtube.com');
      }

      const domains = await getBlockedDomains();
      const yt = domains.find((d) => d.domain === 'youtube.com');
      expect(yt.difficultyLevel).toBe(MAX_DIFFICULTY_LEVEL);
      expect(yt.difficultyLevel).toBe(10);
      expect(yt.successfulUnlockCount).toBe(12);
    });
  });

  describe('Scenario 5: Complete Offline Resilience', () => {
    it('generates, validates, and evaluates blocking without any network requests', async () => {
      // 1. Math challenge generator works offline
      const challenge = generateChallenge(3);
      expect(challenge.difficulty).toBe(3);
      expect(validateAnswer(challenge.answer, challenge.answer)).toBe(true);
      expect(validateAnswer('wrong', challenge.answer)).toBe(false);

      // 2. Storage operations work completely offline in local storage
      await addBlockedDomain('youtube.com');
      const status = await getStatusForTab(999, 'https://www.youtube.com');
      expect(status.shouldBlock).toBe(true);
      expect(status.difficultyLevel).toBe(1);

      // 3. Unlock and progression execute synchronously and locally
      await recordSuccessfulUnlock('youtube.com');
      await setTabUnlocked(999, 'youtube.com');

      const unlockedStatus = await getStatusForTab(999, 'https://www.youtube.com');
      expect(unlockedStatus.shouldBlock).toBe(false);
    });
  });
});
