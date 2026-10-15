import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth } from '../src/middleware/auth.js';
import { supabase } from '../src/supabase.js';

describe('requireAuth Middleware', () => {
  function createMockRes() {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = { headers: {} };
    const res = createMockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Unauthorized',
        message: expect.stringContaining('Missing or malformed Authorization header')
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
    const res = createMockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is empty', async () => {
    const req = { headers: { authorization: 'Bearer ' } };
    const res = createMockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Unauthorized',
        message: 'Empty authentication token provided'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Supabase returns an invalid or expired token error', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired' }
    });

    const req = { headers: { authorization: 'Bearer expired.jwt.token' } };
    const res = createMockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Unauthorized',
        message: 'JWT expired'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a header containing multiple tokens before contacting Supabase', async () => {
    const verify = vi.spyOn(supabase.auth, 'getUser');
    const res = createMockRes();
    const next = vi.fn();
    await requireAuth({ headers: { authorization: 'Bearer token-a token-b' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.user and req.token and calls next() when token is valid', async () => {
    const mockUser = { id: 'usr-1234', email: 'verified@example.com' };

    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const req = { headers: { authorization: 'Bearer valid.jwt.token' } };
    const res = createMockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(req.token).toBe('valid.jwt.token');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
