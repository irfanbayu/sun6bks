"use server";

import type { CreateTransactionParams, SnapTokenResponse } from "@/types/midtrans";
import { getSnap, generateOrderId } from "@/lib/midtrans/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Creates a transaction record in DB + Midtrans Snap token.
 * Does NOT activate tickets — that's the webhook's job.
 */
export const createOrderAndSnapToken = async (
  params: CreateTransactionParams
): Promise<SnapTokenResponse> => {
  try {
    const snap = getSnap();

    // 1. Validate event + category + stock (parallel fetch)
    const [eventResult, categoryResult] = await Promise.all([
      supabaseAdmin
        .from("events")
        .select("id, title, is_published")
        .eq("id", params.eventId)
        .single(),
      supabaseAdmin
        .from("ticket_categories")
        .select("id, name, price, is_active, event_id")
        .eq("id", params.categoryId)
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
    if (categoryResult.data.event_id !== params.eventId) {
      return { success: false, error: "Kategori tiket tidak sesuai event." };
    }

    // 2. Check stock
    const { data: stock, error: stockError } = await supabaseAdmin
      .from("ticket_stocks")
      .select("remaining_stock")
      .eq("category_id", params.categoryId)
      .single();

    if (stockError || !stock) {
      return { success: false, error: "Data stok tidak ditemukan." };
    }

    if (stock.remaining_stock < params.quantity) {
      return {
        success: false,
        error: `Stok tidak cukup. Tersisa ${stock.remaining_stock} tiket.`,
      };
    }

    // 3. Generate order ID & calculate amount
    const orderId = generateOrderId(params.eventId);
    const grossAmount = params.quantity * categoryResult.data.price;

    // 4. Create Midtrans transaction
    const transactionParams = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: `TICKET-${params.eventId}-${params.categoryId}`,
          price: categoryResult.data.price,
          quantity: params.quantity,
          name: `${eventResult.data.title} - ${categoryResult.data.name}`.substring(0, 50),
          category: "Tiket Event",
        },
      ],
      customer_details: {
        first_name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone,
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/${orderId}`,
      },
      expiry: {
        start_time: new Date()
          .toISOString()
          .replace("T", " ")
          .substring(0, 19)
          .concat(" +0700"),
        unit: "hours",
        duration: 24,
      },
    };

    const midtransResult = await snap.createTransaction(transactionParams);

    // 5. Insert transaction row (status=pending, no stock decrement yet)
    const { error: insertError } = await supabaseAdmin
      .from("transactions")
      .insert({
        midtrans_order_id: orderId,
        event_id: params.eventId,
        category_id: params.categoryId,
        quantity: params.quantity,
        amount: grossAmount,
        status: "pending",
        snap_token: midtransResult.token,
        snap_redirect_url: midtransResult.redirect_url,
        customer_name: params.customerName.trim(),
        customer_email: params.customerEmail.trim(),
        customer_phone: params.customerPhone.trim(),
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
    };
  } catch (error: unknown) {
    console.error("[createOrderAndSnapToken] Error:", error);

    if (error && typeof error === "object") {
      const errorObj = error as Record<string, unknown>;

      if ("ApiResponse" in errorObj) {
        const apiResponse = errorObj.ApiResponse as {
          status_code?: string;
          status_message?: string;
          error_messages?: string[];
        };

        if (apiResponse?.status_code === "401") {
          return {
            success: false,
            error: "Autentikasi Midtrans gagal. Hubungi admin.",
          };
        }

        const errorMessages =
          apiResponse?.error_messages ||
          (apiResponse?.status_message ? [apiResponse.status_message] : []);

        if (errorMessages.length > 0) {
          return { success: false, error: errorMessages.join(", ") };
        }
      }
    }

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error: errorMessage || "Gagal membuat transaksi. Coba lagi.",
    };
  }
};
