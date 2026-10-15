import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiOrigin, createAccountController } from './account';
import { sameConfig } from './syncModel';

const a = { domain: 'youtube.com', enabled: true };
const b = { domain: 'reddit.com', enabled: true };
const makeStore = () => {
  const data = {};
  return { data, get: async (key) => structuredClone({ [key]: data[key] }),
    set: async (value) => Object.assign(data, structuredClone(value)), remove: async (key) => { delete data[key]; } };
};
let sessionStore, stateStore, local, remote, consent, revision, fetcher, controller, fail, calls, conflictOnce;
const auth = (token = 'access') => ({ user: { id: 'user-a', email: 'a@example.com' },
  session: { access_token: token, refresh_token: 'refresh', expires_at: Date.now() / 1000 + 3600 } });

beforeEach(() => {
  sessionStore = makeStore(); stateStore = makeStore(); local = [{ ...a, successfulUnlockCount: 8 }];
  remote = []; consent = false; revision = 0; fail = false; calls = []; conflictOnce = false;
  fetcher = vi.fn(async (url, options) => {
    if (fail) throw new Error('Offline');
    const path = new URL(url).pathname;
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ path, body, options });
    let result;
    if (path === '/api/auth/login' || path === '/api/auth/signup') result = auth();
    else if (path === '/api/auth/refresh') result = auth('new-access');
    else if (path === '/api/auth/logout') result = {};
    else if (path === '/api/auth/me') result = { profile: { plan: 'free' } };
    else if (path === '/api/sync/settings') {
      if (body) consent = body.sync_enabled;
      result = { settings: { sync_enabled: consent } };
    } else if (path === '/api/sync/website-snapshot') {
      if (body) {
        if (conflictOnce) {
          conflictOnce = false; remote = [b]; revision++;
          return { ok: false, status: 409, json: async () => ({ message: 'Cloud changed' }) };
        }
        expect(body.revision).toBe(revision);
        remote = body.websites; revision++;
      }
      result = { revision, websites: remote };
    } else throw new Error(`Unexpected path ${path}`);
    return { ok: true, status: 200, json: async () => structuredClone(result) };
  });
  controller = createAccountController({ sessionStore, stateStore, fetcher, baseUrl: 'http://localhost:5000',
    readLocal: async () => structuredClone(local), applyLocal: async (expected, incoming) => {
      if (!sameConfig(expected, local)) throw new Error('Local list changed');
      local = incoming.map((entry) => ({ successfulUnlockCount: 0, ...local.find((old) => old.domain === entry.domain), ...entry }));
    } });
});

const login = () => controller.action('login', { email: 'a@example.com', password: 'not-a-real-password' });

