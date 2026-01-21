-- ============================================
-- SUN 6 BKS Database Schema for Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. VENUES TABLE
-- ============================================
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Bekasi',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    capacity INTEGER DEFAULT 100,
    google_maps_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for venue searches
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_name ON venues(name);

-- ============================================
-- 2. PERFORMERS TABLE
-- ============================================
CREATE TABLE performers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    image_url TEXT,
    instagram_handle VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performer searches
CREATE INDEX idx_performers_name ON performers(name);
CREATE INDEX idx_performers_active ON performers(is_active);

-- ============================================
-- 3. EVENTS TABLE
-- ============================================
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    price INTEGER NOT NULL DEFAULT 0, -- Price in IDR (smallest unit)
    capacity INTEGER NOT NULL DEFAULT 100,
    spots_left INTEGER NOT NULL DEFAULT 100,
    status event_status NOT NULL DEFAULT 'draft',
    image_url TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_venue ON events(venue_id);
CREATE INDEX idx_events_featured ON events(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_events_upcoming ON events(event_date, status) WHERE status = 'published' AND event_date >= CURRENT_DATE;

-- ============================================
-- 4. EVENT_PERFORMERS (Many-to-Many)
-- ============================================
CREATE TABLE event_performers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    performer_id UUID NOT NULL REFERENCES performers(id) ON DELETE CASCADE,
    performance_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, performer_id)
);

-- Index for joins
CREATE INDEX idx_event_performers_event ON event_performers(event_id);
CREATE INDEX idx_event_performers_performer ON event_performers(performer_id);

-- ============================================
-- 5. CUSTOMERS TABLE
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on email
CREATE UNIQUE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================
-- 6. TRANSACTIONS TABLE (Midtrans Integration)
-- ============================================
CREATE TYPE transaction_status AS ENUM (
    'pending',      -- Waiting for payment
    'capture',      -- Payment captured (credit card)
    'settlement',   -- Payment settled
    'deny',         -- Payment denied
    'cancel',       -- Cancelled by user/merchant
    'expire',       -- Payment expired
    'refund',       -- Refunded
    'partial_refund', -- Partially refunded
    'failure'       -- Payment failed
);

