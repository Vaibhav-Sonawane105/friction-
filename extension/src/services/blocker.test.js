import { describe, it, expect } from 'vitest';
import { evaluateNavigation } from './blocker';

describe('Blocker Evaluator', () => {
  const blockedList = [
    { domain: 'youtube.com', enabled: true },
    { domain: 'reddit.com', enabled: true },
    { domain: 'twitter.com', enabled: false }, // disabled
  ];

  it('allows unblocked websites', () => {
    const res = evaluateNavigation('https://github.com', 123, blockedList, {});
    expect(res.shouldBlock).toBe(false);
  });

  it('blocks configured websites when no active unlock session exists', () => {
    const res = evaluateNavigation('https://www.youtube.com/watch?v=1', 123, blockedList, {});
    expect(res.shouldBlock).toBe(true);
    expect(res.matchedDomain).toBe('youtube.com');
  });

  it('allows navigation if the domain is disabled', () => {
    const res = evaluateNavigation('https://twitter.com', 123, blockedList, {});
    expect(res.shouldBlock).toBe(false);
  });

  it('allows navigation if tab has an active unlock session for that domain', () => {
    const activeSessions = {
      '123': { domain: 'youtube.com' },
    };

    const res = evaluateNavigation('https://www.youtube.com/feed/subscriptions', 123, blockedList, activeSessions);
    expect(res.shouldBlock).toBe(false);
  });

  it('blocks another tab visiting the same domain without its own unlock session', () => {
    const activeSessions = {
      '123': { domain: 'youtube.com' },
    };

    const res = evaluateNavigation('https://www.youtube.com', 456, blockedList, activeSessions);
    expect(res.shouldBlock).toBe(true);
  });

  it('never blocks chrome-extension or chrome:// internal URLs', () => {
    const res = evaluateNavigation('chrome-extension://xyz/blocked.html', 123, blockedList, {});
    expect(res.shouldBlock).toBe(false);
  });
});
