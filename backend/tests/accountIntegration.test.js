import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import * as clients from '../src/supabase.js';

let rpc, authClient;
beforeEach(() => {
  vi.restoreAllMocks();
  rpc = vi.fn();
  authClient = { auth: { refreshSession: vi.fn() } };
  vi.spyOn(clients, 'createAuthClient').mockReturnValue(authClient);
  vi.spyOn(clients.supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null });
  vi.spyOn(clients, 'createScopedClient').mockReturnValue({ rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { sync_enabled: true }, error: null }) }) }) }),
  });
});
const authorized = (method, path) => request(app)[method](path).set('Authorization', 'Bearer test-token');

describe('retired unversioned website writes', () => {
  it.each(['post', 'delete'])('rejects %s without querying or mutating the database', async method => {
    const from = vi.fn();
    vi.spyOn(clients, 'createScopedClient').mockReturnValue({ from, rpc });
    const path = method === 'delete' ? '/api/sync/websites/example.com' : '/api/sync/websites';
    const result = await authorized(method, path).send({ websites: ['a.com', 'b.com', 'c.com'].map(domain => ({ domain })) });
    expect(result.status).toBe(410);
    expect(result.body.message).toContain('/api/sync/website-snapshot');
    expect(from).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled();
  });
});

describe('refresh endpoint', () => {
  it('validates refresh tokens before calling Supabase', async () => {
    expect((await request(app).post('/api/auth/refresh').send({ refresh_token: {} })).status).toBe(400);
    expect(authClient.auth.refreshSession).not.toHaveBeenCalled();
  });
  it('rotates credentials through a fresh client and prevents caching', async () => {
    const session = { access_token: 'new', refresh_token: 'rotated' };
    authClient.auth.refreshSession.mockResolvedValue({ data: { user: { id: 'user-a' }, session }, error: null });
    const result = await request(app).post('/api/auth/refresh').send({ refresh_token: 'old' });
    expect(result.status).toBe(200); expect(result.body.session).toEqual(session);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(authClient.auth.refreshSession).toHaveBeenCalledWith({ refresh_token: 'old' });
  });
  it('does not leak token errors to the caller', async () => {
    authClient.auth.refreshSession.mockResolvedValue({ error: { status: 400, message: 'private refresh token detail' }, data: {} });
    const result = await request(app).post('/api/auth/refresh').send({ refresh_token: 'old' });
    expect(result.status).toBe(401); expect(JSON.stringify(result.body)).not.toContain('private');
  });
  it('distinguishes transient auth failure from an invalid session', async () => {
    authClient.auth.refreshSession.mockResolvedValue({ error: { status: 503 }, data: {} });
    expect((await request(app).post('/api/auth/refresh').send({ refresh_token: 'old' })).status).toBe(502);
  });
});

describe('versioned website snapshot endpoints', () => {
  it('rejects unauthenticated snapshot requests', async () => {
    expect((await request(app).get('/api/sync/website-snapshot')).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('returns one consistent list and revision snapshot', async () => {
    rpc.mockResolvedValue({ data: { websites: [], revision: 2 }, error: null });
    const result = await authorized('get', '/api/sync/website-snapshot');
    expect(result.status).toBe(200); expect(result.body.revision).toBe(2);
    expect(rpc).toHaveBeenCalledWith('get_website_snapshot');
  });
  it('sends empty lists through the atomic replacement RPC for removals', async () => {
    rpc.mockResolvedValue({ data: { websites: [], revision: 3 }, error: null });
    const result = await authorized('put', '/api/sync/website-snapshot').send({ revision: 2, websites: [] });
    expect(result.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('replace_website_snapshot', { expected_revision: 2, websites: [] });
  });
  it.each([
    { revision: -1, websites: [] },
    { revision: 0, websites: [{ domain: 'https://example.com/path', enabled: true }] },
    { revision: 0, websites: [{ domain: 'example.com', enabled: 'true' }] },
    { revision: 0, websites: ['a.com', 'b.com', 'c.com'].map((domain) => ({ domain, enabled: true })) },
    { revision: 0, websites: [{ domain: 'a.com', enabled: true }, { domain: 'a.com', enabled: false }] },
  ])('rejects invalid snapshot %j before querying the database', async (payload) => {
    expect((await authorized('put', '/api/sync/website-snapshot').send(payload)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('returns a revision conflict so the client can refetch and merge', async () => {
    rpc.mockResolvedValue({ error: { code: '40001' } });
    expect((await authorized('put', '/api/sync/website-snapshot').send({ revision: 0, websites: [] })).status).toBe(409);
  });
  it('reports missing migrations as unavailable rather than succeeding', async () => {
    rpc.mockResolvedValue({ error: { code: 'PGRST202' } });
    expect((await authorized('get', '/api/sync/website-snapshot')).status).toBe(503);
  });
});
