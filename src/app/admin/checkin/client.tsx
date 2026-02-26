"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  enqueueOfflineItem,
  getQueueItem,
  getRecentQueueItems,
  getSnapshotMeta,
  getTicketFromSnapshot,
  markTicketUsedLocally,
  replaceEventSnapshot,
} from "@/lib/checkin/offline-db";
import {
  createOfflineQueueItem,
  flushOfflineQueue,
  getOrCreateDeviceId,
  normalizeTicketCode,
} from "@/lib/checkin/sync";
import type {
  CheckinScanFeedback,
  CheckinSnapshotMeta,
  EventCheckinOption,
  OfflineQueueItem,
} from "@/lib/checkin/types";

type AdminCheckinClientProps = {
  events: EventCheckinOption[];
};

const FEEDBACK_STYLE: Record<
  CheckinScanFeedback["status"],
  { wrapper: string; title: string }
> = {
  success: {
    wrapper: "border-green-400/40 bg-green-500/10 text-green-200",
    title: "Check-in Berhasil",
  },
  already_used: {
    wrapper: "border-yellow-400/40 bg-yellow-500/10 text-yellow-100",
    title: "Tiket Sudah Digunakan",
  },
  invalid: {
    wrapper: "border-red-400/40 bg-red-500/10 text-red-100",
    title: "Tiket Tidak Valid",
  },
  queued: {
    wrapper: "border-blue-400/40 bg-blue-500/10 text-blue-100",
    title: "Disimpan ke Antrean Offline",
  },
  override_queued: {
    wrapper: "border-purple-400/40 bg-purple-500/10 text-purple-100",
    title: "Override Manual Disimpan",
  },
};

type ZXingControls = {
  stop: () => void;
};

