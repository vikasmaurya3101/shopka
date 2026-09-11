import { z } from "zod";

export const CheckoutDto = z.object({
  addressId: z.string().min(1),
  paymentMethod: z.enum(["COD", "RAZORPAY", "UPI"]).default("COD"),
  // Present only when paymentMethod === "RAZORPAY", returned by the
  // Razorpay checkout modal after a successful payment.
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
});

export type CheckoutDtoType = z.infer<typeof CheckoutDto>;
