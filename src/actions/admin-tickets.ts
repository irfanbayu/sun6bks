"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

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
