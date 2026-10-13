import { describe, it, expect } from 'vitest';
import { generateChallenge, validateAnswer, MAX_DIFFICULTY_LEVEL } from './mathGenerator';
import { normalizeDomain, isDomainMatch } from './domain';

describe('Math Challenge Generator', () => {
  it('generates valid challenges for all tiers from 1 to 10', () => {
    for (let level = 1; level <= MAX_DIFFICULTY_LEVEL; level++) {
      for (let run = 0; run < 10; run++) {
        const challenge = generateChallenge(level);
        expect(challenge.difficulty).toBe(level);
        expect(typeof challenge.expression).toBe('string');
        expect(challenge.expression.length).toBeGreaterThan(0);
        expect(Number.isInteger(challenge.answer)).toBe(true);
      }
    }
  });

  it('clamps difficulty outside boundary levels', () => {
    const low = generateChallenge(0);
    expect(low.difficulty).toBe(1);

    const high = generateChallenge(99);
    expect(high.difficulty).toBe(MAX_DIFFICULTY_LEVEL);
  });

  it('correctly validates user answers', () => {
    expect(validateAnswer('42', 42)).toBe(true);
    expect(validateAnswer('  42  ', 42)).toBe(true);
    expect(validateAnswer(42, 42)).toBe(true);
    expect(validateAnswer('41', 42)).toBe(false);
    expect(validateAnswer('abc', 42)).toBe(false);
    expect(validateAnswer('', 42)).toBe(false);
    expect(validateAnswer(null, 42)).toBe(false);
  });
});

describe('Domain Utility', () => {
  it('normalizes various URL formats to standard domain', () => {
    expect(normalizeDomain('https://www.youtube.com/watch?v=123')).toBe('youtube.com');
    expect(normalizeDomain('http://twitter.com/home')).toBe('twitter.com');
    expect(normalizeDomain('REDDIT.COM/')).toBe('reddit.com');
    expect(normalizeDomain('instagram.com')).toBe('instagram.com');
    expect(normalizeDomain('www.facebook.com')).toBe('facebook.com');
  });

  it('correctly matches domains and subdomains', () => {
    expect(isDomainMatch('https://www.youtube.com/feed/subscriptions', 'youtube.com')).toBe(true);
    expect(isDomainMatch('https://music.youtube.com', 'youtube.com')).toBe(true);
    expect(isDomainMatch('https://notyoutube.com', 'youtube.com')).toBe(false);
    expect(isDomainMatch('https://google.com', 'youtube.com')).toBe(false);
  });
});
