import { describe, it, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: {} }))
}));

import { createClient } from '@supabase/supabase-js';
import { createAuthClient, createScopedClient } from '../src/supabase.js';

describe('server Supabase clients', () => {
  it('creates independent auth clients with no persistent or refreshing session', () => {
    const first = createAuthClient();
    const second = createAuthClient();
    expect(first).not.toBe(second);
    expect(createClient).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  });

  it('keeps bearer credentials isolated between database clients', () => {
    const first = createScopedClient('token-a');
    const second = createScopedClient('token-b');
    expect(first).not.toBe(second);
    const calls = createClient.mock.calls.slice(-2);
    expect(calls.map((call) => call[2].global.headers.Authorization)).toEqual(['Bearer token-a', 'Bearer token-b']);
    expect(calls.every((call) => call[2].auth.persistSession === false)).toBe(true);
  });
});
