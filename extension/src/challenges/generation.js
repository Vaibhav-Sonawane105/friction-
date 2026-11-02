export function pick(n, random = Math.random) {
  const x = random();
  if (!(x >= 0 && x < 1) || !Number.isFinite(x) || n < 1) throw Error('Invalid random selection.');
  return Math.floor(x * n);
}
export function shuffle(values, random = Math.random) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = pick(i + 1, random);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function generateVerified({
  make,
  validate,
  reserves = [],
  maxAttempts = 12,
  random = Math.random,
  recent = [],
  fingerprint = JSON.stringify
}) {
  for (let i = 0; i < maxAttempts; i++) {
    const p = make();
    if (p != null && validate(p) && !recent.includes(fingerprint(p))) return p;
  }
  let repeated;
  for (const item of shuffle(reserves, random)) {
    const p = typeof item === 'function' ? item() : item;
    if (p != null && validate(p)) {
      if (!recent.includes(fingerprint(p))) return structuredClone(p);
      repeated = p;
    }
  }
  if (repeated !== undefined) return structuredClone(repeated);
  throw Error('Could not prepare a valid challenge. Please retry.');
}
export function seeded(seed) {
  let s = seed >>> 0;
  return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296;
}
export function fingerprint(value) {
  let h = 2166136261;
  for (const c of JSON.stringify(value)) {
    h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  }
  return (h >>> 0).toString(36);
}
