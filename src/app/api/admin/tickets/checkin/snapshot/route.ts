import { NextResponse } from "next/server";
import { getTicketSnapshotByEvent } from "@/actions/admin-tickets";

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
