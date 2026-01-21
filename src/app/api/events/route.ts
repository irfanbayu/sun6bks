import { NextResponse } from "next/server";
import { getPublishedEvents } from "@/db/queries";
import { toPublicEventData } from "@/db/types";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds

export async function GET() {
  try {
    const events = await getPublishedEvents();
    const publicEvents = events.map(toPublicEventData);

    return NextResponse.json({
      success: true,
      data: publicEvents,
      count: publicEvents.length,
    });
  } catch (error) {
    console.error("[Events API] Error:", error);

    // Return empty array instead of error for public API
    return NextResponse.json({
      success: true,
      data: [],
      count: 0,
      warning: "Could not fetch events from database",
    });
  }
}

