import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import * as clients from '../src/supabase.js';
const { supabase } = clients;
const requestAuth = { auth: { signUp: vi.fn(), signInWithPassword: vi.fn() } };
const scoped = { from: vi.fn() };

describe('Auth Endpoints (/api/auth)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(clients, 'createAuthClient').mockReturnValue(requestAuth);
    vi.spyOn(clients, 'createScopedClient').mockReturnValue(scoped);
  });

  describe('POST /api/auth/signup', () => {
    it('rejects missing email or password with 400', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });

    it('rejects invalid email with 400', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'bademail', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid email');
    });

    it('rejects short password with 400', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'user@example.com', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 6 characters');
    });

    it('successfully handles signup when Supabase creates user', async () => {
      const mockUser = { id: 'usr-new-1', email: 'new@example.com' };
      const mockSession = { access_token: 'tok-abc', refresh_token: 'ref-abc' };

      vi.spyOn(requestAuth.auth, 'signUp').mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'new@example.com', password: 'validPassword123' });

      expect(res.status).toBe(201);
      expect(res.body.user).toEqual(mockUser);
      expect(res.body.session).toEqual(mockSession);
      expect(res.body.message).toBe('Signup successful');
    });

    it('returns error status if user already registered or Supabase returns error', async () => {
      vi.spyOn(requestAuth.auth, 'signUp').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 422, name: 'AuthApiError' }
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'existing@example.com', password: 'validPassword123' });

      expect(res.status).toBe(422);
      expect(res.body.message).toBe('User already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 401 when invalid credentials are provided', async () => {
      vi.spyOn(requestAuth.auth, 'signInWithPassword').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 }
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'wrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('AuthenticationError');
      expect(res.body.message).toBe('Invalid login credentials');
    });

    it('returns 200 with session when credentials are valid', async () => {
      const mockUser = { id: 'usr-10', email: 'user@example.com' };
      const mockSession = { access_token: 'jwt-xyz', expires_in: 3600 };

      vi.spyOn(requestAuth.auth, 'signInWithPassword').mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'correctPassword' });

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(mockUser);
      expect(res.body.session).toEqual(mockSession);
      expect(res.body.message).toBe('Login successful');
    });
  });

  describe('GET /api/auth/me (Protected)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('rejects requests with invalid token with 401', async () => {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid token');
    });

    it('returns user and profile when token is valid', async () => {
      const mockUser = { id: 'usr-profile-1', email: 'test@example.com' };
      const mockProfile = { id: 'usr-profile-1', plan: 'free', subscription_status: 'inactive' };

      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      vi.spyOn(scoped, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        })
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(mockUser);
      expect(res.body.profile).toEqual(mockProfile);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('rejects missing credentials', async () => {
      const signOut = vi.spyOn(supabase.auth.admin, 'signOut');
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
      expect(signOut).not.toHaveBeenCalled();
    });

    it('rejects invalid tokens without signing out another session', async () => {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });
      const signOut = vi.spyOn(supabase.auth.admin, 'signOut');
      const res = await request(app).post('/api/auth/logout').set('Authorization', 'Bearer invalid');
      expect(res.status).toBe(401);
      expect(signOut).not.toHaveBeenCalled();
    });

    it('reports revocation failures instead of claiming success', async () => {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
      vi.spyOn(supabase.auth.admin, 'signOut').mockResolvedValue({ error: { message: 'Unavailable' } });
      const res = await request(app).post('/api/auth/logout').set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(502);
    });

    it('returns 200 and success message on logout', async () => {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
      const signOut = vi.spyOn(supabase.auth.admin, 'signOut').mockResolvedValue({ error: null });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
      expect(signOut).toHaveBeenCalledWith('valid-token', 'local');
    });
  });

  it('isolates profile reads for concurrent users', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockImplementation(async (token) => ({ data: { user: { id: token } }, error: null }));
    const sharedQuery = vi.spyOn(supabase, 'from');
    vi.spyOn(clients, 'createScopedClient').mockImplementation((token) => ({
      from: () => ({ select: () => ({ eq: (column, id) => ({
        maybeSingle: async () => {
          expect(id).toBe(token);
          return { data: { id: token }, error: null };
        }
      }) }) })
    }));
    const responses = await Promise.all(['user-a', 'user-b'].map((token) =>
      request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    ));
    expect(responses.map((res) => res.body.profile.id)).toEqual(['user-a', 'user-b']);
    expect(sharedQuery).not.toHaveBeenCalled();
  });

  it('does not expose database errors from profile reads', async () => {
    vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
    scoped.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'private database detail' } }) }) }) });
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer user-a');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('private database detail');
  });
});
