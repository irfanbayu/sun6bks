import "server-only";

import { createHash } from "crypto";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const midtransClient = require("midtrans-client");

// ---------- Config ----------

const IS_PRODUCTION =
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

const SERVER_KEY = (process.env.MIDTRANS_SERVER_KEY || "").trim();

if (!SERVER_KEY && process.env.NODE_ENV !== "test") {
  console.warn("[Midtrans] MIDTRANS_SERVER_KEY is not configured");
}

// ---------- Snap instance (lazy singleton) ----------

let _snap: InstanceType<typeof midtransClient.Snap> | null = null;

export const getSnap = () => {
  if (!_snap) {
    if (!SERVER_KEY) {
      throw new Error("MIDTRANS_SERVER_KEY is not configured");
    }
    _snap = new midtransClient.Snap({
      isProduction: IS_PRODUCTION,
      serverKey: SERVER_KEY,
    });
  }
  return _snap;
};

// ---------- Core API instance (for status checks) ----------

let _coreApi: InstanceType<typeof midtransClient.CoreApi> | null = null;

export const getCoreApi = () => {
  if (!_coreApi) {
    if (!SERVER_KEY) {
      throw new Error("MIDTRANS_SERVER_KEY is not configured");
    }
    _coreApi = new midtransClient.CoreApi({
      isProduction: IS_PRODUCTION,
      serverKey: SERVER_KEY,
    });
  }
  return _coreApi;
};

// ---------- Signature verification ----------

/**
 * Verify Midtrans webhook signature.
 * Formula: SHA512(order_id + status_code + gross_amount + server_key)
 */
export const verifySignature = (
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean => {
  if (!SERVER_KEY) return false;

  const payload = orderId + statusCode + grossAmount + SERVER_KEY;
  const expectedSignature = createHash("sha512").update(payload).digest("hex");

  return expectedSignature === signatureKey;
};

// ---------- Order ID helper ----------

export const generateOrderId = (eventId: number): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SUN6BKS-${eventId}-${timestamp}-${random}`;
};

// ---------- Status mapping ----------

export type MidtransTransactionStatus =
  | "capture"
  | "settlement"
  | "pending"
  | "deny"
  | "cancel"
  | "expire"
  | "refund"
  | "partial_refund";

/**
 * Map Midtrans transaction_status + fraud_status to our internal status.
 */
export const mapMidtransStatus = (
  transactionStatus: string,
  fraudStatus?: string
): "pending" | "paid" | "expired" | "failed" | "refunded" => {
  switch (transactionStatus) {
    case "capture":
      // For credit card: check fraud status
      if (fraudStatus === "accept") return "paid";
      if (fraudStatus === "challenge") return "pending";
      return "failed";
    case "settlement":
      return "paid";
    case "pending":
      return "pending";
    case "deny":
    case "cancel":
      return "failed";
    case "expire":
      return "expired";
    case "refund":
    case "partial_refund":
      return "refunded";
    default:
      return "pending";
  }
};

/**
 * Check if a status transition is valid (only forward, never downgrade).
 */
export const isValidTransition = (
  currentStatus: string,
  nextStatus: string
): boolean => {
  // Same status = idempotent, allow
  if (currentStatus === nextStatus) return true;

  const FINAL_STATUSES = ["paid", "expired", "failed", "refunded"];

  // If already final, only allow refund from paid
  if (FINAL_STATUSES.includes(currentStatus)) {
    if (currentStatus === "paid" && nextStatus === "refunded") return true;
    return false;
  }

  // From pending, any forward transition is allowed
  if (currentStatus === "pending") return true;

  return false;
};
