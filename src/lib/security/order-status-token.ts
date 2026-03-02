import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const ORDER_STATUS_TOKEN_TTL_SECONDS = 24 * 60 * 60;

type OrderStatusTokenPayload = {
  orderId: string;
  expiresAt: number;
};

type OrderStatusTokenResult = {
  signature: string;
  expiresAt: number;
};

const getOrderStatusTokenSecret = (): string => {
  const secret =
    process.env.ORDER_STATUS_TOKEN_SECRET ?? process.env.CRON_SECRET ?? "";
  return secret.trim();
};

const toBase64Url = (value: Buffer): string => {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const fromBase64Url = (value: string): Buffer => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64");
};

const buildPayload = (payload: OrderStatusTokenPayload): string => {
  return `${payload.orderId}.${payload.expiresAt}`;
};

const signPayload = (payload: string, secret: string): string => {
  const digest = createHmac("sha256", secret).update(payload).digest();
  return toBase64Url(digest);
};

const createOrderStatusToken = (orderId: string): OrderStatusTokenResult => {
  const secret = getOrderStatusTokenSecret();
  if (!secret) {
    throw new Error("Missing ORDER_STATUS_TOKEN_SECRET environment variable");
  }

  const expiresAt =
    Math.floor(Date.now() / 1000) + ORDER_STATUS_TOKEN_TTL_SECONDS;
  const payload = buildPayload({ orderId, expiresAt });
  const signature = signPayload(payload, secret);

  return { signature, expiresAt };
};

const verifyOrderStatusToken = (params: {
  orderId: string;
  expiresAt: string | null;
  signature: string | null;
}): boolean => {
  if (!params.expiresAt || !params.signature) return false;

  const secret = getOrderStatusTokenSecret();
  if (!secret) return false;

  const expiresAt = Number(params.expiresAt);
  if (!Number.isFinite(expiresAt)) return false;
  if (Math.floor(Date.now() / 1000) > expiresAt) return false;

  const payload = buildPayload({ orderId: params.orderId, expiresAt });
  const expectedSignature = signPayload(payload, secret);

  try {
    const expectedBuffer = fromBase64Url(expectedSignature);
    const actualBuffer = fromBase64Url(params.signature);
    if (expectedBuffer.length !== actualBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
};

export { createOrderStatusToken, verifyOrderStatusToken };
