import { PrismaClient } from "@prisma/client";

/**
 * One-time seed for the public contact settings (phone, WhatsApp number,
 * registered address) that were missing on the live site — the exact gap
 * flagged during the WhatsApp Business review. Values are taken from the
 * business's own Udyam Registration Certificate (UDYAM-UP-31-0053970), so
 * they are the real, verifiable details Meta checks a business's website
 * against during WhatsApp Business verification.
 *
 * Safe to re-run: each key is upserted, so it never creates duplicates, and
 * an admin who has since changed a value from /admin/settings can just skip
 * re-running this for that key (or edit the values below first).
 *
 *   npm run seed:settings
 */

const prisma = new PrismaClient();

// Sourced from the Udyam Registration Certificate. Update here (not in
// component code) if the registered address or number ever changes — every
// page reads this through the settings table, not a hardcoded string.
const SETTINGS: Record<string, string> = {
  contact_email: "support@shopka.in",
  contact_phone: "+91 9554754298",
  whatsapp_number: "+91 9554754298",
  address: "281, Vikas, Budhni Road, Hinchhapur, Babhanjot, Gonda, Uttar Pradesh - 271312",
};

async function main() {
  const entries = Object.entries(SETTINGS);

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  console.log("\n✅ Seeded site settings:");
  for (const [key, value] of entries) {
    console.log(`   ${key} = ${value}`);
  }
  console.log(
    "\n   Double-check the WhatsApp number above matches the number\n" +
      "   actually registered on your WhatsApp Business account — Meta\n" +
      "   compares the two during review.\n"
  );
}

main()
  .catch((error) => {
    console.error("\n✖ seed:settings failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
