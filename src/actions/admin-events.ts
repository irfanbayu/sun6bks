"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { EventWithCategories, PerformerData } from "@/lib/supabase/types";

type ActionResult = {
  success: boolean;
  message: string;
};

type CategoryInput = {
  id?: number;
  name: string;
  price: number;
  description: string;
  features: string[];
  sort_order: number;
  is_active: boolean;
  total_stock: number;
  remaining_stock: number;
};

export type PerformerInput = PerformerData;

export type EventInput = {
  title: string;
  slug: string;
  description: string;
  date: string;
  time_label: string;
  venue: string;
  venue_address: string;
  venue_lat: number | null;
  venue_lng: number | null;
  venue_maps_url: string;
  performers: PerformerInput[];
  image_url: string;
  is_published: boolean;
  categories: CategoryInput[];
};

/**
 * Generate a URL-friendly slug from a title.
 */
const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

/**
 * Fetch all events with categories and stocks for admin listing.
 */
export const getAdminEvents = async (): Promise<EventWithCategories[]> => {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("events")
    .select(
      `*,
      ticket_categories (
        *,
        ticket_stocks (*)
      )`,
    )
    .order("date", { ascending: false });

  if (error) {
    console.error("[getAdminEvents] Error:", error);
    return [];
  }

  return (data as EventWithCategories[]) || [];
};

/**
 * Create a new event with ticket categories and stocks.
 */
export const createEvent = async (input: EventInput): Promise<ActionResult> => {
  await requireAdmin();

  try {
    const slug = (input.slug ?? "").trim() || generateSlug(input.title);

    // 1. Insert event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .insert({
        title: input.title.trim(),
        slug,
        description: (input.description ?? "").trim() || null,
        date: input.date,
        time_label: (input.time_label ?? "").trim(),
        venue: input.venue.trim(),
        venue_address: (input.venue_address ?? "").trim() || null,
        venue_lat: input.venue_lat,
        venue_lng: input.venue_lng,
        venue_maps_url: (input.venue_maps_url ?? "").trim() || null,
        performers: (input.performers ?? []).filter((p) => p.name.trim()),
        image_url: (input.image_url ?? "").trim() || null,
        is_published: input.is_published,
      })
      .select("id")
      .single();

    if (eventError || !event) {
      console.error("[createEvent] Event insert error:", eventError);
      return {
        success: false,
        message: eventError?.message || "Gagal membuat event.",
      };
    }

    // 2. Insert categories + stocks in parallel
    if (input.categories.length > 0) {
      const categoryRows = input.categories.map((c, i) => ({
        event_id: event.id,
        name: c.name.trim(),
        price: c.price,
        description: (c.description ?? "").trim() || null,
        features: (c.features ?? []).filter((f) => f.trim()),
        sort_order: c.sort_order ?? i,
        is_active: c.is_active,
      }));

      const { data: insertedCategories, error: catError } = await supabaseAdmin
        .from("ticket_categories")
        .insert(categoryRows)
        .select("id");

      if (catError || !insertedCategories) {
        console.error("[createEvent] Category insert error:", catError);
        return {
          success: false,
          message: catError?.message || "Gagal membuat kategori tiket.",
        };
      }

      // Insert stocks for each category
      const stockRows = insertedCategories.map((cat, i) => ({
        category_id: cat.id,
        total_stock: input.categories[i].total_stock,
        remaining_stock: input.categories[i].remaining_stock,
      }));

      const { error: stockError } = await supabaseAdmin
        .from("ticket_stocks")
        .insert(stockRows);

      if (stockError) {
        console.error("[createEvent] Stock insert error:", stockError);
        return {
          success: false,
          message: stockError.message || "Gagal membuat stok tiket.",
        };
      }
    }

    return {
      success: true,
      message: `Event "${input.title}" berhasil dibuat.`,
    };
  } catch (error) {
    console.error("[createEvent] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal membuat event.",
    };
  }
};

/**
 * Update an existing event, its categories, and stocks.
 * Handles create/update/delete of categories atomically.
 */
