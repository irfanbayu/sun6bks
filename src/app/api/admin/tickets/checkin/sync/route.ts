import { NextResponse } from "next/server";
import { processTicketCheckin } from "@/actions/admin-tickets";
import { checkinSyncSchema } from "@/lib/validation/schemas";

type SyncResult = {
  id: string;
  status: "synced" | "synced_duplicate" | "failed_invalid" | "failed_error";
  message: string;
};

const getAuthErrorStatus = (error: unknown): number => {
  const message = error instanceof Error ? error.message : "";
  if (message === "Not authenticated") return 401;
  if (message.includes("Forbidden")) return 403;
  return 500;
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Payload JSON tidak valid.", results: [] },
        { status: 400 },
      );
    }

    // Input validation (zod)
    const parseResult = checkinSyncSchema.safeParse(body);
    if (!parseResult.success) {
      const msg =
        parseResult.error.flatten().formErrors[0] ??
        parseResult.error.issues[0]?.message ??
        "Input tidak valid.";
      return NextResponse.json(
        { success: false, message: msg, results: [] },
        { status: 400 },
      );
    }
    const { eventId, items } = parseResult.data;

    const results: SyncResult[] = [];

    for (const item of items) {
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
        console.error(
          "[api/admin/tickets/checkin/sync] Item sync failed:",
          error,
        );
        results.push({
          id: item.id,
          status: "failed_error",
          message: "Internal server error",
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
    const status = getAuthErrorStatus(error);
    console.error("[api/admin/tickets/checkin/sync] Request failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        results: [],
      },
      { status },
    );
  }
};
