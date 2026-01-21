-- ============================================
-- SUN 6 BKS Database Functions
-- Run this after schema.sql
-- ============================================

-- ============================================
-- STORED PROCEDURE: Decrease Event Spots
-- ============================================
CREATE OR REPLACE FUNCTION decrease_spots(
    p_event_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_spots_left INTEGER;
BEGIN
    -- Lock the row to prevent race conditions
    SELECT spots_left INTO v_spots_left
    FROM events
    WHERE id = p_event_id
    FOR UPDATE;
    
    IF v_spots_left IS NULL THEN
        RAISE EXCEPTION 'Event not found: %', p_event_id;
    END IF;
    
    IF v_spots_left < p_quantity THEN
        RAISE EXCEPTION 'Not enough spots available. Requested: %, Available: %', p_quantity, v_spots_left;
    END IF;
    
    UPDATE events
    SET spots_left = spots_left - p_quantity,
        updated_at = NOW()
    WHERE id = p_event_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORED PROCEDURE: Increase Event Spots
-- ============================================
CREATE OR REPLACE FUNCTION increase_spots(
    p_event_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_capacity INTEGER;
    v_spots_left INTEGER;
BEGIN
    SELECT capacity, spots_left INTO v_capacity, v_spots_left
    FROM events
    WHERE id = p_event_id
    FOR UPDATE;
    
    IF v_capacity IS NULL THEN
        RAISE EXCEPTION 'Event not found: %', p_event_id;
    END IF;
    
    -- Don't exceed capacity
    UPDATE events
    SET spots_left = LEAST(spots_left + p_quantity, capacity),
        updated_at = NOW()
    WHERE id = p_event_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORED PROCEDURE: Process Payment Settlement
-- Atomically updates transaction and tickets
-- ============================================
CREATE OR REPLACE FUNCTION process_payment_settlement(
    p_order_id VARCHAR(100),
    p_transaction_id VARCHAR(100),
    p_payment_type VARCHAR(50),
    p_settlement_time TIMESTAMPTZ,
    p_midtrans_response JSONB
)
RETURNS TABLE (
    transaction_id UUID,
    tickets_activated INTEGER
) AS $$
DECLARE
    v_transaction_id UUID;
    v_tickets_count INTEGER;
BEGIN
    -- Update transaction
    UPDATE transactions
    SET 
        transaction_id = p_transaction_id,
        transaction_status = 'settlement',
        payment_type = p_payment_type::payment_type,
        settlement_time = p_settlement_time,
        midtrans_response = p_midtrans_response,
        updated_at = NOW()
    WHERE order_id = p_order_id
    RETURNING id INTO v_transaction_id;
    
    IF v_transaction_id IS NULL THEN
        RAISE EXCEPTION 'Transaction not found: %', p_order_id;
    END IF;
    
    -- Activate tickets
    UPDATE tickets
    SET 
        status = 'active',
        updated_at = NOW()
    WHERE tickets.transaction_id = v_transaction_id
    AND status = 'reserved';
    
    GET DIAGNOSTICS v_tickets_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_transaction_id, v_tickets_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORED PROCEDURE: Cancel Transaction
-- Atomically cancels transaction and restores spots
-- ============================================
CREATE OR REPLACE FUNCTION cancel_transaction(
    p_order_id VARCHAR(100),
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    transaction_id UUID,
    tickets_cancelled INTEGER,
    spots_restored INTEGER
) AS $$
DECLARE
    v_transaction_id UUID;
    v_event_id UUID;
    v_tickets_count INTEGER;
BEGIN
    -- Get transaction details
    SELECT t.id, t.event_id INTO v_transaction_id, v_event_id
    FROM transactions t
    WHERE t.order_id = p_order_id
    FOR UPDATE;
    
    IF v_transaction_id IS NULL THEN
        RAISE EXCEPTION 'Transaction not found: %', p_order_id;
    END IF;
    
    -- Update transaction status
    UPDATE transactions
    SET 
        transaction_status = 'cancel',
        notes = COALESCE(notes || E'\n', '') || 'Cancelled: ' || COALESCE(p_reason, 'No reason provided'),
        updated_at = NOW()
    WHERE id = v_transaction_id;
    
    -- Cancel tickets and count them
    UPDATE tickets
    SET 
        status = 'cancelled',
        updated_at = NOW()
    WHERE tickets.transaction_id = v_transaction_id
    AND status IN ('reserved', 'active');
    
    GET DIAGNOSTICS v_tickets_count = ROW_COUNT;
    
    -- Restore spots to event
    IF v_tickets_count > 0 THEN
        UPDATE events
        SET 
            spots_left = LEAST(spots_left + v_tickets_count, capacity),
            updated_at = NOW()
        WHERE id = v_event_id;
    END IF;
    
    RETURN QUERY SELECT v_transaction_id, v_tickets_count, v_tickets_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEW: Transaction Summary
-- ============================================
CREATE OR REPLACE VIEW transaction_summary AS
SELECT 
    t.id,
    t.order_id,
    t.transaction_status,
    t.payment_type,
    t.gross_amount,
    t.quantity,
    t.created_at,
    t.settlement_time,
    c.name AS customer_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    e.title AS event_title,
    e.event_date,
    e.event_time,
    v.name AS venue_name,
    (
        SELECT COUNT(*) 
        FROM tickets tk 
        WHERE tk.transaction_id = t.id AND tk.status = 'active'
    ) AS active_tickets,
    (
        SELECT COUNT(*) 
        FROM tickets tk 
        WHERE tk.transaction_id = t.id AND tk.status = 'used'
    ) AS used_tickets
FROM transactions t
JOIN customers c ON t.customer_id = c.id
JOIN events e ON t.event_id = e.id
LEFT JOIN venues v ON e.venue_id = v.id
ORDER BY t.created_at DESC;

-- ============================================
-- VIEW: Event Statistics
-- ============================================
CREATE OR REPLACE VIEW event_statistics AS
SELECT 
    e.id,
    e.title,
    e.event_date,
    e.event_time,
    e.capacity,
    e.spots_left,
    e.capacity - e.spots_left AS tickets_sold,
    e.price,
    (e.capacity - e.spots_left) * e.price AS total_revenue,
    v.name AS venue_name,
    (
        SELECT COUNT(DISTINCT t.customer_id)
        FROM transactions t
        WHERE t.event_id = e.id AND t.transaction_status = 'settlement'
    ) AS unique_customers,
    (
        SELECT COUNT(*)
        FROM tickets tk
        WHERE tk.event_id = e.id AND tk.status = 'used'
    ) AS checked_in_count,
    ARRAY(
        SELECT p.name
        FROM event_performers ep
        JOIN performers p ON ep.performer_id = p.id
        WHERE ep.event_id = e.id
        ORDER BY ep.performance_order
    ) AS performers
FROM events e
LEFT JOIN venues v ON e.venue_id = v.id
WHERE e.status = 'published'
ORDER BY e.event_date ASC;

-- ============================================
-- GRANT PERMISSIONS (for Supabase)
-- ============================================

-- Grant usage on functions to authenticated and anon roles
GRANT EXECUTE ON FUNCTION decrease_spots TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increase_spots TO authenticated, anon;
GRANT EXECUTE ON FUNCTION process_payment_settlement TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cancel_transaction TO authenticated, service_role;

-- Grant select on views
GRANT SELECT ON transaction_summary TO authenticated, service_role;
GRANT SELECT ON event_statistics TO authenticated, service_role;

