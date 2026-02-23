-- ============================================================
-- SUN 6 BKS - User Profiles & Auth Enhancement
-- Clerk-based authentication with Supabase user_profiles
-- ============================================================

-- ============================================================
-- 1. USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id              BIGSERIAL PRIMARY KEY,
  clerk_user_id   TEXT        NOT NULL UNIQUE,
  name            VARCHAR(100),
  email           VARCHAR(100),
  role            TEXT        NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_clerk_id ON user_profiles (clerk_user_id);
CREATE INDEX idx_user_profiles_email ON user_profiles (email);
CREATE INDEX idx_user_profiles_role ON user_profiles (role);

-- Auto-update updated_at
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. ADD clerk_user_id TO TRANSACTIONS (nullable, backward compatible)
-- ============================================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

CREATE INDEX idx_transactions_clerk_user ON transactions (clerk_user_id)
  WHERE clerk_user_id IS NOT NULL;

-- ============================================================
-- 3. RLS POLICIES FOR user_profiles
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- No public read/write on user_profiles — only service_role key operations.
