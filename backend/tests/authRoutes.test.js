import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import { supabase } from '../src/supabase.js';

describe('Auth Endpoints (/api/auth)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

      vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
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
      vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
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
      vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
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

      vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
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

      vi.spyOn(supabase, 'from').mockReturnValue({
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
    it('returns 200 and success message on logout', async () => {
      vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
});
