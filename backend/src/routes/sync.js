import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  normalizeDomain,
  isValidDifficultyTier,
  isValidChallengeType
} from '../utils/validation.js';

const router = Router();

// All sync endpoints require user authentication
router.use(requireAuth);

/**
 * GET /api/sync/settings
 * Retrieves user preferences (sync toggles, theme, challenge preferences).
 */
router.get('/settings', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to retrieve settings'
      });
    }

    // Default privacy fallback if row has not been seeded yet
    const settings = data || {
      user_id: req.user.id,
      sync_enabled: false,
      analytics_opt_in: false,
      theme: 'neo-brutalist',
      challenge_preference: {}
    };

    return res.status(200).json({ settings });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user settings'
    });
  }
});

/**
 * PUT /api/sync/settings
 * Updates user preferences (explicit sync toggle, analytics opt-in, theme).
 */
router.put('/settings', async (req, res) => {
  try {
    const { sync_enabled, analytics_opt_in, theme, challenge_preference } = req.body || {};

    const updates = {
      user_id: req.user.id,
      ...(typeof sync_enabled === 'boolean' && { sync_enabled }),
      ...(typeof analytics_opt_in === 'boolean' && { analytics_opt_in }),
      ...(typeof theme === 'string' && { theme: theme.slice(0, 50) }),
      ...(challenge_preference && typeof challenge_preference === 'object' && { challenge_preference }),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await req.supabase
      .from('user_settings')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to update user settings'
      });
    }

    return res.status(200).json({
      settings: data,
      message: 'Settings updated successfully'
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save user settings'
    });
  }
});

/**
 * Helper to verify user has sync_enabled = true before website syncing.
 */
async function checkSyncEnabled(req, res, next) {
  try {
    const { data: settings, error } = await req.supabase
      .from('user_settings')
      .select('sync_enabled')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to verify sync preferences'
      });
    }

    if (!settings?.sync_enabled) {
      return res.status(403).json({
        error: 'SyncDisabled',
        message: 'Cloud sync is currently disabled in your preferences. Enable sync_enabled to sync websites.'
      });
    }

    next();
  } catch {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check sync status'
    });
  }
}

/**
 * GET /api/sync/websites
 * Retrieves cloud-synced restricted website domains for this user.
 */
router.get('/websites', checkSyncEnabled, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('synced_websites')
      .select('domain, enabled, label, updated_at')
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to fetch synced websites'
      });
    }

    return res.status(200).json({ websites: data || [] });
  } catch {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load synced websites'
    });
  }
});

/**
 * POST /api/sync/websites
 * Synchronizes local website list with the cloud (sanitizes domains to avoid URL leaks).
 */
router.post('/websites', checkSyncEnabled, async (req, res) => {
  try {
    const rawList = Array.isArray(req.body?.websites)
      ? req.body.websites
      : req.body?.domain
        ? [req.body]
        : [];

    if (rawList.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No website entries provided for synchronization'
      });
    }

    const validRecords = [];
    for (const item of rawList) {
      const cleanDomain = normalizeDomain(item.domain);
      if (cleanDomain) {
        validRecords.push({
          user_id: req.user.id,
          domain: cleanDomain,
          enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
          label: typeof item.label === 'string' ? item.label.slice(0, 100) : null,
          updated_at: new Date().toISOString()
        });
      }
    }

    if (validRecords.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'None of the provided website domains were valid'
      });
    }

    const { data, error } = await req.supabase
      .from('synced_websites')
      .upsert(validRecords, { onConflict: 'user_id,domain' })
      .select('domain, enabled, label, updated_at');

    if (error) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to sync websites'
      });
    }

    return res.status(200).json({
      syncedCount: validRecords.length,
      websites: data,
      message: 'Websites successfully synchronized'
    });
  } catch {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to synchronize websites'
    });
  }
});

/**
 * DELETE /api/sync/websites/:domain
 * Removes a domain from the user's cloud-synced list.
 */
router.delete('/websites/:domain', checkSyncEnabled, async (req, res) => {
  try {
    const cleanDomain = normalizeDomain(req.params.domain);
    if (!cleanDomain) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid domain specified'
      });
    }

    const { error } = await req.supabase
      .from('synced_websites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('domain', cleanDomain);

    if (error) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to remove synced website'
      });
    }

    return res.status(200).json({
      message: `Domain ${cleanDomain} removed from cloud sync`
    });
  } catch {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove domain'
    });
  }
});

/**
 * Helper to verify user has analytics_opt_in = true before logging history.
 */
async function checkAnalyticsOptIn(req, res, next) {
  try {
    const { data: settings, error } = await req.supabase
      .from('user_settings')
      .select('analytics_opt_in')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to verify analytics preferences'
      });
    }

    if (!settings?.analytics_opt_in) {
      return res.status(403).json({
        error: 'AnalyticsDisabled',
        message: 'Unlock history synchronization is disabled by user privacy preference (analytics_opt_in is false).'
      });
    }

    next();
  } catch {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check analytics opt-in status'
    });
  }
}

/**
 * POST /api/sync/unlock-history
 * Minimal unlock milestone logger (strictly domain and tier, never full URLs).
 */
router.post('/unlock-history', checkAnalyticsOptIn, async (req, res) => {
  try {
    const { domain, difficulty_tier, challenge_type, unlocked_at } = req.body || {};

    const cleanDomain = normalizeDomain(domain);
    if (!cleanDomain) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A valid domain is required'
      });
    }

    const tier = Number.isInteger(difficulty_tier) ? difficulty_tier : 1;
    if (!isValidDifficultyTier(tier)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Difficulty tier must be an integer between 1 and 10'
      });
    }

    const type = challenge_type || 'math';
    if (!isValidChallengeType(type)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Challenge type must be one of: math, algebra, puzzle, timer'
      });
    }

    const timestamp = unlocked_at ? new Date(unlocked_at).toISOString() : new Date().toISOString();

    const { data, error } = await req.supabase
      .from('unlock_history')
      .insert({
        user_id: req.user.id,
        domain: cleanDomain,
        difficulty_tier: tier,
        challenge_type: type,
        unlocked_at: timestamp
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to record unlock history'
      });
    }

    return res.status(201).json({
      history: data,
      message: 'Unlock event recorded'
    });
  } catch {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to sync unlock history'
    });
  }
});

/**
 * GET /api/sync/unlock-history
 * Retrieves minimal unlock logs for opt-in progress visualization.
 */
router.get('/unlock-history', checkAnalyticsOptIn, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

    const { data, error } = await req.supabase
      .from('unlock_history')
      .select('id, domain, difficulty_tier, challenge_type, unlocked_at')
      .eq('user_id', req.user.id)
      .order('unlocked_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({
        error: 'DatabaseError',
        message: 'Failed to fetch unlock history'
      });
    }

    return res.status(200).json({ history: data || [] });
  } catch {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load unlock history'
    });
  }
});

export default router;
