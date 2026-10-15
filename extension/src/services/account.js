import { mergeWebsites, sameConfig, websiteConfig } from './syncModel';

const SESSION_KEY = 'pf_account_session';
const STATE_KEY = 'pf_account_sync';

export function apiOrigin(value) {
  const url = new URL(value);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) ||
    url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('API URL must be an HTTPS origin (HTTP is allowed only for localhost).');
  }
  return url.origin;
}

// Factory keeps token handling independent from the popup and testable without
// network or browser credentials. Only the worker instantiates this controller.
export function createAccountController({ sessionStore, stateStore, readLocal, applyLocal, fetcher = fetch,
  baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000' }) {
  const origin = apiOrigin(baseUrl);
  let tail = Promise.resolve();
  const serial = (task) => {
    const result = tail.then(task);
    tail = result.catch(() => {});
    return result;
  };
  const getSession = async () => (await sessionStore.get(SESSION_KEY))[SESSION_KEY] || null;
  const saveSession = async (data) => {
    const session = data.session;
    if (!session?.access_token || !session.refresh_token || !data.user?.id ||
      !Number.isFinite(session.expires_at || session.expires_in)) throw new Error('Authentication returned an incomplete session.');
    await sessionStore.set({ [SESSION_KEY]: {
      access_token: session.access_token, refresh_token: session.refresh_token,
      expires_at: session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in,
      user: { id: data.user.id, email: data.user.email },
    } });
  };
  async function request(path, { method = 'GET', body, token } = {}) {
    let response;
    try {
      response = await fetcher(`${origin}/api${path}`, {
        method, credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000),
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new Error('API unavailable. Local blocking still works; sync will retry.');
    }
    let data;
    try { data = await response.json(); } catch { throw new Error('The API returned an invalid response.'); }
    if (!response.ok) {
      const error = new Error(data.message || 'Account request failed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }
  async function refresh() {
    const session = await getSession();
    if (!session) throw new Error('Please sign in.');
    try {
      const data = await request('/auth/refresh', { method: 'POST', body: { refresh_token: session.refresh_token } });
      if (data.user?.id !== session.user.id) throw new Error('Refreshed account identity did not match.');
      await saveSession(data);
      return (await getSession()).access_token;
    } catch (error) {
      if ([400, 401, 403].includes(error.status)) await sessionStore.remove(SESSION_KEY);
      throw error;
    }
  }
  async function authorized(path, options = {}) {
    const session = await getSession();
    if (!session) throw new Error('Please sign in.');
    let token = session.expires_at <= Date.now() / 1000 + 30 ? await refresh() : session.access_token;
    try { return await request(path, { ...options, token }); }
    catch (error) {
      if (error.status !== 401) throw error;
      token = await refresh();
      return request(path, { ...options, token });
    }
  }
  const getStates = async () => (await stateStore.get(STATE_KEY))[STATE_KEY] || {};
  const getState = async (userId) => (await getStates())[userId] || { enabled: false, base: null, status: 'off' };
  async function setState(userId, value) {
    await stateStore.set({ [STATE_KEY]: { ...await getStates(), [userId]: value } });
  }
  async function status() {
    const session = await getSession();
    if (!session) return { user: null, enabled: false, status: 'signed-out' };
    return { ...await getState(session.user.id), user: session.user };
  }
  async function sync(choice) {
    const session = await getSession();
    if (!session) return status();
    const state = await getState(session.user.id);
    if (!state.enabled) return status();
    try {
      const { settings } = await authorized('/sync/settings');
      if (!settings?.sync_enabled) {
        await setState(session.user.id, { ...state, enabled: false, status: 'off', message: 'Sync was disabled for this account.' });
        return status();
      }
      // Refetch after a revision conflict, but never replay a stale PUT blindly.
      for (let attempt = 0; attempt < 3; attempt++) {
        const remote = await authorized('/sync/website-snapshot');
        const local = websiteConfig(await readLocal());
        const remoteList = websiteConfig(remote.websites);
        if (!Number.isSafeInteger(remote.revision) || remote.revision < 0) throw new Error('Invalid cloud revision.');
        let merged;
        try { merged = choice === 'local' ? local : choice === 'cloud' ? remoteList : mergeWebsites(state.base, local, remoteList); }
        catch (error) {
          await setState(session.user.id, { ...state, status: 'conflict', message: error.message, local, cloud: remoteList });
          return status();
        }
        let saved = remote;
        if (!sameConfig(merged, remoteList)) {
          try {
            saved = await authorized('/sync/website-snapshot', { method: 'PUT', body: { revision: remote.revision, websites: merged } });
          } catch (error) { if (error.status === 409) continue; throw error; }
        }
        // Worker performs a local compare-and-swap; concurrent local edits are
        // kept and retried next cycle rather than overwritten by the download.
        await applyLocal(local, merged);
        await setState(session.user.id, { enabled: true, base: merged, revision: saved.revision,
          status: 'synced', lastSyncedAt: Date.now(), message: 'Website list synced.' });
        return status();
      }
      throw new Error('Another device is updating the list. Sync will retry.');
    } catch (error) {
      await setState(session.user.id, { ...state, status: 'error', message: error.message });
      return status();
    }
  }
  async function action(operation, args = {}) {
    if (operation === 'status') return status();
    if (operation === 'login' || operation === 'signup') {
      if (await getSession()) throw new Error('Sign out before switching accounts.');
      const data = await request(`/auth/${operation}`, { method: 'POST', body: { email: args.email, password: args.password } });
      if (!data.session) return { ...await status(), message: 'Check your email to confirm your account, then sign in.' };
      await saveSession(data);
      // Re-enabling on this device requires explicit consent after each login.
      await setState(data.user.id, { enabled: false, base: null, status: 'off' });
      return status();
    }
    if (operation === 'logout') {
      let message = 'Signed out. Local blocking stays enabled.';
      try { if (await getSession()) await authorized('/auth/logout', { method: 'POST' }); }
      catch { message = 'Signed out on this device. The API could not confirm remote session revocation.'; }
      finally { await sessionStore.remove(SESSION_KEY); }
      return { ...await status(), message };
    }
    if (operation === 'profile') {
      const data = await authorized('/auth/me');
      return { ...await status(), profile: data.profile };
    }
    if (operation === 'enable') {
      const session = await getSession();
      if (!session) throw new Error('Please sign in.');
      await authorized('/sync/settings', { method: 'PUT', body: { sync_enabled: true } });
      const previous = await getState(session.user.id);
      await setState(session.user.id, { ...previous, enabled: true });
      return sync();
    }
    if (operation === 'disable') {
      const session = await getSession();
      if (!session) throw new Error('Please sign in.');
      // Stop this device even when the API is down. The user can retry disabling
      // account-wide consent without losing their local choice.
      await setState(session.user.id, { ...await getState(session.user.id), enabled: false, status: 'off' });
      try { await authorized('/sync/settings', { method: 'PUT', body: { sync_enabled: false } }); }
      catch (error) { return { ...await status(), message: `Sync stopped here. Account-wide disable failed: ${error.message}` }; }
      return status();
    }
    if (operation === 'sync') return sync();
    if (operation === 'resolve' && ['local', 'cloud'].includes(args.choice)) return sync(args.choice);
    throw new Error('Unsupported account operation.');
  }
  return { action: (operation, args) => serial(() => action(operation, args)) };
}
