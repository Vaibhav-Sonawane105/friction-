import { describe, it, expect, vi } from 'vitest';
import { isValidEmail, isValidPassword, validateAuthCredentials } from '../src/utils/validation.js';

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
});
