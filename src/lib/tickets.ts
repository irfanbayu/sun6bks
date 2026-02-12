import "server-only";

import { randomBytes } from "crypto";

/**
 * Generate a unique, URL-safe ticket code for QR.
 * Format: SUN6-XXXX-XXXX-XXXX (16 hex chars grouped)
 */
export const generateTicketCode = (): string => {
  const hex = randomBytes(8).toString("hex").toUpperCase();
  return `SUN6-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
};
