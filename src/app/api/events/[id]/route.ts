import { NextRequest, NextResponse } from "next/server";
import { getEventById } from "@/db/queries";
import { toPublicEventData } from "@/db/types";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Event ID is required" },
        { status: 400 }
      );
    }

    const event = await getEventById(id);

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if event is published
    if (event.status !== "published") {
      return NextResponse.json(
        { success: false, error: "Event not available" },
        { status: 404 }
      );
    }

    const publicEvent = toPublicEventData(event);

    return NextResponse.json({
      success: true,
      data: publicEvent,
    });
  } catch (error) {
    console.error("[Event API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

