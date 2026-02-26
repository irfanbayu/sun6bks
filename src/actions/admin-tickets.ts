"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type {
  CheckinTicketSnapshot,
  EventCheckinOption,
  OfflineQueueAction,
} from "@/lib/checkin/types";

export type AdminTicket = {
  id: number;
  ticketCode: string;
  ticketStatus: string;
  categoryName: string;
  categoryPrice: number;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  orderId: string;
  createdAt: string;
};

export const getAdminTickets = async (): Promise<AdminTicket[]> => {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("tickets")
    .select(
      `
      id,
      ticket_code,
      status,
      created_at,
      transactions!inner (
        midtrans_order_id,
        customer_name,
        customer_email,
        ticket_categories:category_id (
          name,
          price
        ),
        events:event_id (
          title
        )
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[getAdminTickets] Error:", error);
    return [];
  }

  return (data || []).map((t) => {
    const tx = t.transactions as unknown as {
      midtrans_order_id: string;
      customer_name: string;
      customer_email: string;
      ticket_categories: { name: string; price: number } | null;
      events: { title: string } | null;
    };

    return {
      id: t.id as number,
      ticketCode: t.ticket_code as string,
      ticketStatus: t.status as string,
      categoryName: tx.ticket_categories?.name ?? "—",
      categoryPrice: tx.ticket_categories?.price ?? 0,
      eventTitle: tx.events?.title ?? "—",
      customerName: tx.customer_name ?? "—",
      customerEmail: tx.customer_email ?? "—",
      orderId: tx.midtrans_order_id ?? "—",
      createdAt: t.created_at as string,
    };
  });
};

export const getAdminCheckinEvents = async (): Promise<EventCheckinOption[]> => {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, title, date")
    .order("date", { ascending: false });

  if (error) {
    console.error("[getAdminCheckinEvents] Error:", error);
    return [];
  }

  return (data ?? []).map((event) => ({
    id: event.id as number,
    title: event.title as string,
    date: event.date as string,
  }));
};

export const getTicketSnapshotByEvent = async (
  eventId: number,
): Promise<{
  success: boolean;
  message: string;
  eventTitle?: string;
  tickets?: CheckinTicketSnapshot[];
}> => {
  await requireAdmin();

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return { success: false, message: "Event tidak ditemukan." };
  }

  const { data, error } = await supabaseAdmin
    .from("tickets")
    .select(
      `
      ticket_code,
      status,
      used_at,
      transaction_id,
      transactions!inner ( event_id )
    `,
    )
    .eq("transactions.event_id", eventId)
    .in("status", ["active", "used"]);

  if (error) {
    console.error("[getTicketSnapshotByEvent] Error:", error);
    return { success: false, message: "Gagal memuat snapshot tiket." };
  }

  return {
    success: true,
    message: "Snapshot tiket berhasil dimuat.",
    eventTitle: event.title as string,
    tickets: (data ?? []).map((ticket) => ({
      ticketCode: ticket.ticket_code as string,
      status: ticket.status as "active" | "used",
      usedAt: ticket.used_at as string | null,
      transactionId: ticket.transaction_id as number,
    })),
  };
};

type CheckinActionResult = {
  success: boolean;
  code: "checked_in" | "already_used" | "invalid" | "override_recorded";
  message: string;
  ticketCode: string;
  transactionId: number | null;
  usedAt: string | null;
};

export const processTicketCheckin = async (params: {
  eventId: number;
  ticketCode: string;
  action: OfflineQueueAction;
  scannedAt: string;
  note: string | null;
  deviceId: string;
}): Promise<CheckinActionResult> => {
  const admin = await requireAdmin();
  const ticketCode = params.ticketCode.trim().toUpperCase();
  const scannedAt = params.scannedAt || new Date().toISOString();

  if (!ticketCode) {
    return {
      success: false,
      code: "invalid",
      message: "Kode tiket tidak valid.",
      ticketCode: "",
      transactionId: null,
      usedAt: null,
    };
  }

  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("tickets")
    .select(
      `
      id,
      ticket_code,
      status,
      used_at,
      transaction_id,
      transactions!inner ( event_id )
    `,
    )
    .eq("ticket_code", ticketCode)
    .eq("transactions.event_id", params.eventId)
    .maybeSingle();

  if (ticketError) {
    console.error("[processTicketCheckin] Lookup error:", ticketError);
    return {
      success: false,
      code: "invalid",
      message: "Gagal memvalidasi tiket.",
      ticketCode,
      transactionId: null,
      usedAt: null,
    };
  }

  if (!ticket) {
    if (params.action === "override_manual") {
      console.warn("[processTicketCheckin] Override tanpa tiket valid", {
        eventId: params.eventId,
        ticketCode,
        scannedAt,
        note: params.note,
        deviceId: params.deviceId,
        adminId: admin.userId,
      });
      return {
        success: true,
        code: "override_recorded",
        message: "Override manual diterima. Tiket tidak ditemukan di server.",
        ticketCode,
        transactionId: null,
        usedAt: null,
      };
    }

    return {
      success: false,
      code: "invalid",
      message: "Tiket tidak ditemukan untuk event ini.",
      ticketCode,
      transactionId: null,
      usedAt: null,
    };
  }

  if (ticket.status === "used") {
    return {
      success: false,
      code: "already_used",
      message: "Tiket sudah pernah check-in.",
      ticketCode,
      transactionId: ticket.transaction_id as number,
      usedAt: ticket.used_at as string | null,
    };
  }

  if (ticket.status !== "active") {
    return {
      success: false,
      code: "invalid",
      message: `Status tiket tidak valid: ${ticket.status}`,
      ticketCode,
      transactionId: ticket.transaction_id as number,
      usedAt: ticket.used_at as string | null,
    };
  }

  const { data: updatedTicket, error: updateError } = await supabaseAdmin
    .from("tickets")
    .update({
      status: "used",
      used_at: scannedAt,
    })
    .eq("id", ticket.id)
    .eq("status", "active")
    .select("status, used_at")
    .maybeSingle();

  if (updateError) {
    console.error("[processTicketCheckin] Update error:", updateError);
    return {
      success: false,
      code: "invalid",
      message: "Gagal mengubah status tiket.",
      ticketCode,
      transactionId: ticket.transaction_id as number,
      usedAt: null,
    };
  }

  if (!updatedTicket) {
    const { data: latestTicket } = await supabaseAdmin
      .from("tickets")
      .select("status, used_at")
      .eq("id", ticket.id)
      .maybeSingle();

    if (latestTicket?.status === "used") {
      return {
        success: false,
        code: "already_used",
        message: "Tiket sudah digunakan oleh perangkat lain.",
        ticketCode,
        transactionId: ticket.transaction_id as number,
        usedAt: latestTicket.used_at as string | null,
      };
    }

    return {
      success: false,
      code: "invalid",
      message: "Gagal melakukan check-in tiket.",
      ticketCode,
      transactionId: ticket.transaction_id as number,
      usedAt: null,
    };
  }

  await supabaseAdmin.from("audit_logs").insert({
    admin_id: admin.userId,
    admin_email: admin.email,
    transaction_id: ticket.transaction_id as number,
    action: params.action === "override_manual" ? "ticket_checkin_override" : "ticket_checkin",
    old_status: "active",
    new_status: "used",
    reason: params.note?.trim()
      ? params.note.trim()
      : params.action === "override_manual"
        ? "Override manual check-in"
        : "Scan check-in QR",
    metadata: {
      scanned_at: scannedAt,
      ticket_code: ticketCode,
      device_id: params.deviceId,
      action: params.action,
    },
  });

  return {
    success: true,
    code: "checked_in",
    message: "Check-in berhasil.",
    ticketCode,
    transactionId: ticket.transaction_id as number,
    usedAt: updatedTicket.used_at as string,
  };
};
