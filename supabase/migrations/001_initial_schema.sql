-- ============================================================
-- SUN 6 BKS - Initial Schema
-- Single Source of Truth: Midtrans Webhook
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  description   TEXT,
  date          TIMESTAMPTZ NOT NULL,
  time_label    TEXT        NOT NULL,          -- e.g. "20:00 WIB"
  venue         TEXT        NOT NULL,
  venue_address TEXT,
  venue_lat     DOUBLE PRECISION,
  venue_lng     DOUBLE PRECISION,
  performers    TEXT[]      NOT NULL DEFAULT '{}',
  image_url     TEXT,
  is_published  BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_date ON events (date);
CREATE INDEX idx_events_published ON events (is_published) WHERE is_published = true;

-- ============================================================
-- 2. TICKET CATEGORIES (per event)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_categories (
  id            BIGSERIAL PRIMARY KEY,
  event_id      BIGINT      NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,           -- e.g. "Early Bird", "Presale", "Normal", "Regular", "Premium", "VIP"
  price         INTEGER     NOT NULL CHECK (price >= 0),
  description   TEXT,
  features      TEXT[]      NOT NULL DEFAULT '{}',
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, name)
);

CREATE INDEX idx_ticket_categories_event ON ticket_categories (event_id);

-- ============================================================
-- 3. TICKET STOCKS (per category)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_stocks (
  id              BIGSERIAL PRIMARY KEY,
  category_id     BIGINT  NOT NULL UNIQUE REFERENCES ticket_categories(id) ON DELETE CASCADE,
  total_stock     INTEGER NOT NULL CHECK (total_stock >= 0),
  remaining_stock INTEGER NOT NULL CHECK (remaining_stock >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT remaining_lte_total CHECK (remaining_stock <= total_stock)
);

-- ============================================================
-- 4. TRANSACTIONS
-- ============================================================
CREATE TYPE transaction_status AS ENUM ('pending', 'paid', 'expired', 'failed', 'refunded');

CREATE TABLE IF NOT EXISTS transactions (
  id                  BIGSERIAL PRIMARY KEY,
  midtrans_order_id   TEXT             NOT NULL UNIQUE,
  event_id            BIGINT           NOT NULL REFERENCES events(id),
  category_id         BIGINT           NOT NULL REFERENCES ticket_categories(id),
  quantity            INTEGER          NOT NULL CHECK (quantity > 0 AND quantity <= 10),
  amount              INTEGER          NOT NULL CHECK (amount > 0),
  status              transaction_status NOT NULL DEFAULT 'pending',
  snap_token          TEXT,
  snap_redirect_url   TEXT,
  customer_name       TEXT             NOT NULL,
  customer_email      TEXT             NOT NULL,
  customer_phone      TEXT             NOT NULL,
  paid_at             TIMESTAMPTZ,
  expired_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_order_id ON transactions (midtrans_order_id);
CREATE INDEX idx_transactions_status ON transactions (status);
CREATE INDEX idx_transactions_created ON transactions (created_at);
CREATE INDEX idx_transactions_event ON transactions (event_id);

-- ============================================================
-- 5. TICKETS (created only when status = paid)
-- ============================================================
CREATE TYPE ticket_status AS ENUM ('inactive', 'active', 'used', 'cancelled');

CREATE TABLE IF NOT EXISTS tickets (
  id              BIGSERIAL PRIMARY KEY,
  transaction_id  BIGINT        NOT NULL REFERENCES transactions(id),
  ticket_code     TEXT          NOT NULL UNIQUE,  -- For QR code
  status          ticket_status NOT NULL DEFAULT 'active',
  activated_at    TIMESTAMPTZ,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_transaction ON tickets (transaction_id);
CREATE INDEX idx_tickets_code ON tickets (ticket_code);

-- ============================================================
-- 6. AUDIT LOGS (for admin manual overrides)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  admin_id        TEXT        NOT NULL,          -- Clerk user ID
  admin_email     TEXT,
  transaction_id  BIGINT      NOT NULL REFERENCES transactions(id),
  action          TEXT        NOT NULL,           -- e.g. "manual_override", "re_check"
  old_status      TEXT,
  new_status      TEXT,
  reason          TEXT        NOT NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_transaction ON audit_logs (transaction_id);
CREATE INDEX idx_audit_logs_admin ON audit_logs (admin_id);

-- ============================================================
-- 7. WEBHOOK PAYLOADS (raw storage for debugging)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_payloads (
  id              BIGSERIAL PRIMARY KEY,
  midtrans_order_id TEXT,
  payload         JSONB       NOT NULL,
  signature_valid BOOLEAN     NOT NULL DEFAULT false,
  processed       BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_payloads_order ON webhook_payloads (midtrans_order_id);
CREATE INDEX idx_webhook_payloads_created ON webhook_payloads (created_at);

-- ============================================================
-- 8. AUTO-UPDATE updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ticket_categories_updated_at
  BEFORE UPDATE ON ticket_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ticket_stocks_updated_at
  BEFORE UPDATE ON ticket_stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. RLS Policies (basic)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_payloads ENABLE ROW LEVEL SECURITY;

-- Public read for published events + categories + stocks
CREATE POLICY "Public can read published events"
  ON events FOR SELECT
  USING (is_published = true);

CREATE POLICY "Public can read categories of published events"
  ON ticket_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = ticket_categories.event_id AND e.is_published = true
    )
  );

CREATE POLICY "Public can read stocks of published events"
  ON ticket_stocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ticket_categories tc
      JOIN events e ON e.id = tc.event_id
      WHERE tc.id = ticket_stocks.category_id AND e.is_published = true
    )
  );

-- Service role bypasses RLS, so webhook + server actions work via service_role key.
-- Admin operations also use service_role key.