export const AdminCheckinClient = ({ events }: AdminCheckinClientProps) => {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    events[0]?.id ?? null,
  );
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [snapshotMeta, setSnapshotMeta] = useState<CheckinSnapshotMeta | null>(
    null,
  );
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [feedback, setFeedback] = useState<CheckinScanFeedback | null>(null);
  const [history, setHistory] = useState<CheckinScanFeedback[]>([]);
  const [queueItems, setQueueItems] = useState<OfflineQueueItem[]>([]);
  const [pendingOverrideCode, setPendingOverrideCode] = useState<string | null>(
    null,
  );
  const [isGateMode, setIsGateMode] = useState(true);
  const [isAutoStartEnabled, setIsAutoStartEnabled] = useState(true);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<ZXingControls | null>(null);
  const isHandlingScanRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const hasAutoStartedRef = useRef(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const addHistory = useCallback((item: CheckinScanFeedback) => {
    setHistory((prev) => [item, ...prev].slice(0, 20));
  }, []);

  const handlePlayFeedbackTone = useCallback(
    (status: CheckinScanFeedback["status"]) => {
      if (typeof window === "undefined") return;

      try {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = "sine";
        oscillator.frequency.value =
          status === "success" || status === "queued" || status === "override_queued"
            ? 880
            : 280;
        gainNode.gain.value = 0.04;

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.12);
      } catch {
        // no-op for unsupported browser
      }
    },
    [],
  );

  const syncPendingQueue = useCallback(async () => {
    setIsSyncing(true);
    try {
      await flushOfflineQueue();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const refreshQueue = useCallback(async () => {
    if (!selectedEventId) {
      setQueueItems([]);
      return;
    }
    const recentItems = await getRecentQueueItems(selectedEventId, 20);
    setQueueItems(recentItems);
  }, [selectedEventId]);

  const loadSnapshotMetaOnly = useCallback(async () => {
    if (!selectedEventId) {
      setSnapshotMeta(null);
      return;
    }
    const meta = await getSnapshotMeta(selectedEventId);
    setSnapshotMeta(meta);
  }, [selectedEventId]);

  const loadSnapshotForSelectedEvent = useCallback(async () => {
    if (!selectedEventId || !selectedEvent) return;

    if (!isOnline) {
      await loadSnapshotMetaOnly();
      return;
    }

    setIsLoadingSnapshot(true);
    try {
      const response = await fetch(
        `/api/admin/tickets/checkin/snapshot?eventId=${selectedEventId}`,
      );
      const payload = (await response.json()) as {
        success: boolean;
        message: string;
        eventTitle?: string;
        tickets?: Array<{
          ticketCode: string;
          status: "active" | "used";
          usedAt: string | null;
          transactionId: number;
        }>;
      };

      if (!response.ok || !payload.success || !payload.tickets) {
        setFeedback({
          status: "invalid",
          ticketCode: "-",
          message: payload.message || "Gagal memuat snapshot tiket.",
          scannedAt: new Date().toISOString(),
        });
        return;
      }

      await replaceEventSnapshot(
        {
          eventId: selectedEventId,
          eventTitle: payload.eventTitle ?? selectedEvent.title,
          snapshotAt: new Date().toISOString(),
          count: payload.tickets.length,
        },
        payload.tickets,
      );

      await loadSnapshotMetaOnly();
      setFeedback({
        status: "queued",
        ticketCode: "-",
        message: `Snapshot diperbarui (${payload.tickets.length} tiket).`,
        scannedAt: new Date().toISOString(),
      });
    } catch (error) {
      setFeedback({
        status: "invalid",
        ticketCode: "-",
        message:
          error instanceof Error ? error.message : "Gagal memuat snapshot tiket.",
        scannedAt: new Date().toISOString(),
      });
    } finally {
      setIsLoadingSnapshot(false);
    }
  }, [isOnline, loadSnapshotMetaOnly, selectedEvent, selectedEventId]);

  const resolveQueueFeedback = useCallback(
    async (queueId: string, fallback: CheckinScanFeedback) => {
      const item = await getQueueItem(queueId);
      if (!item) {
        addHistory(fallback);
        setFeedback(fallback);
        return;
      }

      if (item.status === "synced_duplicate") {
        const duplicateFeedback: CheckinScanFeedback = {
          status: "already_used",
          ticketCode: item.ticketCode,
          scannedAt: item.scannedAt,
          message: "Server menandai tiket sudah digunakan sebelumnya.",
        };
        addHistory(duplicateFeedback);
        setFeedback(duplicateFeedback);
        return;
      }

      if (item.status === "failed_invalid" || item.status === "failed_error") {
        const failedFeedback: CheckinScanFeedback = {
          status: "invalid",
          ticketCode: item.ticketCode,
          scannedAt: item.scannedAt,
          message: item.lastError ?? "Sinkronisasi gagal.",
        };
        addHistory(failedFeedback);
        setFeedback(failedFeedback);
        return;
      }

      addHistory(fallback);
      setFeedback(fallback);
    },
    [addHistory],
  );

  const handleTicketScan = useCallback(
    async (rawCode: string) => {
      if (!selectedEventId) return;
      if (isHandlingScanRef.current) return;

      const ticketCode = normalizeTicketCode(rawCode);
      if (!ticketCode) return;

      const now = Date.now();
      const lastScan = lastScanRef.current;
      if (lastScan && lastScan.code === ticketCode && now - lastScan.at < 1500) {
        return;
      }
      lastScanRef.current = { code: ticketCode, at: now };

      isHandlingScanRef.current = true;
      setPendingOverrideCode(null);

      try {
        const scannedAt = new Date().toISOString();
        const ticket = await getTicketFromSnapshot(selectedEventId, ticketCode);

        if (!ticket) {
          const invalidFeedback: CheckinScanFeedback = {
            status: "invalid",
            ticketCode,
            scannedAt,
            message: "Tiket tidak ditemukan di database lokal.",
          };
          addHistory(invalidFeedback);
          setFeedback(invalidFeedback);
          handlePlayFeedbackTone("invalid");
          setPendingOverrideCode(ticketCode);
          return;
        }

        if (ticket.status === "used") {
          const usedFeedback: CheckinScanFeedback = {
            status: "already_used",
            ticketCode,
            scannedAt,
            message: "Tiket sudah check-in.",
          };
          addHistory(usedFeedback);
          setFeedback(usedFeedback);
          handlePlayFeedbackTone("already_used");
          return;
        }

        await markTicketUsedLocally(selectedEventId, ticketCode, scannedAt);

        const queueItem = createOfflineQueueItem({
          eventId: selectedEventId,
          ticketCode,
          action: "mark_used",
          note: null,
          deviceId: getOrCreateDeviceId(),
        });

        await enqueueOfflineItem({
          ...queueItem,
          scannedAt,
        });

        const baseFeedback: CheckinScanFeedback = {
          status: isOnline ? "success" : "queued",
          ticketCode,
          scannedAt,
          message: isOnline
            ? "Check-in berhasil. Data sedang diverifikasi server."
            : "Offline: check-in disimpan ke antrean sinkronisasi.",
        };

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(80);
        }

        if (isOnline) {
          await syncPendingQueue();
          await resolveQueueFeedback(queueItem.id, baseFeedback);
        } else {
          addHistory(baseFeedback);
          setFeedback(baseFeedback);
        }

        handlePlayFeedbackTone(baseFeedback.status);
      } finally {
        isHandlingScanRef.current = false;
        await refreshQueue();
      }
    },
    [
      addHistory,
      handlePlayFeedbackTone,
      isOnline,
      refreshQueue,
      resolveQueueFeedback,
      selectedEventId,
      syncPendingQueue,
    ],
  );

  const handleManualOverride = useCallback(async () => {
    if (!selectedEventId || !pendingOverrideCode) return;

    const scannedAt = new Date().toISOString();
    const queueItem = createOfflineQueueItem({
      eventId: selectedEventId,
      ticketCode: pendingOverrideCode,
      action: "override_manual",
      note: "Override manual oleh petugas (offline).",
      deviceId: getOrCreateDeviceId(),
    });

    await enqueueOfflineItem({
      ...queueItem,
      scannedAt,
    });

    const overrideFeedback: CheckinScanFeedback = {
      status: "override_queued",
      ticketCode: pendingOverrideCode,
      scannedAt,
      message: "Override manual tersimpan. Akan disinkronkan saat online.",
    };

    if (isOnline) {
      await syncPendingQueue();
      await resolveQueueFeedback(queueItem.id, overrideFeedback);
    } else {
      addHistory(overrideFeedback);
      setFeedback(overrideFeedback);
    }
    handlePlayFeedbackTone("override_queued");

    setPendingOverrideCode(null);
    await refreshQueue();
  }, [
    addHistory,
    isOnline,
    pendingOverrideCode,
    refreshQueue,
    resolveQueueFeedback,
    selectedEventId,
    syncPendingQueue,
    handlePlayFeedbackTone,
  ]);

  useEffect(() => {
    loadSnapshotForSelectedEvent();
    refreshQueue();
    hasAutoStartedRef.current = false;
  }, [loadSnapshotForSelectedEvent, refreshQueue]);

  useEffect(() => {
    if (!selectedEventId) return;
    if (!isAutoStartEnabled) return;
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    setIsScannerActive(true);
  }, [isAutoStartEnabled, selectedEventId]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncPendingQueue();
      await loadSnapshotMetaOnly();
      await refreshQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadSnapshotMetaOnly, refreshQueue, syncPendingQueue]);

  useEffect(() => {
    if (!isScannerActive) {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const bootScanner = async () => {
      if (!videoRef.current) return;

      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
            },
          },
          videoRef.current,
          (result) => {
            if (cancelled || !result) return;
            void handleTicketScan(result.getText());
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls as ZXingControls;
      } catch (error) {
        setFeedback({
          status: "invalid",
          ticketCode: "-",
          message:
            error instanceof Error
              ? error.message
              : "Kamera tidak tersedia pada perangkat ini.",
          scannedAt: new Date().toISOString(),
        });
        setIsScannerActive(false);
      }
    };

    void bootScanner();

    return () => {
      cancelled = true;
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [handleTicketScan, isScannerActive]);

  const pendingCount = useMemo(
    () => queueItems.filter((item) => item.status === "pending").length,
    [queueItems],
  );

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300">
        Tidak ada event tersedia untuk check-in.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-2 z-20 grid gap-3 rounded-xl border border-white/10 bg-gray-950/90 p-4 backdrop-blur sm:grid-cols-3">
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-wide text-gray-400">
            Event
          </span>
          <select
            value={selectedEventId ?? ""}
            onChange={(event) => setSelectedEventId(Number(event.target.value))}
            disabled={isScannerActive}
            className="w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/60 focus:outline-none"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Status koneksi
          </p>
          <p className={isOnline ? "text-sm text-green-300" : "text-sm text-red-300"}>
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">Snapshot</p>
          <p className="text-sm text-gray-200">
            {snapshotMeta
              ? `${snapshotMeta.count} tiket • ${new Date(snapshotMeta.snapshotAt).toLocaleTimeString("id-ID")}`
              : "Belum tersedia"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setIsScannerActive((prev) => !prev)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            isScannerActive
              ? "bg-red-500 text-white hover:bg-red-500/90"
              : "bg-sun6bks-gold text-sun6bks-dark hover:bg-sun6bks-gold/90"
          }`}
        >
          {isScannerActive ? "Stop Scanner" : "Start Scanner"}
        </button>

        <button
          type="button"
          onClick={() => void loadSnapshotForSelectedEvent()}
          disabled={isLoadingSnapshot}
          className="rounded-lg border border-white/10 bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoadingSnapshot ? "Memuat..." : "Refresh Snapshot"}
        </button>

        <button
          type="button"
          onClick={() => void syncPendingQueue().then(refreshQueue)}
          disabled={!isOnline || isSyncing}
          className="rounded-lg border border-blue-400/40 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSyncing ? "Sinkronisasi..." : `Sinkronisasi (${pendingCount})`}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setIsGateMode((prev) => !prev)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            isGateMode
              ? "bg-emerald-500/20 text-emerald-100"
              : "border border-white/10 bg-gray-900 text-gray-300"
          }`}
        >
          {isGateMode ? "Gate Mode Aktif" : "Gate Mode Nonaktif"}
        </button>
        <button
          type="button"
          onClick={() => setIsAutoStartEnabled((prev) => !prev)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            isAutoStartEnabled
              ? "bg-indigo-500/20 text-indigo-100"
              : "border border-white/10 bg-gray-900 text-gray-300"
          }`}
        >
          Auto Start: {isAutoStartEnabled ? "ON" : "OFF"}
        </button>
        <button
          type="button"
          onClick={() => void document.documentElement.requestFullscreen?.()}
          className="rounded-lg border border-white/10 bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Full Screen
        </button>
      </div>

      {isGateMode && (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <span className="rounded-full bg-black/30 px-2 py-1 text-emerald-100">
              Gate Mode
            </span>
            <span className="rounded-full bg-black/30 px-2 py-1 text-gray-100">
              {selectedEvent?.title ?? "Event"}
            </span>
            <span
              className={`rounded-full px-2 py-1 ${
                isOnline ? "bg-green-500/20 text-green-100" : "bg-red-500/20 text-red-100"
              }`}
            >
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
            <span className="rounded-full bg-blue-500/20 px-2 py-1 text-blue-100">
              Queue: {pendingCount}
            </span>
          </div>
          <p className="mt-2 text-sm text-emerald-100">
            Mode ini mengunci pemilihan event saat scanner aktif agar petugas fokus scan tanpa bolak-balik menu.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="aspect-video w-full bg-gray-900 object-cover"
        />
      </div>

      {feedback && (
        <div className={`rounded-xl border p-4 ${FEEDBACK_STYLE[feedback.status].wrapper}`}>
          <p className="text-sm font-semibold">{FEEDBACK_STYLE[feedback.status].title}</p>
          <p className="mt-1 font-mono text-xs">{feedback.ticketCode}</p>
          <p className="mt-2 text-sm">{feedback.message}</p>
        </div>
      )}

      {pendingOverrideCode && (
        <div className="rounded-xl border border-purple-400/40 bg-purple-500/10 p-4">
          <p className="text-sm text-purple-100">
            Tiket tidak ada di snapshot lokal. Jika petugas tetap mengizinkan masuk,
            gunakan override manual.
          </p>
          <button
            type="button"
            onClick={() => void handleManualOverride()}
            className="mt-3 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500/90"
          >
            Override Manual
          </button>
        </div>
      )}

      {!isGateMode && <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-white">Riwayat Scan (Lokal)</h3>
          <div className="mt-3 space-y-2">
            {history.length === 0 && (
              <p className="text-sm text-gray-500">Belum ada aktivitas scan.</p>
            )}
            {history.map((item) => (
              <div
                key={`${item.ticketCode}-${item.scannedAt}-${item.status}`}
                className="rounded-lg border border-white/10 bg-black/40 p-3"
              >
                <p className="font-mono text-xs text-gray-200">{item.ticketCode}</p>
                <p className="mt-1 text-xs text-gray-400">{item.message}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-white">Status Antrean Sinkronisasi</h3>
          <div className="mt-3 space-y-2">
            {queueItems.length === 0 && (
              <p className="text-sm text-gray-500">Belum ada item antrean.</p>
            )}
            {queueItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-white/10 bg-black/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-gray-200">{item.ticketCode}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                      item.status === "synced"
                        ? "bg-green-500/20 text-green-200"
                        : item.status === "synced_duplicate"
                          ? "bg-yellow-500/20 text-yellow-100"
                          : item.status === "pending"
                            ? "bg-blue-500/20 text-blue-100"
                            : "bg-red-500/20 text-red-100"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(item.scannedAt).toLocaleString("id-ID")}
                </p>
                {item.lastError && (
                  <p className="mt-1 text-xs text-red-200">{item.lastError}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>}

      {isGateMode && (
        <button
          type="button"
          onClick={() => setShowDetailsPanel((prev) => !prev)}
          className="w-full rounded-lg border border-white/10 bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          {showDetailsPanel ? "Sembunyikan Detail Operasional" : "Tampilkan Detail Operasional"}
        </button>
      )}

      {isGateMode && showDetailsPanel && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white">Riwayat Scan (Lokal)</h3>
            <div className="mt-3 space-y-2">
              {history.length === 0 && (
                <p className="text-sm text-gray-500">Belum ada aktivitas scan.</p>
              )}
              {history.map((item) => (
                <div
                  key={`${item.ticketCode}-${item.scannedAt}-${item.status}`}
                  className="rounded-lg border border-white/10 bg-black/40 p-3"
                >
                  <p className="font-mono text-xs text-gray-200">{item.ticketCode}</p>
                  <p className="mt-1 text-xs text-gray-400">{item.message}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white">Status Antrean Sinkronisasi</h3>
            <div className="mt-3 space-y-2">
              {queueItems.length === 0 && (
                <p className="text-sm text-gray-500">Belum ada item antrean.</p>
              )}
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-black/40 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-gray-200">{item.ticketCode}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                        item.status === "synced"
                          ? "bg-green-500/20 text-green-200"
                          : item.status === "synced_duplicate"
                            ? "bg-yellow-500/20 text-yellow-100"
                            : item.status === "pending"
                              ? "bg-blue-500/20 text-blue-100"
                              : "bg-red-500/20 text-red-100"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(item.scannedAt).toLocaleString("id-ID")}
                  </p>
                  {item.lastError && (
                    <p className="mt-1 text-xs text-red-200">{item.lastError}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
