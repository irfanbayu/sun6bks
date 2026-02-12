"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { EventWithCategories } from "@/lib/supabase/types";
import type { LandingEvent } from "@/types";

const mapToLandingEvent = (ev: EventWithCategories): LandingEvent => {
  const activeCategories = (ev.ticket_categories ?? []).filter((c) => c.is_active);
  return {
    id: ev.id,
    title: ev.title,
    date: ev.date,
    time_label: ev.time_label,
    venue: ev.venue,
    performers: ev.performers ?? [],
    categories: activeCategories
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        id: c.id,
        name: c.name,
        price: c.price,
        description: c.description,
        features: c.features ?? [],
        sort_order: c.sort_order,
        spotsLeft: c.ticket_stocks?.remaining_stock ?? 0,
      })),
  };
};

/**
 * Fetch the single event for the public landing page.
 * Priority: SINGLE_EVENT_SLUG env → fallback to nearest published event.
 * Returns null when DB is not configured or no published event exists.
 */
export const getLandingEvent = async (): Promise<LandingEvent | null> => {
  try {
    const slug = process.env.SINGLE_EVENT_SLUG?.trim();

    if (slug) {
      const { data, error } = await supabaseAdmin
        .from("events")
        .select(
          `*,
          ticket_categories (
            *,
            ticket_stocks (*)
          )`
        )
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (!error && data) {
        return mapToLandingEvent(data as EventWithCategories);
      }
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .select(
        `*,
        ticket_categories (
          *,
          ticket_stocks (*)
        )`
      )
      .eq("is_published", true)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[getLandingEvent] Error:", error);
      return null;
    }

    return data ? mapToLandingEvent(data as EventWithCategories) : null;
  } catch (err) {
    console.warn("[getLandingEvent] Supabase unavailable:", err);
    return null;
  }
};

/**
 * Fetch all published events with their ticket categories and stock.
 * Used by admin and other multi-event flows.
 * Returns empty array gracefully when DB is not configured.
 */
export const getPublishedEvents = async (): Promise<EventWithCategories[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from("events")
      .select(
        `
        *,
        ticket_categories (
          *,
          ticket_stocks (*)
        )
      `
      )
      .eq("is_published", true)
      .order("date", { ascending: true });

    if (error) {
      console.error("[getPublishedEvents] Error:", error);
      return [];
    }

    return (data as EventWithCategories[]) || [];
  } catch (err) {
    // Supabase not configured — return empty so fallback static data is used
    console.warn("[getPublishedEvents] Supabase unavailable:", err);
    return [];
  }
};

/**
 * Fetch a single event by slug for detail page.
 */
export const getEventBySlug = async (
  slug: string
): Promise<EventWithCategories | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from("events")
      .select(
        `
        *,
        ticket_categories (
          *,
          ticket_stocks (*)
        )
      `
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error) {
      console.error("[getEventBySlug] Error:", error);
      return null;
    }

    return data as EventWithCategories;
  } catch (err) {
    console.warn("[getEventBySlug] Supabase unavailable:", err);
    return null;
  }
};
