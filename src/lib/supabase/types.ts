// Database types for SUN 6 BKS
// These mirror the Supabase schema defined in supabase/migrations/

export type TransactionStatus = "pending" | "paid" | "expired" | "failed" | "refunded";
export type TicketStatus = "inactive" | "active" | "used" | "cancelled";
export type UserRole = "ADMIN" | "USER";

export type DbEvent = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  date: string;
  time_label: string;
  venue: string;
  venue_address: string | null;
  venue_lat: number | null;
  venue_lng: number | null;
  performers: string[];
  image_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type DbTicketCategory = {
  id: number;
  event_id: number;
  name: string;
  price: number;
  description: string | null;
  features: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbTicketStock = {
  id: number;
  category_id: number;
  total_stock: number;
  remaining_stock: number;
  created_at: string;
  updated_at: string;
};

export type DbUserProfile = {
  id: number;
  clerk_user_id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type DbTransaction = {
  id: number;
  midtrans_order_id: string;
  event_id: number;
  category_id: number;
  quantity: number;
  amount: number;
  status: TransactionStatus;
  snap_token: string | null;
  snap_redirect_url: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  clerk_user_id: string | null;
  paid_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTicket = {
  id: number;
  transaction_id: number;
  ticket_code: string;
  status: TicketStatus;
  activated_at: string | null;
  used_at: string | null;
  created_at: string;
};

export type DbAuditLog = {
  id: number;
  admin_id: string;
  admin_email: string | null;
  transaction_id: number;
  action: string;
  old_status: string | null;
  new_status: string | null;
  reason: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type DbWebhookPayload = {
  id: number;
  midtrans_order_id: string | null;
  payload: Record<string, unknown>;
  signature_valid: boolean;
  processed: boolean;
  created_at: string;
};

// Joined types for frontend consumption
export type EventWithCategories = DbEvent & {
  ticket_categories: (DbTicketCategory & {
    ticket_stocks: DbTicketStock | null;
  })[];
};
