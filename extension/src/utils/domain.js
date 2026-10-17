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
 * Validates a normalized hostname using the same label and length rules as the API.
 */
export function isValidDomain(domain) {
  return typeof domain === 'string' && domain.length <= 253 &&
    /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain);
}

/** Matches exact hosts or real subdomains, not suffix lookalikes. */
export function isDomainMatch(urlOrHost, blockedDomain) {
  if (!urlOrHost || !blockedDomain) return false;

  const targetHost = normalizeDomain(urlOrHost);
  const blockedHost = normalizeDomain(blockedDomain);

  if (!targetHost || !blockedHost) return false;

  return targetHost === blockedHost || targetHost.endsWith('.' + blockedHost);
}
