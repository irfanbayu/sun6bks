-- Atomic stock decrement function
-- Called from webhook handler when status becomes 'paid'
CREATE OR REPLACE FUNCTION decrement_stock(
  p_category_id BIGINT,
  p_quantity INTEGER
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ticket_stocks
  SET remaining_stock = remaining_stock - p_quantity
  WHERE category_id = p_category_id
    AND remaining_stock >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock for category_id=%', p_category_id;
  END IF;
END;
$$;
