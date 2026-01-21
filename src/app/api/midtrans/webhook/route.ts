import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  updateTransactionByOrderId,
  getTransactionByOrderId,
  activateTickets,
  cancelTickets,
  increaseEventSpots,
} from "@/db/queries";
import type { TransactionStatus, PaymentType } from "@/db/types";

// Midtrans webhook notification type
type MidtransNotification = {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  settlement_time?: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;
  // Additional fields for specific payment types
  va_numbers?: Array<{ va_number: string; bank: string }>;
  payment_code?: string;
  store?: string;
  permata_va_number?: string;
  biller_code?: string;
  bill_key?: string;
  acquirer?: string;
  // For credit card
  masked_card?: string;
  card_type?: string;
  bank?: string;
  approval_code?: string;
  // For e-wallet
  issuer?: string;
};

// Map Midtrans transaction status to our enum
const mapTransactionStatus = (
  midtransStatus: string
): TransactionStatus => {
  const statusMap: Record<string, TransactionStatus> = {
    pending: "pending",
    capture: "capture",
    settlement: "settlement",
    deny: "deny",
    cancel: "cancel",
    expire: "expire",
    refund: "refund",
    partial_refund: "partial_refund",
    failure: "failure",
  };

  return statusMap[midtransStatus] || "pending";
};

// Map Midtrans payment type to our enum
const mapPaymentType = (midtransPaymentType: string): PaymentType => {
  const paymentMap: Record<string, PaymentType> = {
    credit_card: "credit_card",
    bank_transfer: "bank_transfer",
    echannel: "echannel",
    bca_klikpay: "bca_klikpay",
    bca_klikbca: "bca_klikbca",
    bri_epay: "bri_epay",
    cimb_clicks: "cimb_clicks",
    danamon_online: "danamon_online",
    qris: "qris",
    gopay: "gopay",
    shopeepay: "shopeepay",
    cstore: "cstore",
    indomaret: "cstore",
    alfamart: "cstore",
    akulaku: "akulaku",
    kredivo: "kredivo",
  };

  return paymentMap[midtransPaymentType] || "other";
};

// Verify signature from Midtrans
const verifySignature = (notification: MidtransNotification): boolean => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";

  // Signature = SHA512(order_id + status_code + gross_amount + serverKey)
  const signatureInput = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
  const calculatedSignature = crypto
    .createHash("sha512")
    .update(signatureInput)
    .digest("hex");

  return calculatedSignature === notification.signature_key;
};

export async function POST(request: NextRequest) {
  try {
    const notification: MidtransNotification = await request.json();

    console.log(
      `[Midtrans Webhook] Received notification for order: ${notification.order_id}`
    );
    console.log(
      `[Midtrans Webhook] Status: ${notification.transaction_status}, Payment: ${notification.payment_type}`
    );

    // Verify signature
    if (!verifySignature(notification)) {
      console.error("[Midtrans Webhook] Invalid signature");
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 403 }
      );
    }

    // Get existing transaction
    const existingTransaction = await getTransactionByOrderId(
      notification.order_id
    );

    if (!existingTransaction) {
      console.error(
        `[Midtrans Webhook] Transaction not found: ${notification.order_id}`
      );
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    const transactionStatus = mapTransactionStatus(
      notification.transaction_status
    );
    const paymentType = mapPaymentType(notification.payment_type);

    // Update transaction in database
    const updatedTransaction = await updateTransactionByOrderId(
      notification.order_id,
      {
        transaction_id: notification.transaction_id,
        transaction_status: transactionStatus,
        transaction_time: notification.transaction_time
          ? new Date(notification.transaction_time).toISOString()
          : null,
        settlement_time: notification.settlement_time
          ? new Date(notification.settlement_time).toISOString()
          : null,
        payment_type: paymentType,
        fraud_status: notification.fraud_status || null,
        midtrans_response: notification as unknown as Record<string, unknown>,
      }
    );

    if (!updatedTransaction) {
      console.error(
        `[Midtrans Webhook] Failed to update transaction: ${notification.order_id}`
      );
      return NextResponse.json(
        { success: false, message: "Failed to update transaction" },
        { status: 500 }
      );
    }

    // Handle different transaction statuses
    switch (notification.transaction_status) {
      case "capture":
        // Credit card transaction captured
        if (notification.fraud_status === "accept") {
          // Activate tickets
          await activateTickets(existingTransaction.id);
          console.log(
            `[Midtrans Webhook] Tickets activated for: ${notification.order_id}`
          );
        } else if (notification.fraud_status === "challenge") {
          // Wait for manual review
          console.log(
            `[Midtrans Webhook] Transaction challenged: ${notification.order_id}`
          );
        }
        break;

      case "settlement":
        // Payment settled - activate tickets
        await activateTickets(existingTransaction.id);
        console.log(
          `[Midtrans Webhook] Payment settled, tickets activated: ${notification.order_id}`
        );
        // TODO: Send email confirmation with tickets
        break;

      case "pending":
        // Waiting for payment
        console.log(
          `[Midtrans Webhook] Payment pending: ${notification.order_id}`
        );
        break;

      case "deny":
      case "cancel":
      case "expire":
      case "failure":
        // Cancel tickets and restore spots
        const cancelledTickets = await cancelTickets(existingTransaction.id);
        if (cancelledTickets.length > 0) {
          await increaseEventSpots(
            existingTransaction.event_id,
            cancelledTickets.length
          );
        }
        console.log(
          `[Midtrans Webhook] Transaction ${notification.transaction_status}: ${notification.order_id}, ${cancelledTickets.length} tickets cancelled`
        );
        break;

      case "refund":
      case "partial_refund":
        // Handle refund
        const refundedTickets = await cancelTickets(existingTransaction.id);
        if (refundedTickets.length > 0) {
          await increaseEventSpots(
            existingTransaction.event_id,
            refundedTickets.length
          );
        }
        console.log(
          `[Midtrans Webhook] Transaction refunded: ${notification.order_id}`
        );
        break;

      default:
        console.log(
          `[Midtrans Webhook] Unknown status: ${notification.transaction_status}`
        );
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("[Midtrans Webhook] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// Handle GET request (for testing/health check)
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Midtrans webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}

