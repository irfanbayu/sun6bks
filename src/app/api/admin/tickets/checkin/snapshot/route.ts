import { NextResponse } from "next/server";
import { getTicketSnapshotByEvent } from "@/actions/admin-tickets";

const getAuthErrorStatus = (error: unknown): number => {
  const message = error instanceof Error ? error.message : "";
  if (message === "Not authenticated") return 401;
  if (message.includes("Forbidden")) return 403;
  return 500;
};

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = Number(searchParams.get("eventId"));

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json(
        { success: false, message: "Event ID tidak valid." },
        { status: 400 },
      );
    }

    const result = await getTicketSnapshotByEvent(eventId);

    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const status = getAuthErrorStatus(error);
    console.error("[api/admin/tickets/checkin/snapshot] Request failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status },
    );
  }
};
