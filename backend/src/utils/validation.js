/**
 * Validates email format.
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates password strength (minimum 6 characters as required by Supabase).
 */
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

/**
 * Validates input for signup and login requests.
 */
export function validateAuthCredentials(req, res, next) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Both email and password are required'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid email address format'
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Password must be at least 6 characters long'
    });
  }

  next();
}
