// SUN 6 BKS Type Definitions

export type Event = {
  id: number;
  title: string;
  date: string;
  venue: string;
  performers: Performer[];
  price: string;
  map: {
    lat: number;
    lng: number;
  };
  adminOnly?: boolean;
};

export type Performer = {
  name: string;
  image: string;
  instagram: string;
  youtube: string;
};

export type Venue = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/** Minimal payload for single-event landing page (server → client) */
export type LandingTicketCategory = {
  id: number;
  name: string;
  price: number;
  description: string | null;
  features: string[];
  sort_order: number;
  spotsLeft: number;
};

export type LandingEvent = {
  id: number;
  title: string;
  date: string;
  time_label: string;
  venue: string;
  venue_address: string | null;
  venue_lat: number | null;
  venue_lng: number | null;
  venue_maps_url: string | null;
  performers: Performer[];
  categories: LandingTicketCategory[];
};

// Re-export Midtrans types
export * from "./midtrans";

// Re-export DB types
export type {
  PerformerData,
  DbEvent,
  DbTicketCategory,
  DbTicketStock,
  DbTransaction,
  DbTicket,
  DbAuditLog,
  DbWebhookPayload,
  DbUserProfile,
  EventWithCategories,
  TransactionStatus,
  TicketStatus,
  UserRole,
} from "@/lib/supabase/types";
