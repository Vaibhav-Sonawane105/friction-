import { beforeEach, expect, it, vi } from 'vitest';

const { action } = vi.hoisted(() => ({ action: vi.fn() }));
vi.mock('./account', () => ({ createAccountController: () => ({ action }) }));
let listeners, background;
beforeEach(async () => {
  vi.resetModules(); action.mockReset(); action.mockResolvedValue({ user: null }); listeners = {};
  const data = {}; const session = {};
  const event = (name) => ({ addListener: (callback) => { listeners[name] = callback; } });
  vi.stubGlobal('chrome', {
    runtime: { id: 'extension', getURL: (path) => `chrome-extension://extension/${path}`, onMessage: event('message') },
    storage: {
      local: { get: (keys, callback) => callback(structuredClone(Object.fromEntries(keys.map((key) => [key, data[key]])))),
        set: (values, callback) => { Object.assign(data, structuredClone(values)); callback(); } },
      session: { get: async (key) => ({ [key]: session[key] }), set: async (values) => Object.assign(session, values) },
    },
    alarms: { onAlarm: event('alarm'), get: async () => ({ name: 'pf_cloud_sync' }) },
    tabs: { get: async (id) => ({ id, url: 'https://youtube.com' }), query: async () => [], sendMessage: async () => {} },
  });
  background = await import('../background');
});

const popup = { id: 'extension', url: 'chrome-extension://extension/index.html' };
const message = (request, sender) => new Promise((resolve) => listeners.message(request, sender, resolve));

it('refuses account actions from content scripts and unrelated extensions', async () => {
  await expect(background.handleAccountMessage({ operation: 'status' }, { id: 'extension', url: 'https://youtube.com' })).rejects.toThrow(/popup/);
  await expect(background.handleAccountMessage({ operation: 'status' }, { ...popup, id: 'other-extension' })).rejects.toThrow(/popup/);
  expect(action).not.toHaveBeenCalled();
});

it('does not block local navigation evaluation while an account request is stalled', async () => {
  const storage = await import('./storage');
  await storage.addBlockedDomain('youtube.com');
  let release;
  action.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
  const accountPending = background.handleAccountMessage({ operation: 'sync' }, popup);
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  const status = await message({ type: 'CHECK_TAB_STATUS' }, {
    id: 'extension', url: 'https://youtube.com', frameId: 0, tab: { id: 1 },
  });
  expect(status.shouldBlock).toBe(true);
  release({ status: 'error' }); await accountPending;
});

it('schedules sync after a local domain change and on the polling alarm', async () => {
  expect((await message({ type: 'MUTATE_STORAGE', operation: 'addBlockedDomain', args: ['youtube.com'] }, popup)).success).toBe(true);
  await vi.waitFor(() => expect(action).toHaveBeenCalledWith('sync'));
  await new Promise((resolve) => queueMicrotask(resolve));
  action.mockClear();
  listeners.alarm({ name: 'pf_cloud_sync' });
  await vi.waitFor(() => expect(action).toHaveBeenCalledWith('sync'));
});
