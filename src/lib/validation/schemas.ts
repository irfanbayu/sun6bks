/**
 * Input Validation — Zod schemas untuk API/actions sensitif
 * Batasi quantity, panjang string, format input (UPDATESECUIRTY.md)
 */

import { z } from "zod";

const STRING_LIMITS = {
  name: { min: 1, max: 200 },
  email: { max: 254 },
  phone: { max: 20 },
  note: { max: 500 },
  deviceId: { max: 100 },
  ticketCode: { min: 1, max: 50 },
} as const;

export const createOrderSchema = z.object({
  eventId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  eventTitle: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(10),
  pricePerTicket: z.number().int().nonnegative(),
  customerName: z
    .string()
    .min(STRING_LIMITS.name.min)
    .max(STRING_LIMITS.name.max)
    .trim(),
  customerEmail: z.string().email().max(STRING_LIMITS.email.max).trim(),
  customerPhone: z.string().min(1).max(STRING_LIMITS.phone.max).trim(),
});

export type CreateOrderValidated = z.infer<typeof createOrderSchema>;

export const checkinSyncItemSchema = z.object({
  id: z.string().min(1).max(100),
  ticketCode: z
    .string()
    .min(STRING_LIMITS.ticketCode.min)
    .max(STRING_LIMITS.ticketCode.max)
    .trim(),
  action: z.enum(["mark_used", "override_manual"]),
  scannedAt: z.string().min(1).max(50),
  note: z.string().max(STRING_LIMITS.note.max).nullable(),
  deviceId: z.string().min(1).max(STRING_LIMITS.deviceId.max),
});

export const checkinSyncSchema = z.object({
  eventId: z.number().int().positive(),
  items: z
    .array(checkinSyncItemSchema)
    .min(1, "Minimal 1 item")
    .max(100, "Maksimal 100 item per batch"),
});

export type CheckinSyncValidated = z.infer<typeof checkinSyncSchema>;

/** Schema untuk form detail pemesan di BuyTicketModal */
const PHONE_REGEX = /^[0-9+\-\s]{10,15}$/;

export const customerDetailsSchema = z.object({
  name: z
    .string()
    .min(1, "Nama wajib diisi")
    .max(STRING_LIMITS.name.max)
    .trim(),
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(STRING_LIMITS.email.max)
    .trim(),
  phone: z
    .string()
    .min(1, "Nomor telepon wajib diisi")
    .regex(PHONE_REGEX, "Format nomor telepon tidak valid")
    .max(STRING_LIMITS.phone.max)
    .trim(),
});

export type CustomerDetailsValidated = z.infer<typeof customerDetailsSchema>;

export const checkinSingleSchema = z.object({
  eventId: z.number().int().positive(),
  ticketCode: z.string().min(1).max(STRING_LIMITS.ticketCode.max).trim(),
  note: z.string().max(STRING_LIMITS.note.max).nullable().optional(),
  deviceId: z.string().max(STRING_LIMITS.deviceId.max).optional(),
});

export type CheckinSingleValidated = z.infer<typeof checkinSingleSchema>;
