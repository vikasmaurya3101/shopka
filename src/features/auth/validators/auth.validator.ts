import { z } from "zod";

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  channel: z.enum(["whatsapp", "sms"]).optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;