describe('account and automatic sync', () => {
  it('does not request the network while signed out or signed in without sync consent', async () => {
    await controller.action('sync'); expect(fetcher).not.toHaveBeenCalled();
    await login(); calls.length = 0;
    await controller.action('sync'); expect(calls).toHaveLength(0);
    expect(stateStore.data.pf_account_sync['user-a'].enabled).toBe(false);
  });
  it('keeps tokens out of popup status and persistent state, and never saves passwords', async () => {
    const status = await login();
    expect(JSON.stringify(status)).not.toMatch(/access|refresh|password/);
    expect(JSON.stringify(stateStore.data)).not.toMatch(/access|refresh|password/);
    expect(JSON.stringify(sessionStore.data)).not.toContain('not-a-real-password');
    expect(sessionStore.data.pf_account_session.access_token).toBe('access');
  });
  it('uploads only domain configuration after explicit enable', async () => {
    await login(); const status = await controller.action('enable');
    expect(status.status).toBe('synced'); expect(remote).toEqual([a]);
    const write = calls.find((call) => call.path.endsWith('website-snapshot') && call.body);
    expect(write.body).toEqual({ revision: 0, websites: [a] });
    expect(local[0].successfulUnlockCount).toBe(8);
    expect(calls.some((call) => call.path.includes('unlock-history'))).toBe(false);
  });
  it('applies remote additions while preserving existing local counts', async () => {
    await login(); await controller.action('enable'); remote = [a, b]; revision++;
    await controller.action('sync');
    expect(local).toHaveLength(2); expect(local.find((item) => item.domain === a.domain).successfulUnlockCount).toBe(8);
  });
  it('propagates offline removals on the next successful retry', async () => {
    await login(); await controller.action('enable'); fail = true; local = [];
    expect((await controller.action('sync')).status).toBe('error'); expect(remote).toEqual([a]);
    fail = false; await controller.action('sync'); expect(remote).toEqual([]);
  });
  it('does not overwrite either list on an initial conflict, and accepts an explicit resolution', async () => {
    await login(); remote = [b]; const status = await controller.action('enable');
    expect(status.status).toBe('conflict'); expect(remote).toEqual([b]); expect(local[0].domain).toBe(a.domain);
    await controller.action('resolve', { choice: 'cloud' }); expect(local[0].domain).toBe(b.domain);
  });
  it('refetches on a revision conflict rather than overwriting a new cloud list', async () => {
    await login(); conflictOnce = true;
    expect((await controller.action('enable')).status).toBe('conflict'); expect(remote).toEqual([b]);
  });
  it('serializes refreshes so a rotating refresh token is used once', async () => {
    await login(); sessionStore.data.pf_account_session.expires_at = 0;
    await Promise.all([controller.action('profile'), controller.action('profile')]);
    expect(calls.filter((call) => call.path.endsWith('/refresh'))).toHaveLength(1);
    expect(calls.filter((call) => call.path.endsWith('/me')).every((call) => call.options.headers.Authorization === 'Bearer new-access')).toBe(true);
  });
  it('clears a revoked refresh session', async () => {
    await login(); sessionStore.data.pf_account_session.expires_at = 0;
    fetcher.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Expired' }) });
    await expect(controller.action('profile')).rejects.toThrow();
    expect((await controller.action('status')).user).toBe(null);
  });
  it('retains credentials after a transient refresh failure for retry', async () => {
    await login(); sessionStore.data.pf_account_session.expires_at = 0; fail = true;
    await expect(controller.action('profile')).rejects.toThrow(/API unavailable/);
    expect((await controller.action('status')).user.id).toBe('user-a');
  });
  it('stops local sync even if disabling account-wide consent fails', async () => {
    await login(); await controller.action('enable'); fail = true;
    const result = await controller.action('disable');
    expect(result.enabled).toBe(false); expect(result.message).toMatch(/Account-wide disable failed/);
    fail = false; calls.length = 0; await controller.action('sync'); expect(calls).toHaveLength(0);
  });
  it('clears local credentials on offline logout and preserves local blocking data', async () => {
    await login(); fail = true;
    const result = await controller.action('logout'); expect(result.user).toBe(null);
    expect(result.message).toMatch(/could not confirm/); expect(local[0].successfulUnlockCount).toBe(8);
  });
  it('supports email-confirmation signup without claiming a logged-in session', async () => {
    fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ session: null, user: { id: 'user-a' } }) });
    const result = await controller.action('signup', { email: 'a@example.com', password: 'unused' });
    expect(result.user).toBe(null); expect(result.message).toMatch(/Check your email/);
  });
  it('recognizes account-wide opt-out before uploading any domains', async () => {
    await login(); await controller.action('enable'); consent = false; local = [b]; calls.length = 0;
    expect((await controller.action('sync')).enabled).toBe(false);
    expect(calls.some((call) => call.path.endsWith('website-snapshot'))).toBe(false);
  });
  it.each(['http://example.com', 'https://name:password@example.com', 'https://example.com/path', 'https://example.com/?token=secret'])('rejects unsafe API configuration %s', (url) => {
    expect(() => apiOrigin(url)).toThrow();
  });
});
