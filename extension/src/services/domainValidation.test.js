import { beforeEach, expect, it, vi } from 'vitest';
import { websiteConfig } from './syncModel';

let storage, data;
beforeEach(async () => {
  vi.resetModules(); data = {};
  vi.stubGlobal('chrome', { runtime: {}, storage: { local: {
    get: (keys, callback) => callback(Object.fromEntries(keys.map(key => [key, data[key]]))),
    set: (values, callback) => { Object.assign(data, structuredClone(values)); callback(); },
  } } });
  storage = await import('./storage');
  storage.enableBackgroundWriter();
});

const tooLong = [63, 63, 63, 62].map(n => 'a'.repeat(n)).join('.');
it.each(['not a domain', 'localhost', 'a..com', '-a.com', 'a-.com', `${'a'.repeat(64)}.com`, tooLong])(
  'rejects invalid local input %s without changing the list', async input => {
    await expect(storage.addBlockedDomain(input)).rejects.toThrow(/valid website domain/);
    expect(await storage.getBlockedDomains()).toEqual([]);
  });

it.each(['-a.com', 'a-.com', `${'a'.repeat(64)}.com`, tooLong])('rejects invalid cloud domain %s', domain => {
  expect(() => websiteConfig([{ domain, enabled: true }])).toThrow(/invalid domain/);
});

it('normalizes URLs before storage and produces a sync-compatible domain', async () => {
  await storage.addBlockedDomain('https://WWW.YouTube.com/watch?v=private');
  expect(websiteConfig(await storage.getBlockedDomains())).toEqual([{ domain: 'youtube.com', enabled: true }]);
});

it('accepts the 253-character hostname boundary', async () => {
  const domain = [63, 63, 63, 61].map(n => 'a'.repeat(n)).join('.');
  await storage.addBlockedDomain(domain);
  expect(websiteConfig(await storage.getBlockedDomains())[0].domain).toBe(domain);
});

it('allows removal of invalid entries saved by older builds', async () => {
  data.pf_blocked_domains = [{ domain: 'not a domain', enabled: true }];
  await storage.removeBlockedDomain('not a domain');
  expect(await storage.getBlockedDomains()).toEqual([]);
});
