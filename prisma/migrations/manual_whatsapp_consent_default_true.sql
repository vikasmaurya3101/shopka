-- Set whatsappConsent = true for all existing users who never explicitly opted out
-- (i.e. those where whatsappConsentAt is null AND whatsappConsent is false)
UPDATE "User"
SET "whatsappConsent" = true,
    "whatsappConsentAt" = NOW()
WHERE "whatsappConsent" = false
  AND "whatsappConsentAt" IS NULL;
