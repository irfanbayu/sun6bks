"use client";

import type { OfflineQueueAction, OfflineQueueItem } from "@/lib/checkin/types";
import {
  getPendingQueueItems,
  updateQueueItemStatus,
} from "@/lib/checkin/offline-db";

const DEVICE_ID_KEY = "sun6bks-checkin-device-id-v1";
const MAX_RETRY = 5;

type SyncApiResult = {
  id: string;
  status: "synced" | "synced_duplicate" | "failed_invalid" | "failed_error";
  message: string;
};

type SyncApiResponse = {
  success: boolean;
  message: string;
  results: SyncApiResult[];
};

export const normalizeTicketCode = (rawValue: string): string =>
  rawValue.trim().toUpperCase();

export const getOrCreateDeviceId = (): string => {
  if (typeof window === "undefined") return "server-device";

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const newId = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
};

export const createOfflineQueueItem = (params: {
  eventId: number;
  ticketCode: string;
  action: OfflineQueueAction;
  note: string | null;
  deviceId: string;
}): OfflineQueueItem => ({
  id: crypto.randomUUID(),
  eventId: params.eventId,
  ticketCode: params.ticketCode,
  action: params.action,
  scannedAt: new Date().toISOString(),
  note: params.note,
  deviceId: params.deviceId,
  status: "pending",
  retryCount: 0,
  syncedAt: null,
  lastError: null,
});

const groupByEvent = (
  items: OfflineQueueItem[],
): Record<number, OfflineQueueItem[]> =>
  items.reduce<Record<number, OfflineQueueItem[]>>((acc, item) => {
    if (!acc[item.eventId]) {
      acc[item.eventId] = [];
    }
    acc[item.eventId].push(item);
    return acc;
  }, {});

export const flushOfflineQueue = async (): Promise<{
  flushedCount: number;
  failedCount: number;
}> => {
  if (typeof window === "undefined") {
    return { flushedCount: 0, failedCount: 0 };
  }

  if (!navigator.onLine) {
    return { flushedCount: 0, failedCount: 0 };
  }

  const pendingItems = await getPendingQueueItems();
  if (pendingItems.length === 0) {
    return { flushedCount: 0, failedCount: 0 };
  }

  const batches = groupByEvent(pendingItems);
  let flushedCount = 0;
  let failedCount = 0;

  for (const [eventId, items] of Object.entries(batches)) {
    try {
      const response = await fetch("/api/admin/tickets/checkin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: Number(eventId),
          items: items.map((item) => ({
            id: item.id,
            ticketCode: item.ticketCode,
            action: item.action,
            scannedAt: item.scannedAt,
            note: item.note,
            deviceId: item.deviceId,
          })),
        }),
      });

      if (!response.ok) {
        for (const item of items) {
          const nextRetry = item.retryCount + 1;
          await updateQueueItemStatus(item.id, {
            status: nextRetry >= MAX_RETRY ? "failed_error" : "pending",
            retryCount: nextRetry,
            syncedAt: null,
            lastError: "Sinkronisasi gagal. Coba lagi saat online stabil.",
          });
          failedCount += 1;
        }
        continue;
      }

      const payload = (await response.json()) as SyncApiResponse;
      const resultMap = new Map(payload.results.map((result) => [result.id, result]));

      for (const item of items) {
        const result = resultMap.get(item.id);
        if (!result) {
          await updateQueueItemStatus(item.id, {
            status: "failed_error",
            retryCount: item.retryCount + 1,
            syncedAt: null,
            lastError: "Response sinkronisasi tidak lengkap.",
          });
          failedCount += 1;
          continue;
        }

        await updateQueueItemStatus(item.id, {
          status: result.status,
          retryCount: item.retryCount + (result.status === "failed_error" ? 1 : 0),
          syncedAt:
            result.status === "synced" || result.status === "synced_duplicate"
              ? new Date().toISOString()
              : null,
          lastError:
            result.status === "failed_invalid" || result.status === "failed_error"
              ? result.message
              : null,
        });

        if (result.status === "synced" || result.status === "synced_duplicate") {
          flushedCount += 1;
        } else {
          failedCount += 1;
        }
      }
    } catch (error) {
      for (const item of items) {
        await updateQueueItemStatus(item.id, {
          status: "pending",
          retryCount: item.retryCount + 1,
          syncedAt: null,
          lastError:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat sinkronisasi.",
        });
        failedCount += 1;
      }
    }
  }

  return { flushedCount, failedCount };
};
