-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "whatsappConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."users" ADD COLUMN     "whatsappConsentAt" TIMESTAMP(3);
