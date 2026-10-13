/**
 * Normalizes a user input or URL into a clean hostname.
 * Examples:
 *   "https://www.youtube.com/watch?v=123" -> "youtube.com"
 *   "youtube.com/" -> "youtube.com"
 *   "WWW.REDDIT.COM" -> "reddit.com"
 *   "twitter.com" -> "twitter.com"
 */
export function normalizeDomain(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let cleaned = input.trim().toLowerCase();

  // Remove protocol if present
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname;

    // Strip leading "www."
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    return hostname;
  } catch {
    // If URL parsing fails, basic fallback regex cleaning
    return input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split('?')[0];
  }
}

/**
 * Checks if a given URL or hostname matches a blocked domain.
 * Supports exact domain or subdomains (e.g. "m.youtube.com" matches "youtube.com").
 */
export function isDomainMatch(urlOrHost, blockedDomain) {
  if (!urlOrHost || !blockedDomain) return false;

  const targetHost = normalizeDomain(urlOrHost);
  const blockedHost = normalizeDomain(blockedDomain);

  if (!targetHost || !blockedHost) return false;

  return targetHost === blockedHost || targetHost.endsWith('.' + blockedHost);
}
