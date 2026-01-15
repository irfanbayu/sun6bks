"use client";

import Script from "next/script";
import { MIDTRANS_SNAP_URL, MIDTRANS_CONFIG } from "@/lib/midtrans";

export const MidtransProvider = () => {
  if (!MIDTRANS_CONFIG.clientKey) {
    console.warn("Midtrans client key is not configured");
    return null;
  }

  return (
    <Script
      src={MIDTRANS_SNAP_URL}
      data-client-key={MIDTRANS_CONFIG.clientKey}
      strategy="lazyOnload"
      onLoad={() => {
        console.log("Midtrans Snap loaded successfully");
      }}
      onError={() => {
        console.error("Failed to load Midtrans Snap");
      }}
    />
  );
};
