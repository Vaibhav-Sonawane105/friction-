import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_ANON_KEY is missing in environment variables.');
}

// Never retain a user's session in the long-lived API process.
const serverAuth = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

export function createAuthClient() {
  return createClient(supabaseUrl, supabaseKey, { auth: serverAuth });
}

// Used only for operations with an explicit token (getUser / admin.signOut).
export const supabase = createAuthClient();

/**
 * Creates an authenticated Supabase client scoped to a user's JWT.
 * Ensures PostgREST evaluates Row Level Security (RLS) with auth.uid() = user.id.
 */
export function createScopedClient(token) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: serverAuth,
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }
  });
}