CREATE TYPE payment_type AS ENUM (
    'credit_card',
    'bank_transfer',
    'echannel',     -- Mandiri Bill
    'bca_klikpay',
    'bca_klikbca',
    'bri_epay',
    'cimb_clicks',
    'danamon_online',
    'qris',
    'gopay',
    'shopeepay',
    'cstore',       -- Indomaret/Alfamart
    'akulaku',
    'kredivo',
    'other'
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(100) NOT NULL UNIQUE, -- SUN6BKS-{eventId}-{timestamp}-{random}
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    
    -- Pricing
    quantity INTEGER NOT NULL DEFAULT 1,
    price_per_ticket INTEGER NOT NULL, -- Price at time of purchase
    gross_amount INTEGER NOT NULL, -- Total amount in IDR
    
    -- Midtrans fields
    snap_token TEXT,
    snap_redirect_url TEXT,
    transaction_id VARCHAR(100), -- Midtrans transaction_id
    transaction_status transaction_status NOT NULL DEFAULT 'pending',
    transaction_time TIMESTAMPTZ,
    settlement_time TIMESTAMPTZ,
    payment_type payment_type,
    fraud_status VARCHAR(50),
    
    -- Metadata
    midtrans_response JSONB, -- Store full Midtrans response
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_event ON transactions(event_id);
CREATE INDEX idx_transactions_status ON transactions(transaction_status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_midtrans_id ON transactions(transaction_id) WHERE transaction_id IS NOT NULL;

-- ============================================
-- 7. TICKETS TABLE
-- ============================================
CREATE TYPE ticket_status AS ENUM (
    'reserved',     -- Reserved but not paid
    'active',       -- Paid and valid
    'used',         -- Already used/checked-in
    'cancelled',    -- Cancelled
    'refunded'      -- Refunded
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_code VARCHAR(20) NOT NULL UNIQUE, -- Unique ticket code for check-in
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    
    status ticket_status NOT NULL DEFAULT 'reserved',
    checked_in_at TIMESTAMPTZ,
    
    -- QR Code data
    qr_code_data TEXT, -- Encrypted ticket data for QR
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tickets
CREATE INDEX idx_tickets_code ON tickets(ticket_code);
CREATE INDEX idx_tickets_transaction ON tickets(transaction_id);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_event_status ON tickets(event_id, status);

-- ============================================
-- 8. ADMIN_USERS TABLE (for Clerk integration)
-- ============================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_users_clerk_id ON admin_users(clerk_user_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performers_updated_at
    BEFORE UPDATE ON performers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique ticket code
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result VARCHAR(20) := 'SUN6-';
    i INTEGER;
BEGIN
    FOR i IN 1..10 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        IF i = 5 THEN
            result := result || '-';
        END IF;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to decrease spots_left when ticket is created
CREATE OR REPLACE FUNCTION decrease_event_spots()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE events 
    SET spots_left = spots_left - 1
    WHERE id = NEW.event_id AND spots_left > 0;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No spots available for this event';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increase spots_left when ticket is cancelled/refunded
CREATE OR REPLACE FUNCTION increase_event_spots()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('cancelled', 'refunded') AND OLD.status NOT IN ('cancelled', 'refunded') THEN
        UPDATE events 
        SET spots_left = spots_left + 1
        WHERE id = NEW.event_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ticket creation (decrease spots)
CREATE TRIGGER decrease_spots_on_ticket_create
    AFTER INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION decrease_event_spots();

-- Trigger for ticket cancellation (increase spots)
CREATE TRIGGER increase_spots_on_ticket_cancel
    AFTER UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION increase_event_spots();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public read access for published events
CREATE POLICY "Public can view published events"
    ON events FOR SELECT
    USING (status = 'published');

-- Public read access for venues
CREATE POLICY "Public can view venues"
    ON venues FOR SELECT
    USING (TRUE);

-- Public read access for active performers
CREATE POLICY "Public can view active performers"
    ON performers FOR SELECT
    USING (is_active = TRUE);

-- Public read access for event_performers of published events
CREATE POLICY "Public can view event performers"
    ON event_performers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_performers.event_id 
            AND events.status = 'published'
        )
    );

-- Service role has full access (for server-side operations)
-- Note: Supabase service_role bypasses RLS by default

-- ============================================
-- SEED DATA (Optional - for development)
-- ============================================

-- Insert sample venues
INSERT INTO venues (name, address, city, latitude, longitude, capacity, google_maps_url) VALUES
    ('Komik Station Bekasi Square', 'Bekasi Square Mall Lt. 3, Jl. Ahmad Yani, Bekasi', 'Bekasi', -6.2382, 107.0012, 100, 'https://maps.google.com/?q=-6.2382,107.0012'),
    ('Standup Bekasi Mall', 'Bekasi Mall Lt. 2, Jl. Raya Bekasi, Bekasi Selatan', 'Bekasi', -6.2501, 106.9987, 80, 'https://maps.google.com/?q=-6.2501,106.9987'),
    ('KTV Spot Bekasi Selatan', 'Jl. Raya Jatiwaringin No. 45, Bekasi Selatan', 'Bekasi', -6.2650, 106.9750, 60, 'https://maps.google.com/?q=-6.2650,106.9750'),
    ('Bekasi Convention Center', 'Jl. KH Noer Ali, Bekasi Selatan', 'Bekasi', -6.2400, 107.0100, 200, 'https://maps.google.com/?q=-6.2400,107.0100');

-- Insert sample performers
INSERT INTO performers (name, bio, instagram_handle, is_active) VALUES
    ('Dedi', 'Komika asal Bekasi dengan gaya observational comedy', '@dedi_comedy', TRUE),
    ('Echa', 'Stand-up comedian dengan materi seputar kehidupan sehari-hari', '@echa_standup', TRUE),
    ('Fajar', 'Komika dengan gaya roasting yang khas', '@fajar_roast', TRUE),
    ('Rina', 'Komika wanita dengan jokes tentang relationship', '@rina_comedy', TRUE),
    ('Budi', 'Veteran komika Bekasi sejak 2018', '@budi_standup', TRUE),
    ('Citra', 'Komika dengan background corporate comedy', '@citra_jokes', TRUE),
    ('Ahmad', 'Komika dengan materi politik dan sosial', '@ahmad_comedy', TRUE),
    ('Joko', 'MC dan komika dengan gaya interaktif', '@joko_mc', TRUE),
    ('Dewi', 'Komika dengan jokes tentang parenting', '@dewi_standup', TRUE),
    ('Rudi', 'Komika dengan gaya storytelling', '@rudi_stories', TRUE),
    ('Sari', 'Komika dengan materi dark humor', '@sari_dark', TRUE);

