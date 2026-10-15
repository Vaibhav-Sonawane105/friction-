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

/**
 * Normalizes a website input into a clean lowercase domain without protocol, path, or query params.
 * Protects user privacy by ensuring full URLs, query strings, and paths are completely discarded.
 */
export function normalizeDomain(input) {
  if (!input || typeof input !== 'string') return null;

  let cleaned = input.trim().toLowerCase();

  // Strip protocol if present
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const parsed = new URL(cleaned);
      cleaned = parsed.hostname;
    } catch {
      cleaned = cleaned.replace(/^https?:\/\//, '').split('/')[0];
    }
  } else {
    // If user provided path or query without protocol, discard path and query
    cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
  }

  // Strip leading www.
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.slice(4);
  }

  // Strip trailing colons / ports if any
  cleaned = cleaned.split(':')[0];

  return isValidDomain(cleaned) ? cleaned : null;
}

/**
 * Checks if a string is a valid domain name format.
 */
export function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;
  return domainRegex.test(domain);
}

/**
 * Validates difficulty tier (integer between 1 and 10).
 */
export function isValidDifficultyTier(tier) {
  return Number.isInteger(tier) && tier >= 1 && tier <= 10;
}

/**
 * Validates supported challenge type.
 */
export function isValidChallengeType(type) {
  return ['math', 'algebra', 'puzzle', 'timer'].includes(type);
}
