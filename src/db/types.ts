// ============================================
// SUN 6 BKS Database TypeScript Types
// Generated from Supabase schema
// ============================================

// ============================================
// ENUMS
// ============================================

export type EventStatus = "draft" | "published" | "cancelled" | "completed";

export type TransactionStatus =
  | "pending"
  | "capture"
  | "settlement"
  | "deny"
  | "cancel"
  | "expire"
  | "refund"
  | "partial_refund"
  | "failure";

export type PaymentType =
  | "credit_card"
  | "bank_transfer"
  | "echannel"
  | "bca_klikpay"
  | "bca_klikbca"
  | "bri_epay"
  | "cimb_clicks"
  | "danamon_online"
  | "qris"
  | "gopay"
  | "shopeepay"
  | "cstore"
  | "akulaku"
  | "kredivo"
  | "other";

export type TicketStatus =
  | "reserved"
  | "active"
  | "used"
  | "cancelled"
  | "refunded";

// ============================================
// TABLE TYPES
// ============================================

export type Venue = {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  google_maps_url: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueInsert = Omit<Venue, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type VenueUpdate = Partial<VenueInsert>;

export type Performer = {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  instagram_handle: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PerformerInsert = Omit<
  Performer,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type PerformerUpdate = Partial<PerformerInsert>;

export type Event = {
  id: string;
  title: string;
  description: string | null;
  event_date: string; // ISO date string (YYYY-MM-DD)
  event_time: string; // Time string (HH:MM:SS)
  venue_id: string | null;
  price: number;
  capacity: number;
  spots_left: number;
  status: EventStatus;
  image_url: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type EventInsert = Omit<Event, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type EventUpdate = Partial<EventInsert>;

export type EventPerformer = {
  id: string;
  event_id: string;
  performer_id: string;
  performance_order: number;
  created_at: string;
};

export type EventPerformerInsert = Omit<
  EventPerformer,
  "id" | "created_at"
> & {
  id?: string;
  created_at?: string;
};

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerInsert = Omit<
  Customer,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CustomerUpdate = Partial<CustomerInsert>;

export type Transaction = {
  id: string;
  order_id: string;
  customer_id: string;
  event_id: string;
  quantity: number;
  price_per_ticket: number;
  gross_amount: number;
  snap_token: string | null;
  snap_redirect_url: string | null;
  transaction_id: string | null;
  transaction_status: TransactionStatus;
  transaction_time: string | null;
  settlement_time: string | null;
  payment_type: PaymentType | null;
  fraud_status: string | null;
  midtrans_response: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionInsert = Omit<
  Transaction,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type TransactionUpdate = Partial<TransactionInsert>;

export type Ticket = {
  id: string;
  ticket_code: string;
  transaction_id: string;
  event_id: string;
  customer_id: string;
  status: TicketStatus;
  checked_in_at: string | null;
  qr_code_data: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketInsert = Omit<
  Ticket,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type TicketUpdate = Partial<TicketInsert>;

export type AdminUser = {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUserInsert = Omit<
  AdminUser,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type AdminUserUpdate = Partial<AdminUserInsert>;

// ============================================
// JOINED/EXTENDED TYPES
// ============================================

/** Event with venue details */
export type EventWithVenue = Event & {
  venue: Venue | null;
};

/** Event with venue and performers */
export type EventWithDetails = Event & {
  venue: Venue | null;
  performers: Performer[];
};

/** Transaction with customer and event */
export type TransactionWithDetails = Transaction & {
  customer: Customer;
  event: EventWithVenue;
};

/** Ticket with all relations */
export type TicketWithDetails = Ticket & {
  transaction: Transaction;
  event: EventWithVenue;
  customer: Customer;
};

// ============================================
// API RESPONSE TYPES
// ============================================

/** Public event data for frontend display */
export type PublicEventData = {
  id: string;
  title: string;
  description: string | null;
  date: string; // Formatted date string
  time: string; // Formatted time string
  venue: string; // Venue name
  venueAddress: string;
  performers: string[]; // Array of performer names
  price: string; // Formatted price string (e.g., "Rp50.000")
  priceNumber: number; // Raw price number
  spotsLeft: number;
  capacity: number;
  imageUrl: string | null;
  isFeatured: boolean;
};

/** Transform database event to public event data */
export const toPublicEventData = (
  event: EventWithDetails
): PublicEventData => {
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(event.price);

  // Format date
  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Format time
  const [hours, minutes] = event.event_time.split(":");
  const formattedTime = `${hours}:${minutes} WIB`;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: formattedDate,
    time: formattedTime,
    venue: event.venue?.name ?? "TBA",
    venueAddress: event.venue?.address ?? "",
    performers: event.performers.map((p) => p.name),
    price: formattedPrice,
    priceNumber: event.price,
    spotsLeft: event.spots_left,
    capacity: event.capacity,
    imageUrl: event.image_url,
    isFeatured: event.is_featured,
  };
};

// ============================================
// SUPABASE DATABASE TYPE DEFINITION
// ============================================

export type Database = {
  public: {
    Tables: {
      venues: {
        Row: Venue;
        Insert: VenueInsert;
        Update: VenueUpdate;
      };
      performers: {
        Row: Performer;
        Insert: PerformerInsert;
        Update: PerformerUpdate;
      };
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      event_performers: {
        Row: EventPerformer;
        Insert: EventPerformerInsert;
        Update: Partial<EventPerformerInsert>;
      };
      customers: {
        Row: Customer;
        Insert: CustomerInsert;
        Update: CustomerUpdate;
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: TransactionUpdate;
      };
      tickets: {
        Row: Ticket;
        Insert: TicketInsert;
        Update: TicketUpdate;
      };
      admin_users: {
        Row: AdminUser;
        Insert: AdminUserInsert;
        Update: AdminUserUpdate;
      };
    };
    Enums: {
      event_status: EventStatus;
      transaction_status: TransactionStatus;
      payment_type: PaymentType;
      ticket_status: TicketStatus;
    };
  };
};

