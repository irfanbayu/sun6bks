// Client-safe Midtrans configuration — NO server key here
export const MIDTRANS_CLIENT_KEY = (
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""
).trim();

export const MIDTRANS_IS_PRODUCTION =
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

export const MIDTRANS_SNAP_URL = MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/snap.js"
  : "https://app.sandbox.midtrans.com/snap/snap.js";
