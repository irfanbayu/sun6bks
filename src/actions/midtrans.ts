"use server";

import type {
  CreateTransactionParams,
  SnapTokenResponse,
} from "@/types/midtrans";
import {
  createSnapTransaction,
  generateOrderId,
  formatJakartaTime,
} from "@/lib/midtrans/server";
import { createOrderStatusToken } from "@/lib/security/order-status-token";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { createOrderSchema } from "@/lib/validation/schemas";

/**
 * Creates a transaction record in DB + Midtrans Snap token.
 * Does NOT activate tickets — that's the webhook's job.
 */
export const createOrderAndSnapToken = async (
  params: CreateTransactionParams,
): Promise<SnapTokenResponse> => {
  try {
    // Enforce login server-side
    const clerkUserId = await requireAuth();

    // Input validation (zod schema)
    const parseResult = createOrderSchema.safeParse({
      eventId: params.eventId,
      categoryId: params.categoryId,
      eventTitle: params.eventTitle,
      quantity: params.quantity,
      pricePerTicket: params.pricePerTicket,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
    });
    if (!parseResult.success) {
      const firstError = parseResult.error.flatten().fieldErrors;
      const msg =
        Object.values(firstError).flat().join(", ") || "Input tidak valid.";
      return { success: false, error: msg };
    }
    const validated = parseResult.data;

    // 1. Validate event + category + stock (parallel fetch)
    const [eventResult, categoryResult] = await Promise.all([
      supabaseAdmin
        .from("events")
        .select("id, title, is_published")
        .eq("id", validated.eventId)
        .single(),
      supabaseAdmin
        .from("ticket_categories")
        .select("id, name, price, is_active, event_id")
        .eq("id", validated.categoryId)
        .single(),
    ]);

    if (eventResult.error || !eventResult.data) {
      return { success: false, error: "Event tidak ditemukan." };
    }
    if (!eventResult.data.is_published) {
      return { success: false, error: "Event belum dipublikasi." };
    }
    if (categoryResult.error || !categoryResult.data) {
      return { success: false, error: "Kategori tiket tidak ditemukan." };
    }
    if (!categoryResult.data.is_active) {
      return { success: false, error: "Kategori tiket tidak aktif." };
    }
    if (categoryResult.data.event_id !== validated.eventId) {
      return { success: false, error: "Kategori tiket tidak sesuai event." };
    }

    // 2. Check stock
    const { data: stock, error: stockError } = await supabaseAdmin
      .from("ticket_stocks")
      .select("remaining_stock")
      .eq("category_id", validated.categoryId)
      .single();

    if (stockError || !stock) {
      return { success: false, error: "Data stok tidak ditemukan." };
    }

    if (stock.remaining_stock < validated.quantity) {
      return {
        success: false,
        error: `Stok tidak cukup. Tersisa ${stock.remaining_stock} tiket.`,
      };
    }

    // 3. Generate order ID & calculate amount
    const orderId = generateOrderId(validated.eventId);
    const grossAmount = validated.quantity * categoryResult.data.price;
    const statusToken = createOrderStatusToken(orderId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentFinishUrl = `${appUrl}/payment/${orderId}?exp=${statusToken.expiresAt}&sig=${encodeURIComponent(statusToken.signature)}`;

    // 4. Create Midtrans Snap transaction (native fetch, proper Base64 auth)
    const transactionParams = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: `TICKET-${validated.eventId}-${validated.categoryId}`,
          price: categoryResult.data.price,
          quantity: validated.quantity,
          name: `${eventResult.data.title} - ${categoryResult.data.name}`.substring(
            0,
            50,
          ),
          category: "Tiket Event",
        },
      ],
      customer_details: {
        first_name: validated.customerName,
        email: validated.customerEmail,
        phone: validated.customerPhone,
      },
      callbacks: {
        finish: paymentFinishUrl,
      },
      expiry: {
        start_time: formatJakartaTime(),
        unit: "hours",
        duration: 24,
      },
    };

    const midtransResult = await createSnapTransaction(transactionParams);

    // 5. Insert transaction row (status=pending, no stock decrement yet)
    const { error: insertError } = await supabaseAdmin
      .from("transactions")
      .insert({
        midtrans_order_id: orderId,
        event_id: validated.eventId,
        category_id: validated.categoryId,
        quantity: validated.quantity,
        amount: grossAmount,
        status: "pending",
        snap_token: midtransResult.token,
        snap_redirect_url: midtransResult.redirect_url,
        customer_name: validated.customerName,
        customer_email: validated.customerEmail,
        customer_phone: validated.customerPhone,
        clerk_user_id: clerkUserId,
      });

    if (insertError) {
      console.error("[createOrderAndSnapToken] DB insert error:", insertError);
      return { success: false, error: "Gagal menyimpan transaksi." };
    }

    return {
      success: true,
      token: midtransResult.token,
      redirectUrl: midtransResult.redirect_url,
      orderId,
      statusAccessSignature: statusToken.signature,
      statusAccessExpiresAt: statusToken.expiresAt,
    };
  } catch (error: unknown) {
    console.error("[createOrderAndSnapToken] Error:", error);

    // Handle Midtrans API errors (from our createSnapTransaction)
    const errorObj = error as Record<string, unknown>;
    const statusCode = errorObj?.statusCode;

    if (statusCode === 401) {
      return {
        success: false,
        error: "Autentikasi Midtrans gagal. Hubungi admin.",
      };
    }

    if (errorObj?.midtransResponse) {
      const response = errorObj.midtransResponse as Record<string, unknown>;
      const errorMessages = (response.error_messages as string[]) || [];
      if (errorMessages.length > 0) {
        return { success: false, error: errorMessages.join(", ") };
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error: errorMessage || "Gagal membuat transaksi. Coba lagi.",
    };
  }
};
