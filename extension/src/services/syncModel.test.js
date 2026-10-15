import { describe, expect, it } from 'vitest';
import { mergeWebsites, sameConfig, websiteConfig } from './syncModel';

const a = { domain: 'youtube.com', enabled: true };
const b = { domain: 'reddit.com', enabled: true };

describe('three-way website sync', () => {
  it('ignores local counters and order when comparing configuration', () => {
    expect(sameConfig([{ ...a, successfulUnlockCount: 50 }, b], [b, a])).toBe(true);
  });
  it('uploads a first device to an empty cloud', () => expect(mergeWebsites(null, [a], [])).toEqual([a]));
  it('downloads to a new empty device', () => expect(mergeWebsites(null, [], [a])).toEqual([a]));
  it('requires a choice for differing initial lists', () => expect(() => mergeWebsites(null, [a], [b])).toThrow(/Choose/));
  it('preserves independent local additions and cloud removals', () => {
    expect(mergeWebsites([a], [a, b], [])).toEqual([b]);
  });
  it('propagates local deletions rather than reintroducing a cloud record', () => {
    expect(mergeWebsites([a], [], [a])).toEqual([]);
  });
  it('detects a delete versus edit conflict without choosing silently', () => {
    expect(() => mergeWebsites([a], [], [{ ...a, enabled: false }])).toThrow(/two devices/);
  });
  it('detects merged lists over the free limit', () => {
    expect(() => mergeWebsites([], [a, b], [{ domain: 'example.com', enabled: true }])).toThrow(/two websites/);
  });
  it.each([{ list: [{ domain: 'https://example.com/path' }] }, { list: [{ domain: 'bad' }] }, { list: [a, a] }])('rejects invalid cloud configuration %j', ({ list }) => {
    expect(() => websiteConfig(list)).toThrow();
  });
});
