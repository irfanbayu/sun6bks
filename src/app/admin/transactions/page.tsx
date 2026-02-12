import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminTransactionsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
  // Fetch transactions with joined event + category names
  const { data: transactions, error } = await supabaseAdmin
    .from("transactions")
    .select(
      `
      id,
      midtrans_order_id,
      status,
      amount,
      quantity,
      customer_name,
      customer_email,
      customer_phone,
      paid_at,
      expired_at,
      created_at,
      events ( title ),
      ticket_categories ( name )
    `
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[AdminTransactions] Error:", error);
  }

  // Flatten joins
  const formattedTransactions = (transactions || []).map((t) => ({
    id: t.id as number,
    orderId: t.midtrans_order_id as string,
    status: t.status as string,
    amount: t.amount as number,
    quantity: t.quantity as number,
    customerName: t.customer_name as string,
    customerEmail: t.customer_email as string,
    customerPhone: t.customer_phone as string,
    paidAt: t.paid_at as string | null,
    expiredAt: t.expired_at as string | null,
    createdAt: t.created_at as string,
    eventTitle:
      (t.events as unknown as { title: string } | null)?.title ?? "—",
    categoryName:
      (t.ticket_categories as unknown as { name: string } | null)?.name ?? "—",
  }));

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Daftar Transaksi</h2>
      <AdminTransactionsClient transactions={formattedTransactions} />
    </div>
  );
}
