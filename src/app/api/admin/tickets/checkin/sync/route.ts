import { NextResponse } from "next/server";
import { processTicketCheckin } from "@/actions/admin-tickets";
import type { CheckinSyncPayload } from "@/lib/checkin/types";

type SyncResult = {
  id: string;
  status: "synced" | "synced_duplicate" | "failed_invalid" | "failed_error";
  message: string;
};

const mapResultStatus = (
  code: "checked_in" | "already_used" | "invalid" | "override_recorded",
): SyncResult["status"] => {
  if (code === "checked_in" || code === "override_recorded") {
    return "synced";
  }
  if (code === "already_used") {
    return "synced_duplicate";
  }
  return "failed_invalid";
};

export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as CheckinSyncPayload;
    const eventId = Number(body.eventId);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json(
        { success: false, message: "Event ID tidak valid.", results: [] },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data sinkronisasi.", results: [] },
        { status: 400 },
      );
    }

    const results: SyncResult[] = [];

    for (const item of items) {
      if (!item.id || !item.ticketCode || !item.action) {
        results.push({
          id: item.id ?? "unknown",
          status: "failed_invalid",
          message: "Payload item tidak lengkap.",
        });
        continue;
      }

      try {
        const result = await processTicketCheckin({
          eventId,
          ticketCode: item.ticketCode,
          action: item.action,
          scannedAt: item.scannedAt,
          note: item.note,
          deviceId: item.deviceId,
        });

        results.push({
          id: item.id,
          status: mapResultStatus(result.code),
          message: result.message,
        });
      } catch (error) {
        results.push({
          id: item.id,
          status: "failed_error",
          message:
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat sinkronisasi item.",
        });
      }
    }

    const hasSuccess = results.some(
      (item) => item.status === "synced" || item.status === "synced_duplicate",
    );

    return NextResponse.json({
      success: hasSuccess,
      message: hasSuccess
        ? "Sinkronisasi antrean selesai."
        : "Sinkronisasi gagal.",
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server.";
    const status =
      message === "Not authenticated"
        ? 401
        : message.includes("Forbidden")
          ? 403
          : 500;

    return NextResponse.json(
      {
        success: false,
        message,
        results: [],
      },
      { status },
    );
  }
};
