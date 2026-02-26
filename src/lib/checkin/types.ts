import type { TicketStatus } from "@/lib/supabase/types";

export type CheckinTicketStatus = Extract<TicketStatus, "active" | "used">;

export type CheckinTicketSnapshot = {
  ticketCode: string;
  status: CheckinTicketStatus;
  usedAt: string | null;
  transactionId: number;
};

export type CheckinSnapshotMeta = {
  eventId: number;
  eventTitle: string;
  snapshotAt: string;
  count: number;
};

export type OfflineQueueAction = "mark_used" | "override_manual";

export type OfflineQueueStatus =
  | "pending"
  | "synced"
  | "synced_duplicate"
  | "failed_invalid"
  | "failed_error";

export type OfflineQueueItem = {
  id: string;
  eventId: number;
  ticketCode: string;
  action: OfflineQueueAction;
  scannedAt: string;
  note: string | null;
  deviceId: string;
  status: OfflineQueueStatus;
  retryCount: number;
  syncedAt: string | null;
  lastError: string | null;
};

export type CheckinScanStatus =
  | "success"
  | "already_used"
  | "invalid"
  | "queued"
  | "override_queued";

export type CheckinScanFeedback = {
  status: CheckinScanStatus;
  ticketCode: string;
  message: string;
  scannedAt: string;
};

export type EventCheckinOption = {
  id: number;
  title: string;
  date: string;
};

export type CheckinSyncPayload = {
  eventId: number;
  items: Array<{
    id: string;
    ticketCode: string;
    action: OfflineQueueAction;
    scannedAt: string;
    note: string | null;
    deviceId: string;
  }>;
};
