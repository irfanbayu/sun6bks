import { NextResponse } from "next/server";
import { processTicketCheckin } from "@/actions/admin-tickets";

type CheckinRequestBody = {
  eventId?: number;
  ticketCode?: string;
  note?: string | null;
  deviceId?: string;
};

export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as CheckinRequestBody;
    const eventId = Number(body.eventId);
    const ticketCode = (body.ticketCode ?? "").trim().toUpperCase();
    const deviceId = (body.deviceId ?? "unknown-device").trim();

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json(
        { success: false, message: "Event ID tidak valid." },
        { status: 400 },
      );
    }

    if (!ticketCode) {
      return NextResponse.json(
        { success: false, message: "Kode tiket wajib diisi." },
        { status: 400 },
      );
    }

    const result = await processTicketCheckin({
      eventId,
      ticketCode,
      action: "mark_used",
      scannedAt: new Date().toISOString(),
      note: body.note ?? null,
      deviceId,
    });

    if (result.code === "invalid") {
      return NextResponse.json(result, { status: 404 });
    }

    if (result.code === "already_used") {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
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
      },
      { status },
    );
  }
};
