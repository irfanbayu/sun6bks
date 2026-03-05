/**
 * Standupindo Bekasi Events — Types Public Entry Point
 *
 * Re-export strategy: semua shared types dikonsolidasi di sini agar consumer
 * cukup import dari "@/types". Internal structure (domain/, api/, shared/) boleh
 * berubah; import path "@/types" tetap stabil.
 */

export type { Id, Nullable } from "./shared";

export * from "./domain/event";

export * from "./midtrans";

// Re-export infra types (DB/Supabase) — source of truth tetap di lib/supabase/types
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
