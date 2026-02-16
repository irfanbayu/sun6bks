import { NextResponse } from "next/server";

/**
 * GET /api/test-midtrans
 * Quick diagnostic to verify Midtrans Server Key is valid.
 * Only available in development mode.
 */
export const GET = async () => {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Only available in development" },
      { status: 403 }
    );
  }

  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
  const clientKey = (
    process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""
  ).trim();
  const isProduction =
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

  if (!serverKey) {
    return NextResponse.json({
      status: "error",
      message: "MIDTRANS_SERVER_KEY is not set in .env.local",
    });
  }

  const baseUrl = isProduction
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";

  const authString = Buffer.from(`${serverKey}:`).toString("base64");

  // Make a minimal test transaction request
  const testPayload = {
    transaction_details: {
      order_id: `TEST-${Date.now()}`,
      gross_amount: 10000,
    },
  };

  try {
    const response = await fetch(`${baseUrl}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(testPayload),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        status: "success",
        message: "Midtrans Server Key is VALID! Test transaction created.",
        environment: isProduction ? "production" : "sandbox",
        serverKeyPrefix: `${serverKey.substring(0, 16)}...`,
        clientKey: clientKey
          ? `${clientKey.substring(0, 16)}...`
          : "NOT SET",
        snapToken: data.token ? "received" : "missing",
        redirectUrl: data.redirect_url ? "received" : "missing",
      });
    }

    return NextResponse.json({
      status: "error",
      message: `Midtrans API returned HTTP ${response.status}`,
      environment: isProduction ? "production" : "sandbox",
      serverKeyPrefix: `${serverKey.substring(0, 16)}...`,
      clientKey: clientKey
        ? `${clientKey.substring(0, 16)}...`
        : "NOT SET",
      authHeader: `Basic ${authString.substring(0, 10)}...`,
      midtransResponse: data,
      hint:
        response.status === 401
          ? "Server Key ditolak oleh Midtrans. Pastikan key benar dan dari environment yang sama (Sandbox/Production). Cek di https://dashboard.sandbox.midtrans.com → Settings → Access Keys"
          : undefined,
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message:
        error instanceof Error ? error.message : "Unknown fetch error",
      environment: isProduction ? "production" : "sandbox",
      serverKeyPrefix: `${serverKey.substring(0, 16)}...`,
    });
  }
};
