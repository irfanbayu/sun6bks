"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  CheckinSnapshotMeta,
  CheckinTicketSnapshot,
  OfflineQueueItem,
  OfflineQueueStatus,
} from "@/lib/checkin/types";

type StoredTicket = CheckinTicketSnapshot & {
  key: string;
  eventId: number;
};

type StoredMeta = CheckinSnapshotMeta & {
  key: number;
};

type CheckinDbSchema = DBSchema & {
  tickets: {
    key: string;
    value: StoredTicket;
    indexes: {
      "by-event": number;
      "by-code": string;
    };
  };
  snapshotMeta: {
    key: number;
    value: StoredMeta;
  };
  queue: {
    key: string;
    value: OfflineQueueItem;
    indexes: {
      "by-status": OfflineQueueStatus;
      "by-event": number;
    };
  };
};

const DB_NAME = "sun6bks-checkin-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CheckinDbSchema>> | null = null;

const toTicketKey = (eventId: number, ticketCode: string): string =>
  `${eventId}:${ticketCode}`;

const getDb = async (): Promise<IDBPDatabase<CheckinDbSchema>> => {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<CheckinDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("tickets")) {
        const ticketStore = db.createObjectStore("tickets", { keyPath: "key" });
        ticketStore.createIndex("by-event", "eventId");
        ticketStore.createIndex("by-code", "ticketCode");
      }

      if (!db.objectStoreNames.contains("snapshotMeta")) {
        db.createObjectStore("snapshotMeta", { keyPath: "key" });
      }

      if (!db.objectStoreNames.contains("queue")) {
        const queueStore = db.createObjectStore("queue", { keyPath: "id" });
        queueStore.createIndex("by-status", "status");
        queueStore.createIndex("by-event", "eventId");
      }
    },
  });

  return dbPromise;
};

export const replaceEventSnapshot = async (
  meta: CheckinSnapshotMeta,
  tickets: CheckinTicketSnapshot[],
): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction(["tickets", "snapshotMeta"], "readwrite");
  const ticketStore = tx.objectStore("tickets");
  const eventIndex = ticketStore.index("by-event");

  let cursor = await eventIndex.openCursor(meta.eventId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await Promise.all(
    tickets.map((ticket) =>
      ticketStore.put({
        ...ticket,
        eventId: meta.eventId,
        key: toTicketKey(meta.eventId, ticket.ticketCode),
      }),
    ),
  );

  await tx.objectStore("snapshotMeta").put({
    ...meta,
    key: meta.eventId,
  });

  await tx.done;
};

export const getSnapshotMeta = async (
  eventId: number,
): Promise<CheckinSnapshotMeta | null> => {
  const db = await getDb();
  const data = await db.get("snapshotMeta", eventId);

  if (!data) return null;

  return {
    eventId: data.eventId,
    eventTitle: data.eventTitle,
    snapshotAt: data.snapshotAt,
    count: data.count,
  };
};

export const getTicketFromSnapshot = async (
  eventId: number,
  ticketCode: string,
): Promise<CheckinTicketSnapshot | null> => {
  const db = await getDb();
  const data = await db.get("tickets", toTicketKey(eventId, ticketCode));
  if (!data) return null;

  return {
    ticketCode: data.ticketCode,
    status: data.status,
    usedAt: data.usedAt,
    transactionId: data.transactionId,
  };
};

export const markTicketUsedLocally = async (
  eventId: number,
  ticketCode: string,
  usedAt: string,
): Promise<void> => {
  const db = await getDb();
  const key = toTicketKey(eventId, ticketCode);
  const existing = await db.get("tickets", key);
  if (!existing) return;

  await db.put("tickets", {
    ...existing,
    status: "used",
    usedAt,
  });
};

export const enqueueOfflineItem = async (
  item: OfflineQueueItem,
): Promise<void> => {
  const db = await getDb();
  await db.put("queue", item);
};

export const getPendingQueueItems = async (): Promise<OfflineQueueItem[]> => {
  const db = await getDb();
  return db.getAllFromIndex("queue", "by-status", "pending");
};

export const updateQueueItemStatus = async (
  id: string,
  updates: Pick<OfflineQueueItem, "status" | "lastError" | "syncedAt" | "retryCount">,
): Promise<void> => {
  const db = await getDb();
  const existing = await db.get("queue", id);
  if (!existing) return;

  await db.put("queue", {
    ...existing,
    ...updates,
  });
};

export const getRecentQueueItems = async (
  eventId: number,
  limit = 20,
): Promise<OfflineQueueItem[]> => {
  const db = await getDb();
  const allItems = await db.getAllFromIndex("queue", "by-event", eventId);
  return allItems
    .sort((a, b) => Date.parse(b.scannedAt) - Date.parse(a.scannedAt))
    .slice(0, limit);
};

export const getQueueItem = async (
  id: string,
): Promise<OfflineQueueItem | null> => {
  const db = await getDb();
  return (await db.get("queue", id)) ?? null;
};
