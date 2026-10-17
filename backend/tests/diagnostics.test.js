import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import { supabase } from '../src/supabase.js';
import { checkTableReads } from '../scripts/check-table-reads.js';

afterEach(() => vi.restoreAllMocks());

describe('diagnostics report only observed evidence', () => {
  it('reports process liveness without consulting Supabase sessions', async () => {
    const session = vi.spyOn(supabase.auth, 'getSession').mockRejectedValue(new Error('offline'));
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', scope: 'process', supabase: 'not_checked' });
    expect(session).not.toHaveBeenCalled();
  });

  it('does not claim RLS verification after successful reads', async () => {
    const log = vi.fn();
    const limit = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ select: () => ({ limit }) })) };
    expect(await checkTableReads(client, log)).toBe(true);
    expect(client.from).toHaveBeenCalledTimes(4);
    const output = log.mock.calls.flat().join('\n');
    expect(output).toContain('RLS enforcement is not verified');
    expect(output).not.toContain('RLS active');
  });

  it.each([
    { error: { code: '42501', message: 'permission denied' } },
    new Error('network unavailable'),
  ])('fails reads without diagnosing every failure as a missing table: %s', async (result) => {
    const log = vi.fn();
    const limit = vi.fn(() => result instanceof Error ? Promise.reject(result) : Promise.resolve(result));
    const client = { from: () => ({ select: () => ({ limit }) }) };
    expect(await checkTableReads(client, log)).toBe(false);
    expect(limit).toHaveBeenCalledTimes(4);
    expect(log.mock.calls.flat().join('\n')).toContain('Read check failed');
    expect(log.mock.calls.flat().join('\n')).not.toContain('not yet created');
  });
});
