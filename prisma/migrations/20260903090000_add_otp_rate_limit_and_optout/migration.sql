-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "whatsappOptOutAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."otp_request_logs" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_request_logs_phone_createdAt_idx" ON "public"."otp_request_logs"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "otp_request_logs_ip_createdAt_idx" ON "public"."otp_request_logs"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "otp_request_logs_createdAt_idx" ON "public"."otp_request_logs"("createdAt");
