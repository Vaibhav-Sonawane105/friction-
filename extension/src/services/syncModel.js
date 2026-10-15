import { normalizeDomain } from '../utils/domain';

export function websiteConfig(list) {
  if (!Array.isArray(list) || list.length > 2) throw new Error('Sync supports up to two websites. Choose which list to keep.');
  const result = list.map((item) => {
    if (!item || typeof item.domain !== 'string' || normalizeDomain(item.domain) !== item.domain ||
      !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(item.domain)) throw new Error('The website list contains an invalid domain.');
    return { domain: item.domain, enabled: item.enabled !== false };
  }).sort((a, b) => a.domain.localeCompare(b.domain));
  if (new Set(result.map((item) => item.domain)).size !== result.length) throw new Error('Duplicate website domains.');
  return result;
}

export const sameConfig = (a, b) => JSON.stringify(websiteConfig(a)) === JSON.stringify(websiteConfig(b));

export function mergeWebsites(base, local, remote) {
  local = websiteConfig(local); remote = websiteConfig(remote);
  if (sameConfig(local, remote)) return local;
  if (base === null) {
    if (!remote.length) return local;
    if (!local.length) return remote;
    throw new Error('This device and cloud have different lists. Choose which list to keep.');
  }
  const maps = [base, local, remote].map((list) => new Map(websiteConfig(list).map((item) => [item.domain, item])));
  const merged = [];
  for (const domain of new Set(maps.flatMap((map) => [...map.keys()]))) {
    const [previous, here, there] = maps.map((map) => map.get(domain));
    const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const localChanged = !equal(here, previous);
    const remoteChanged = !equal(there, previous);
    if (localChanged && remoteChanged && !equal(here, there)) {
      throw new Error('The same website changed on two devices. Choose which list to keep.');
    }
    const chosen = localChanged ? here : there;
    if (chosen) merged.push(chosen);
  }
  return websiteConfig(merged);
}
