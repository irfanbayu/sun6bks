"use server";

import type {
  CreateTransactionParams,
  SnapTokenResponse,
} from "@/types/midtrans";
import { MIDTRANS_CONFIG, generateOrderId } from "@/lib/midtrans";
import {
  findOrCreateCustomer,
  createTransaction,
  createTicketsForTransaction,
  getEventById,
  checkEventAvailability,
} from "@/db/queries";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const midtransClient = require("midtrans-client");

export const createSnapToken = async (
  params: CreateTransactionParams
): Promise<SnapTokenResponse> => {
  try {
    // Validate server key
    const serverKey = MIDTRANS_CONFIG.serverKey.trim();
    if (!serverKey) {
      console.error("Midtrans server key is not configured");
      return {
        success: false,
        error: "Payment gateway belum dikonfigurasi. Hubungi admin.",
      };
    }

    // Validate server key format
    const isSandbox = !MIDTRANS_CONFIG.isProduction;
    const isValidSandboxKey =
      isSandbox && serverKey.startsWith("SB-Mid-server-");
    const isValidProductionKey =
      !isSandbox && serverKey.startsWith("Mid-server-");

    if (!isValidSandboxKey && !isValidProductionKey) {
      const expectedFormat = isSandbox
        ? "SB-Mid-server-xxxx"
        : "Mid-server-xxxx";
      const actualPrefix = serverKey.substring(
        0,
        Math.min(20, serverKey.length)
      );

      console.error(
        `[Midtrans] Invalid server key format.\n` +
          `  Environment: ${isSandbox ? "Sandbox" : "Production"}\n` +
          `  Expected: ${expectedFormat}\n` +
          `  Got: ${actualPrefix}...\n` +
          `  Full key length: ${serverKey.length}`
      );

      return {
        success: false,
        error:
          `Format server key tidak valid.\n` +
          `Environment: ${isSandbox ? "Sandbox" : "Production"}\n` +
          `Expected format: ${expectedFormat}\n` +
          `Pastikan menggunakan key yang sesuai dari Midtrans Dashboard.`,
      };
    }

    // Log configuration (without exposing full key)
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Midtrans] Configuration:\n` +
          `  Environment: ${isSandbox ? "Sandbox" : "Production"}\n` +
          `  Server Key: ${serverKey.substring(0, 15)}... (${serverKey.length} chars)\n` +
          `  Client Key: ${MIDTRANS_CONFIG.clientKey.substring(0, 15)}... (${MIDTRANS_CONFIG.clientKey.length} chars)`
      );
    }

    // ============================================
    // DATABASE INTEGRATION
    // ============================================

    // 1. Check event availability
    const availability = await checkEventAvailability(
      params.eventId.toString(),
      params.quantity
    );

    if (!availability.available) {
      return {
        success: false,
        error: `Maaf, hanya tersisa ${availability.spotsLeft} tiket untuk event ini.`,
      };
    }

    // 2. Get event details
    const event = await getEventById(params.eventId.toString());
    if (!event) {
      return {
        success: false,
        error: "Event tidak ditemukan.",
      };
    }

    // Verify price matches
    if (event.price !== params.pricePerTicket) {
      console.warn(
        `[Midtrans] Price mismatch: DB=${event.price}, Request=${params.pricePerTicket}`
      );
      // Use database price for security
      params.pricePerTicket = event.price;
    }

    // 3. Find or create customer
    const customer = await findOrCreateCustomer({
      email: params.customerEmail,
      name: params.customerName,
      phone: params.customerPhone,
    });

    // 4. Generate order ID
    const orderId = generateOrderId(params.eventId);
    const grossAmount = params.quantity * params.pricePerTicket;

    // 5. Create Snap API instance
    const snap = new midtransClient.Snap({
      isProduction: MIDTRANS_CONFIG.isProduction,
      serverKey: serverKey,
    });

    // 6. Transaction parameters
    const transactionParams = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: `TICKET-${params.eventId}`,
          price: params.pricePerTicket,
          quantity: params.quantity,
          name: params.eventTitle.substring(0, 50),
          category: "Tiket Event",
        },
      ],
      customer_details: {
        first_name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone,
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/?payment=success&order_id=${orderId}`,
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

    // 7. Create Midtrans transaction
    const midtransTransaction = await snap.createTransaction(transactionParams);

    // 8. Save transaction to database
    const dbTransaction = await createTransaction({
      order_id: orderId,
      customer_id: customer.id,
      event_id: event.id,
      quantity: params.quantity,
      price_per_ticket: params.pricePerTicket,
      gross_amount: grossAmount,
      snap_token: midtransTransaction.token,
      snap_redirect_url: midtransTransaction.redirect_url,
      transaction_status: "pending",
      payment_type: null,
      transaction_id: null,
      transaction_time: null,
      settlement_time: null,
      fraud_status: null,
      midtrans_response: null,
      notes: null,
    });

    // 9. Create reserved tickets
    await createTicketsForTransaction(
      dbTransaction.id,
      event.id,
      customer.id,
      params.quantity
    );

    console.log(
      `[Midtrans] Transaction created: ${orderId}, DB ID: ${dbTransaction.id}`
    );

    return {
      success: true,
      token: midtransTransaction.token,
      redirectUrl: midtransTransaction.redirect_url,
      orderId: orderId,
    };
  } catch (error: unknown) {
    console.error("Midtrans createSnapToken error:", error);

    // Handle Midtrans API errors
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
            error:
              "Autentikasi gagal (401). Periksa server key di .env.local. Pastikan:\n" +
              "1. Menggunakan Sandbox key (SB-Mid-server-xxxx) jika NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false\n" +
              "2. Menggunakan Production key (Mid-server-xxxx) jika NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=true\n" +
              "3. Server key tidak ada spasi di awal/akhir\n" +
              "4. Restart dev server setelah mengubah .env.local",
          };
        }

        const errorMessages =
          apiResponse?.error_messages ||
          (apiResponse?.status_message
            ? [apiResponse.status_message]
            : []);

        if (errorMessages.length > 0) {
          return {
            success: false,
            error: errorMessages.join(", "),
          };
        }
      }

      if ("httpStatusCode" in errorObj) {
        const httpStatus = errorObj.httpStatusCode as number;
        if (httpStatus === 401) {
          return {
            success: false,
            error:
              "Autentikasi gagal (401). Periksa server key di .env.local. Pastikan menggunakan key yang sesuai dengan environment (Sandbox/Production).",
          };
        }
      }

      const errorMessage =
        errorObj.message || errorObj.status_message || String(error);
      if (
        typeof errorMessage === "string" &&
        (errorMessage.includes("401") ||
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("Access denied"))
      ) {
        return {
          success: false,
          error:
            "Autentikasi gagal. Periksa server key di .env.local:\n" +
            `- Environment: ${MIDTRANS_CONFIG.isProduction ? "Production" : "Sandbox"}\n` +
            `- Expected key format: ${MIDTRANS_CONFIG.isProduction ? "Mid-server-xxxx" : "SB-Mid-server-xxxx"}\n` +
            "- Pastikan key benar dan restart dev server",
        };
      }
    }

    // Generic error handling
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error:
        errorMessage.includes("401") || errorMessage.includes("unauthorized")
          ? "Autentikasi gagal. Periksa konfigurasi server key di .env.local"
          : errorMessage || "Gagal membuat transaksi. Coba lagi.",
    };
  }
};
