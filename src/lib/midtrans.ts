// Midtrans configuration
export const MIDTRANS_CONFIG = {
  isProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true",
  clientKey: (process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").trim(),
  serverKey: (process.env.MIDTRANS_SERVER_KEY || "").trim(),
};

export const MIDTRANS_SNAP_URL = MIDTRANS_CONFIG.isProduction
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";

// Generate unique order ID
export const generateOrderId = (eventId: number): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SUN6BKS-${eventId}-${timestamp}-${random}`;
};