export const updateEvent = async (
  eventId: number,
  input: EventInput,
): Promise<ActionResult> => {
  await requireAdmin();

  try {
    const slug = (input.slug ?? "").trim() || generateSlug(input.title);

    // 1. Update event
    const { error: eventError } = await supabaseAdmin
      .from("events")
      .update({
        title: input.title.trim(),
        slug,
        description: (input.description ?? "").trim() || null,
        date: input.date,
        time_label: (input.time_label ?? "").trim(),
        venue: input.venue.trim(),
        venue_address: (input.venue_address ?? "").trim() || null,
        venue_lat: input.venue_lat,
        venue_lng: input.venue_lng,
        venue_maps_url: (input.venue_maps_url ?? "").trim() || null,
        performers: (input.performers ?? []).filter((p) => p.name.trim()),
        image_url: (input.image_url ?? "").trim() || null,
        is_published: input.is_published,
      })
      .eq("id", eventId);

    if (eventError) {
      console.error("[updateEvent] Event update error:", eventError);
      return {
        success: false,
        message: eventError.message || "Gagal memperbarui event.",
      };
    }

    // 2. Fetch existing categories for this event
    const { data: existingCategories } = await supabaseAdmin
      .from("ticket_categories")
      .select("id")
      .eq("event_id", eventId);

    const existingCatIds = new Set((existingCategories || []).map((c) => c.id));
    const inputCatIds = new Set(
      input.categories.filter((c) => c.id).map((c) => c.id as number),
    );

    // 3. Delete removed categories (CASCADE will delete stocks too)
    const toDelete = [...existingCatIds].filter((id) => !inputCatIds.has(id));
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("ticket_categories")
        .delete()
        .in("id", toDelete);

      if (deleteError) {
        console.error("[updateEvent] Category delete error:", deleteError);
      }
    }

    // 4. Upsert categories (update existing, insert new)
    for (let i = 0; i < input.categories.length; i++) {
      const cat = input.categories[i];

      if (cat.id && existingCatIds.has(cat.id)) {
        // Update existing category
        const { error: catUpdateError } = await supabaseAdmin
          .from("ticket_categories")
          .update({
            name: cat.name.trim(),
            price: cat.price,
            description: (cat.description ?? "").trim() || null,
            features: (cat.features ?? []).filter((f) => f.trim()),
            sort_order: cat.sort_order ?? i,
            is_active: cat.is_active,
          })
          .eq("id", cat.id);

        if (catUpdateError) {
          console.error("[updateEvent] Category update error:", catUpdateError);
        }

        // Update stock
        const { error: stockUpdateError } = await supabaseAdmin
          .from("ticket_stocks")
          .update({
            total_stock: cat.total_stock,
            remaining_stock: cat.remaining_stock,
          })
          .eq("category_id", cat.id);

        if (stockUpdateError) {
          console.error("[updateEvent] Stock update error:", stockUpdateError);
        }
      } else {
        // Insert new category
        const { data: newCat, error: catInsertError } = await supabaseAdmin
          .from("ticket_categories")
          .insert({
            event_id: eventId,
            name: cat.name.trim(),
            price: cat.price,
            description: (cat.description ?? "").trim() || null,
            features: (cat.features ?? []).filter((f) => f.trim()),
            sort_order: cat.sort_order ?? i,
            is_active: cat.is_active,
          })
          .select("id")
          .single();

        if (catInsertError || !newCat) {
          console.error("[updateEvent] Category insert error:", catInsertError);
          continue;
        }

        // Insert stock for new category
        await supabaseAdmin.from("ticket_stocks").insert({
          category_id: newCat.id,
          total_stock: cat.total_stock,
          remaining_stock: cat.remaining_stock,
        });
      }
    }

    return {
      success: true,
      message: `Event "${input.title}" berhasil diperbarui.`,
    };
  } catch (error) {
    console.error("[updateEvent] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal memperbarui event.",
    };
  }
};

/**
 * Delete an event. CASCADE will remove categories, stocks, etc.
 */
export const deleteEvent = async (eventId: number): Promise<ActionResult> => {
  await requireAdmin();

  try {
    // Check if event has paid transactions
    const { count } = await supabaseAdmin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "paid");

    if (count && count > 0) {
      return {
        success: false,
        message: `Event memiliki ${count} transaksi paid. Tidak bisa dihapus.`,
      };
    }

    const { error } = await supabaseAdmin
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error("[deleteEvent] Error:", error);
      return {
        success: false,
        message: error.message || "Gagal menghapus event.",
      };
    }

    return { success: true, message: "Event berhasil dihapus." };
  } catch (error) {
    console.error("[deleteEvent] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal menghapus event.",
    };
  }
};

/**
 * Toggle event published status.
 */
export const toggleEventPublished = async (
  eventId: number,
  isPublished: boolean,
): Promise<ActionResult> => {
  await requireAdmin();

  try {
    const { error } = await supabaseAdmin
      .from("events")
      .update({ is_published: isPublished })
      .eq("id", eventId);

    if (error) {
      console.error("[toggleEventPublished] Error:", error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: isPublished ? "Event dipublish." : "Event di-unpublish.",
    };
  } catch (error) {
    console.error("[toggleEventPublished] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal mengubah status.",
    };
  }
};
