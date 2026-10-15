import { supabase, createScopedClient } from '../supabase.js';

/**
 * Middleware to require and validate a Supabase JWT / access token.
 * Attaches the verified user object to req.user, the token string to req.token,
 * and an RLS-scoped client to req.supabase.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header. Expected Bearer <token>'
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Empty authentication token provided'
      });
    }

    if (/\s/.test(token)) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Malformed authentication token' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error ? error.message : 'Invalid or expired session token'
      });
    }

    req.user = user;
    req.token = token;
    req.supabase = createScopedClient(token);
    next();
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate user session'
    });
  }
}
