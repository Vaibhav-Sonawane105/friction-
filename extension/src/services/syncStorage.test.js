import { beforeEach, expect, it, vi } from 'vitest';
let storage, local, session;
beforeEach(async () => {
  vi.resetModules(); local = {}; session = {};
  vi.stubGlobal('chrome', { runtime: {}, storage: {
    local: {
      get: (keys, callback) => callback(structuredClone(Object.fromEntries(keys.map((key) => [key, local[key]])))),
      set: (values, callback) => { Object.assign(local, structuredClone(values)); callback(); },
    },
    session: { get: async (key) => structuredClone({ [key]: session[key] }), set: async (values) => Object.assign(session, values) },
  } });
  storage = await import('./storage'); storage.enableBackgroundWriter();
  await storage.addBlockedDomain('youtube.com');
  await storage.completeUnlock(1, 'youtube.com');
});

it('preserves progression and active sessions for domains retained by a download', async () => {
  const expected = await storage.getBlockedDomains();
  await storage.storageOperations.replaceWebsiteConfig(expected, [
    { domain: 'youtube.com', enabled: true }, { domain: 'reddit.com', enabled: true },
  ]);
  const domains = await storage.getBlockedDomains();
  expect(domains.find((item) => item.domain === 'youtube.com').successfulUnlockCount).toBe(1);
  expect(domains.find((item) => item.domain === 'reddit.com').successfulUnlockCount).toBe(0);
  expect((await storage.getUnlockSessions())['1']).toBeDefined();
});

it('rejects a stale download after concurrent local configuration changes', async () => {
  const expected = await storage.getBlockedDomains();
  await storage.addBlockedDomain('reddit.com');
  await expect(storage.storageOperations.replaceWebsiteConfig(expected, [])).rejects.toThrow(/Local list changed/);
  expect(await storage.getBlockedDomains()).toHaveLength(2);
});

it('accepts count changes during network work without replacing the new count', async () => {
  const expected = await storage.getBlockedDomains();
  await storage.completeUnlock(2, 'youtube.com');
  await storage.storageOperations.replaceWebsiteConfig(expected, [{ domain: 'youtube.com', enabled: true }]);
  expect((await storage.getBlockedDomains())[0].successfulUnlockCount).toBe(2);
});

it('removes tab access when a cloud change disables the website', async () => {
  const expected = await storage.getBlockedDomains();
  await storage.storageOperations.replaceWebsiteConfig(expected, [{ domain: 'youtube.com', enabled: false }]);
  expect(await storage.getUnlockSessions()).toEqual({});
});
