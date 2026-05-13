-- ============================================
-- Cascade — Supabase Schema
-- Run in SQL Editor on your Supabase project
-- ============================================

CREATE TABLE IF NOT EXISTS cascade_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tools_used TEXT[],
  data_context TEXT,
  outputs JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cascade_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  role TEXT,
  api_key_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cascade_updates_user ON cascade_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_cascade_updates_created ON cascade_updates(created_at DESC);

ALTER TABLE cascade_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cascade_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cascade updates"
  ON cascade_updates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own cascade profile"
  ON cascade_user_profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
