import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

export async function GET(
  _request: Request,
  { params }: { params: { orderId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = params;

  const { data: order, error } = await supabaseAdmin
    .from("transactions")
    .select(
      `*,
      events:event_id ( title, date, time_label, venue, venue_address ),
      ticket_categories:category_id ( name, price ),
      tickets ( id, ticket_code, status )`
    )
    .eq("midtrans_order_id", orderId)
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      { error: "Invoice only available for paid orders" },
      { status: 400 }
    );
  }

  const pdfBuffer = generateInvoicePdf({
    orderId,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    paidAt: order.paid_at,
    amount: order.amount,
    quantity: order.quantity,
    event: order.events
      ? {
          title: order.events.title,
          date: order.events.date,
          timeLabel: order.events.time_label,
          venue: order.events.venue,
        }
      : null,
    category: order.ticket_categories
      ? {
          name: order.ticket_categories.name,
          price: order.ticket_categories.price,
        }
      : null,
    tickets: order.tickets ?? [],
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${orderId}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
