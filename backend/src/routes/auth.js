import { Router } from 'express';
import { supabase, createAuthClient } from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { validateAuthCredentials } from '../utils/validation.js';

const router = Router();

// Token-bearing responses must never be cached by browsers or proxies.
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.body?.refresh_token;
  if (typeof refreshToken !== 'string' || !refreshToken.trim() || refreshToken.length > 8192) {
    return res.status(400).json({ error: 'Bad Request', message: 'A refresh token is required' });
  }
  try {
    const { data, error } = await createAuthClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) {
      return res.status(error?.status >= 500 ? 502 : 401).json({
        error: 'RefreshError', message: 'Session could not be refreshed. Please sign in again.'
      });
    }
    return res.json({ user: data.user, session: data.session });
  } catch {
    return res.status(502).json({ error: 'RefreshError', message: 'Authentication service unavailable. Try again.' });
  }
});

/**
 * POST /api/auth/signup
 * Registers a new user with Supabase Auth.
 */
router.post('/signup', validateAuthCredentials, async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await createAuthClient().auth.signUp({
      email: cleanEmail,
      password
    });

    if (error) {
      return res.status(error.status || 400).json({
        error: error.name || 'SignupError',
        message: error.message
      });
    }

    return res.status(201).json({
      user: data.user,
      session: data.session,
      message: data.session
        ? 'Signup successful'
        : 'Signup successful. Please verify your email if confirmation is enabled in Supabase.'
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during signup'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials with Supabase Auth.
 */
router.post('/login', validateAuthCredentials, async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await createAuthClient().auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      const statusCode = error.status === 400 ? 401 : (error.status || 401);
      return res.status(statusCode).json({
        error: 'AuthenticationError',
        message: error.message
      });
    }

    return res.status(200).json({
      user: data.user,
      session: data.session,
      message: 'Login successful'
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during login'
    });
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint returning the authenticated user and associated profile.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: profile, error } = await req.supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to retrieve user profile'
      });
    }

    return res.status(200).json({
      user: req.user,
      profile: profile || null,
      profileError: error ? error.message : null
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user profile'
    });
  }
});

/**
 * POST /api/auth/logout
 * Signs out the authenticated user session.
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Explicit token avoids shared session state; local scope preserves other devices.
    const { error } = await supabase.auth.admin.signOut(req.token, 'local');
    if (error) {
      return res.status(502).json({
        error: 'LogoutError',
        message: 'Failed to revoke session'
      });
    }

    return res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during logout'
    });
  }
});

export default router;
