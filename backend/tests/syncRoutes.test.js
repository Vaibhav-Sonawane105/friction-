import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import * as supabaseModule from '../src/supabase.js';

const { supabase } = supabaseModule;

describe('Sync Endpoints (/api/sync)', () => {
  const mockUser = { id: 'usr-sync-1', email: 'syncuser@example.com' };
  const validToken = 'valid.jwt.token';

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(supabaseModule, 'createScopedClient').mockReturnValue(supabase);
  });

  describe('Unauthenticated Requests', () => {
    it('rejects GET /api/sync/settings without token with 401', async () => {
      const res = await request(app).get('/api/sync/settings');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('rejects GET /api/sync/websites without token with 401', async () => {
      const res = await request(app).get('/api/sync/websites');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('rejects POST /api/sync/websites without token with 401', async () => {
      const res = await request(app)
        .post('/api/sync/websites')
        .send({ domain: 'youtube.com' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('rejects POST /api/sync/unlock-history without token with 401', async () => {
      const res = await request(app)
        .post('/api/sync/unlock-history')
        .send({ domain: 'reddit.com' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });

  describe('Settings Synchronization (/api/sync/settings)', () => {
    beforeEach(() => {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
    });

    it('returns user settings or defaults if unseeded', async () => {
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { user_id: mockUser.id, sync_enabled: false, analytics_opt_in: false },
              error: null
            })
          })
        })
      });

      const res = await request(app)
        .get('/api/sync/settings')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.settings.sync_enabled).toBe(false);
      expect(res.body.settings.analytics_opt_in).toBe(false);
    });

    it('updates user settings successfully', async () => {
      const updatedSettings = {
        user_id: mockUser.id,
        sync_enabled: true,
        analytics_opt_in: true,
        theme: 'neo-brutalist'
      };

      vi.spyOn(supabase, 'from').mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: updatedSettings, error: null })
          })
        })
      });

      const res = await request(app)
        .put('/api/sync/settings')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ sync_enabled: true, analytics_opt_in: true });

      expect(res.status).toBe(200);
      expect(res.body.settings.sync_enabled).toBe(true);
      expect(res.body.settings.analytics_opt_in).toBe(true);
    });
  });

  describe('Websites Synchronization (/api/sync/websites)', () => {
    beforeEach(() => {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
    });

    it('rejects sync requests with 403 when sync_enabled is false', async () => {
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { sync_enabled: false },
              error: null
            })
          })
        })
      });

      const res = await request(app)
        .get('/api/sync/websites')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('SyncDisabled');
    });

    it('returns synced website list when sync_enabled is true', async () => {
      const mockWebsites = [
        { domain: 'youtube.com', enabled: true, label: 'Video', updated_at: '2026-10-15T00:00:00Z' }
      ];

      vi.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'user_settings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { sync_enabled: true },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'synced_websites') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockWebsites,
                error: null
              })
            })
          };
        }
      });

      const res = await request(app)
        .get('/api/sync/websites')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.websites).toEqual(mockWebsites);
    });

    it('sanitizes full URLs down to clean domains before syncing', async () => {
      vi.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'user_settings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { sync_enabled: true },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'synced_websites') {
          return {
            upsert: vi.fn().mockImplementation((records) => {
              // Assert that the record passed to DB is normalized to domain only
              expect(records[0].domain).toBe('youtube.com');
              return {
                select: vi.fn().mockResolvedValue({
                  data: [{ domain: 'youtube.com', enabled: true }],
                  error: null
                })
              };
            })
          };
        }
      });

      const res = await request(app)
        .post('/api/sync/websites')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          websites: [
            { domain: 'https://www.youtube.com/watch?v=12345&t=10s', enabled: true }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.syncedCount).toBe(1);
    });

    it('returns 400 when empty or invalid website list is submitted', async () => {
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { sync_enabled: true },
              error: null
            })
          })
        })
      });

      const res = await request(app)
        .post('/api/sync/websites')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ websites: [] });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No website entries');
    });

    it('deletes a domain from synced websites', async () => {
      vi.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'user_settings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { sync_enabled: true },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'synced_websites') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null })
              })
            })
          };
        }
      });

      const res = await request(app)
        .delete('/api/sync/websites/youtube.com')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('youtube.com removed');
    });
  });

  describe('Unlock History Synchronization (/api/sync/unlock-history)', () => {
    beforeEach(() => {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
    });

    it('rejects unlock history sync when analytics_opt_in is false', async () => {
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { analytics_opt_in: false },
              error: null
            })
          })
        })
      });

      const res = await request(app)
        .post('/api/sync/unlock-history')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ domain: 'reddit.com', difficulty_tier: 2, challenge_type: 'math' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('AnalyticsDisabled');
    });

    it('records minimal unlock history event when analytics_opt_in is true', async () => {
      const mockRecord = {
        id: 'hist-1',
        domain: 'reddit.com',
        difficulty_tier: 3,
        challenge_type: 'algebra',
        unlocked_at: new Date().toISOString()
      };

      vi.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'user_settings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { analytics_opt_in: true },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'unlock_history') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRecord, error: null })
              })
            })
          };
        }
      });

      const res = await request(app)
        .post('/api/sync/unlock-history')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          domain: 'https://reddit.com/r/all?sort=top',
          difficulty_tier: 3,
          challenge_type: 'algebra'
        });

      expect(res.status).toBe(201);
      expect(res.body.history.domain).toBe('reddit.com');
    });

    it('returns 400 for invalid tier or challenge type', async () => {
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { analytics_opt_in: true },
              error: null
            })
          })
        })
      });

      const res = await request(app)
        .post('/api/sync/unlock-history')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ domain: 'reddit.com', difficulty_tier: 99, challenge_type: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('fetches unlock history logs when analytics_opt_in is true', async () => {
      const historyList = [
        { id: 'h1', domain: 'youtube.com', difficulty_tier: 1, challenge_type: 'math', unlocked_at: '2026-10-15T12:00:00Z' }
      ];

      vi.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'user_settings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { analytics_opt_in: true },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'unlock_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: historyList, error: null })
                })
              })
            })
          };
        }
      });

      const res = await request(app)
        .get('/api/sync/unlock-history')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.history).toEqual(historyList);
    });
  });

  describe('Database and Network Failure Handling', () => {
    it('returns 500 without leaking stack traces when database query errors', async () => {
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection timed out' }
            })
          })
        })
      });

      const res = await request(app)
        .get('/api/sync/settings')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('DatabaseError');
      expect(res.body.stack).toBeUndefined();
    });
  });
});
