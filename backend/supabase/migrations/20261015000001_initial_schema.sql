-- Migration: 20261015000001_initial_schema.sql
-- Description: Initial PostgreSQL schema for Progressive Website Blocker
-- Covers: User Profiles, User Preferences/Settings, Synced Websites, and Unlock History
-- Includes: Foreign keys to auth.users, constraints, indexes, triggers, and Row Level Security (RLS)

-- 1. Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. User Profiles Table
-- Extends Supabase auth.users without duplicating sensitive auth logic
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing')),
  subscription_provider_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger for profiles.updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. User Preferences & Settings Sync Table
-- Strict privacy by design: analytics_opt_in and sync_enabled default to false
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_opt_in BOOLEAN NOT NULL DEFAULT false,
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  theme TEXT NOT NULL DEFAULT 'neo-brutalist',
  challenge_preference JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger for user_settings.updated_at
DROP TRIGGER IF EXISTS set_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Synced Websites Table
-- Only accessed/populated when user explicitly enables cloud sync
CREATE TABLE IF NOT EXISTS public.synced_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_domain UNIQUE (user_id, domain)
);

-- Trigger for synced_websites.updated_at
DROP TRIGGER IF EXISTS set_synced_websites_updated_at ON public.synced_websites;
CREATE TRIGGER set_synced_websites_updated_at
  BEFORE UPDATE ON public.synced_websites
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. Unlock History Table
-- Minimal cloud data: records only domain and tier unlock events for opt-in analytics
-- NEVER stores full URLs, query parameters, search history, or browsing activity
CREATE TABLE IF NOT EXISTS public.unlock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  difficulty_tier INTEGER NOT NULL DEFAULT 1 CHECK (difficulty_tier >= 1 AND difficulty_tier <= 10),
  challenge_type TEXT NOT NULL DEFAULT 'math' CHECK (challenge_type IN ('math', 'algebra', 'puzzle', 'timer')),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Indexes for Performance and Query Optimization
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_websites_user_id ON public.synced_websites(user_id);
CREATE INDEX IF NOT EXISTS idx_unlock_history_user_id ON public.unlock_history(user_id);
CREATE INDEX IF NOT EXISTS idx_unlock_history_user_id_unlocked_at ON public.unlock_history(user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_unlock_history_domain ON public.unlock_history(user_id, domain);

-- 7. Automatic User Seeding Trigger
-- Automatically creates profile and default user_settings on user signup in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan, subscription_status)
  VALUES (NEW.id, NEW.email, 'free', 'inactive')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id, analytics_opt_in, sync_enabled)
  VALUES (NEW.id, false, false)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlock_history ENABLE ROW LEVEL SECURITY;

-- 9. Row Level Security (RLS) Policies (Idempotent with DROP POLICY IF EXISTS)

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User Settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Synced Websites
DROP POLICY IF EXISTS "Users can view own synced websites" ON public.synced_websites;
CREATE POLICY "Users can view own synced websites"
  ON public.synced_websites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own synced websites" ON public.synced_websites;
CREATE POLICY "Users can insert own synced websites"
  ON public.synced_websites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own synced websites" ON public.synced_websites;
CREATE POLICY "Users can update own synced websites"
  ON public.synced_websites FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own synced websites" ON public.synced_websites;
CREATE POLICY "Users can delete own synced websites"
  ON public.synced_websites FOR DELETE
  USING (auth.uid() = user_id);

-- Unlock History
DROP POLICY IF EXISTS "Users can view own unlock history" ON public.unlock_history;
CREATE POLICY "Users can view own unlock history"
  ON public.unlock_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own unlock history" ON public.unlock_history;
CREATE POLICY "Users can insert own unlock history"
  ON public.unlock_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own unlock history" ON public.unlock_history;
CREATE POLICY "Users can delete own unlock history"
  ON public.unlock_history FOR DELETE
  USING (auth.uid() = user_id);
