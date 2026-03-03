import { NextResponse } from "next/server";
import { processTicketCheckin } from "@/actions/admin-tickets";
import { checkinSingleSchema } from "@/lib/validation/schemas";

const getAuthErrorStatus = (error: unknown): number => {
  const message = error instanceof Error ? error.message : "";
  if (message === "Not authenticated") return 401;
  if (message.includes("Forbidden")) return 403;
  return 500;
};

export const POST = async (request: Request) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Payload JSON tidak valid." },
        { status: 400 },
      );
    }

    // Input validation (zod)
    const parseResult = checkinSingleSchema.safeParse(body);
    if (!parseResult.success) {
      const msg =
        parseResult.error.flatten().formErrors[0] ??
        parseResult.error.issues[0]?.message ??
        "Input tidak valid.";
      return NextResponse.json(
        { success: false, message: msg },
        { status: 400 },
      );
    }
    const validated = parseResult.data;
    const ticketCode = validated.ticketCode.trim().toUpperCase();
    const deviceId = validated.deviceId?.trim() ?? "unknown-device";

    const result = await processTicketCheckin({
      eventId: validated.eventId,
      ticketCode,
      action: "mark_used",
      scannedAt: new Date().toISOString(),
      note: validated.note ?? null,
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
    const status = getAuthErrorStatus(error);
    console.error("[api/admin/tickets/checkin] Request failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status },
    );
  }
};
