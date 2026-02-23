"use client";

import Script from "next/script";
import { MIDTRANS_SNAP_URL, MIDTRANS_CLIENT_KEY } from "@/lib/midtrans/client";

type MidtransProviderProps = {
  /** Only renders the Snap script when enabled (defer third-party) */
  enabled?: boolean;
};

export const MidtransProvider = ({ enabled = false }: MidtransProviderProps) => {
  if (!enabled || !MIDTRANS_CLIENT_KEY) {
    return null;
  }

  return (
    <Script
      src={MIDTRANS_SNAP_URL}
      data-client-key={MIDTRANS_CLIENT_KEY}
      strategy="afterInteractive"
      onLoad={() => {
        if (process.env.NODE_ENV === "development") {
          console.log("[Midtrans] Snap script loaded");
        }
      }}
      onError={() => {
        console.error("[Midtrans] Failed to load Snap script");
      }}
    />
  );
};
