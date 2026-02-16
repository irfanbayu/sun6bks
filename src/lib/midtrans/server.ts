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

const SNAP_BASE_URL = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

// ---------- Snap Transaction (native fetch — no axios dependency) ----------

type SnapTransactionResult = {
  token: string;
  redirect_url: string;
};

type MidtransApiError = Error & {
  statusCode: number;
  midtransResponse: Record<string, unknown>;
};

/**
 * Create a Snap transaction using native `fetch` with proper Basic Auth.
 * More reliable in Next.js server actions than `midtrans-client` (axios-based).
 */
export const createSnapTransaction = async (
  params: Record<string, unknown>
): Promise<SnapTransactionResult> => {
  if (!SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY is not configured");
  }

  const url = `${SNAP_BASE_URL}/transactions`;
  const authString = Buffer.from(`${SERVER_KEY}:`).toString("base64");

  if (process.env.NODE_ENV === "development") {
    console.log("[Midtrans] Creating Snap transaction:", {
      url,
      orderId: (params.transaction_details as Record<string, unknown>)
        ?.order_id,
      grossAmount: (params.transaction_details as Record<string, unknown>)
        ?.gross_amount,
      isProduction: IS_PRODUCTION,
      serverKeyPrefix: `${SERVER_KEY.substring(0, 16)}...`,
    });
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${authString}`,
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!response.ok) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Midtrans] Snap API error:", {
        status: response.status,
        data,
      });
    }

    const errorMessages: string[] =
      data.error_messages || [data.status_message || "Unknown Midtrans error"];

    const error = new Error(errorMessages.join(", ")) as MidtransApiError;
    error.statusCode = response.status;
    error.midtransResponse = data;
    throw error;
  }

  return data as SnapTransactionResult;
};

// ---------- Core API instance (for status checks via midtrans-client) ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _coreApi: any = null;

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

// ---------- Jakarta time formatter (for Midtrans expiry) ----------

/**
 * Format a Date to Midtrans-compatible string in Asia/Jakarta timezone.
 * Output: "2026-02-16 19:30:45 +0700"
 */
export const formatJakartaTime = (date: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} +0700`;
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
