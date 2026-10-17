import { describe, it, expect, vi } from 'vitest';
import {
  isValidEmail,
  isValidPassword,
  validateAuthCredentials,
  normalizeDomain,
  isValidDomain,
  isValidDifficultyTier,
  isValidChallengeType
} from '../src/utils/validation.js';

it('rejects hostnames over 253 characters while accepting the boundary', () => {
  const domain = [63, 63, 63, 61].map(n => 'a'.repeat(n)).join('.');
  expect(isValidDomain(domain)).toBe(true);
  expect(isValidDomain(`${domain}a`)).toBe(false);
});

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('accepts valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.dev+alias@sub.domain.co')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('accepts passwords of 6 or more characters', () => {
      expect(isValidPassword('123456')).toBe(true);
      expect(isValidPassword('strongSecretPass123')).toBe(true);
    });

    it('rejects passwords under 6 characters or non-strings', () => {
      expect(isValidPassword('12345')).toBe(false);
      expect(isValidPassword('')).toBe(false);
      expect(isValidPassword(null)).toBe(false);
      expect(isValidPassword(123456)).toBe(false);
    });
  });

  describe('validateAuthCredentials middleware', () => {
    function createMockRes() {
      const res = {};
      res.status = vi.fn().mockReturnValue(res);
      res.json = vi.fn().mockReturnValue(res);
      return res;
    }

    it('calls next() when email and password are valid', () => {
      const req = { body: { email: 'user@example.com', password: 'password123' } };
      const res = createMockRes();
      const next = vi.fn();

      validateAuthCredentials(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 400 if email is missing', () => {
      const req = { body: { password: 'password123' } };
      const res = createMockRes();
      const next = vi.fn();

      validateAuthCredentials(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Bad Request' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 if email format is invalid', () => {
      const req = { body: { email: 'bad-email', password: 'password123' } };
      const res = createMockRes();
      const next = vi.fn();

      validateAuthCredentials(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid email address format' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 if password is under 6 characters', () => {
      const req = { body: { email: 'user@example.com', password: '123' } };
      const res = createMockRes();
      const next = vi.fn();

      validateAuthCredentials(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Password must be at least 6 characters long' })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('normalizeDomain (Privacy-by-Design)', () => {
    it('normalizes standard domain names', () => {
      expect(normalizeDomain('youtube.com')).toBe('youtube.com');
      expect(normalizeDomain('REDDIT.COM')).toBe('reddit.com');
      expect(normalizeDomain('  news.ycombinator.com  ')).toBe('news.ycombinator.com');
    });

    it('strips protocol, www prefix, full path, and query strings', () => {
      expect(normalizeDomain('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube.com');
      expect(normalizeDomain('http://reddit.com/r/popular?utm_source=test#comments')).toBe('reddit.com');
      expect(normalizeDomain('www.instagram.com/p/12345/')).toBe('instagram.com');
    });

    it('rejects invalid or empty domain inputs', () => {
      expect(normalizeDomain('')).toBeNull();
      expect(normalizeDomain('not a domain')).toBeNull();
      expect(normalizeDomain(null)).toBeNull();
      expect(normalizeDomain(12345)).toBeNull();
    });
  });

  describe('isValidDomain', () => {
    it('validates correct domain formats', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('sub.domain.co.uk')).toBe(true);
      expect(isValidDomain('x.com')).toBe(true);
    });

    it('rejects invalid domain formats', () => {
      expect(isValidDomain('localhost')).toBe(false);
      expect(isValidDomain('example..com')).toBe(false);
      expect(isValidDomain('domain')).toBe(false);
      expect(isValidDomain('')).toBe(false);
    });
  });

  describe('isValidDifficultyTier', () => {
    it('accepts integers between 1 and 10', () => {
      expect(isValidDifficultyTier(1)).toBe(true);
      expect(isValidDifficultyTier(5)).toBe(true);
      expect(isValidDifficultyTier(10)).toBe(true);
    });

    it('rejects tiers outside 1-10 or non-integers', () => {
      expect(isValidDifficultyTier(0)).toBe(false);
      expect(isValidDifficultyTier(11)).toBe(false);
      expect(isValidDifficultyTier(4.5)).toBe(false);
      expect(isValidDifficultyTier('3')).toBe(false);
    });
  });

  describe('isValidChallengeType', () => {
    it('accepts valid challenge types', () => {
      expect(isValidChallengeType('math')).toBe(true);
      expect(isValidChallengeType('algebra')).toBe(true);
      expect(isValidChallengeType('puzzle')).toBe(true);
      expect(isValidChallengeType('timer')).toBe(true);
    });

    it('rejects unknown challenge types', () => {
      expect(isValidChallengeType('chess')).toBe(false);
      expect(isValidChallengeType('')).toBe(false);
      expect(isValidChallengeType(null)).toBe(false);
    });
  });
});
