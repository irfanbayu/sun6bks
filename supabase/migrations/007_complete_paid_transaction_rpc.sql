-- Idempotency: Atomic complete_paid_transaction RPC
-- Single source of truth: status update + stock decrement + ticket creation
-- Guard: cek sudah issue tiket sebelum insert (cegah tiket ganda)

CREATE OR REPLACE FUNCTION complete_paid_transaction(
  p_transaction_id BIGINT,
  p_category_id BIGINT,
  p_quantity INTEGER
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status transaction_status;
  v_ticket_count INTEGER;
  v_ticket_code TEXT;
  v_i INTEGER;
BEGIN
  -- 1. Lock transaction row, get current status
  SELECT status INTO v_current_status
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Transaction not found'::TEXT;
    RETURN;
  END IF;

  IF v_current_status != 'pending' THEN
    -- Idempotent: sudah paid/expired, skip
    RETURN QUERY SELECT true, 'Already processed'::TEXT;
    RETURN;
  END IF;

  -- 2. Guard: cek sudah ada tiket untuk transaksi ini
  SELECT COUNT(*) INTO v_ticket_count
  FROM tickets
  WHERE transaction_id = p_transaction_id;

  IF v_ticket_count > 0 THEN
    -- Idempotent: tiket sudah di-issue, jangan insert lagi
    RETURN QUERY SELECT true, 'Tickets already issued'::TEXT;
    RETURN;
  END IF;

  -- 3. Update status ke paid
  UPDATE transactions
  SET status = 'paid', paid_at = now(), updated_at = now()
  WHERE id = p_transaction_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Concurrent update conflict'::TEXT;
    RETURN;
  END IF;

  -- 4. Decrement stock (atomic)
  UPDATE ticket_stocks
  SET remaining_stock = remaining_stock - p_quantity
  WHERE category_id = p_category_id
    AND remaining_stock >= p_quantity;

  IF NOT FOUND THEN
    -- Rollback: kembalikan status ke pending
    UPDATE transactions SET status = 'pending', paid_at = NULL WHERE id = p_transaction_id;
    RETURN QUERY SELECT false, 'Insufficient stock'::TEXT;
    RETURN;
  END IF;

  -- 5. Create tickets (guard sudah lewati di atas)
  -- Format: SUBE-XXXX-XXXX-XXXX (selaras dengan generateTicketCode di JS)
  FOR v_i IN 1..p_quantity LOOP
    v_ticket_code := 'SUBE-' ||
      upper(substring(md5(gen_random_uuid()::text || v_i::text || clock_timestamp()::text), 1, 4)) || '-' ||
      upper(substring(md5(gen_random_uuid()::text || v_i::text || clock_timestamp()::text), 5, 4)) || '-' ||
      upper(substring(md5(gen_random_uuid()::text || v_i::text || clock_timestamp()::text), 9, 4));

    INSERT INTO tickets (transaction_id, ticket_code, status, activated_at)
    VALUES (p_transaction_id, v_ticket_code, 'active', now());
  END LOOP;

  RETURN QUERY SELECT true, 'OK'::TEXT;
END;
$$;
