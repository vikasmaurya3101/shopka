import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Creates (or promotes) the admin who can sign in at /admin/login.
 *
 *   ADMIN_EMAIL=you@shopka.in ADMIN_PASSWORD='…' npm run seed:admin
 *
 * Run it again with a new password to rotate one — the user is upserted by
 * email, so it never creates duplicates.
 *
 * Credentials come from the environment rather than being hard-coded or
 * generated: a committed default password is the kind of thing that survives to
 * production, and a generated one printed to a terminal ends up in CI logs.
 */

// Duplicated from src/features/auth/constants/auth.constants.ts rather than
// imported: this script runs under plain tsx with no Next.js path aliases, so
// "@/..." wouldn't resolve here.
const PASSWORD_BCRYPT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 10;

const prisma = new PrismaClient();

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    fail(
      "ADMIN_EMAIL is required.\n" +
        "  ADMIN_EMAIL=you@shopka.in ADMIN_PASSWORD='…' npm run seed:admin"
    );
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail(`ADMIN_EMAIL doesn't look like an email address: ${email}`);
  }

  if (!password) {
    fail("ADMIN_PASSWORD is required.");
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    fail(
      `ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters (got ${password.length}).`
    );
  }

  const hashed = await bcrypt.hash(password, PASSWORD_BCRYPT_ROUNDS);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  const admin = await prisma.user.upsert({
    where: { email },
    // An existing customer keeps their orders, addresses and cart — they're
    // promoted in place, not replaced.
    update: {
      password: hashed,
      role: "ADMIN",
      isActive: true,
      emailVerified: true,
    },
    create: {
      email,
      password: hashed,
      role: "ADMIN",
      isActive: true,
      emailVerified: true,
      firstName: "Admin",
    },
    select: { id: true, email: true, role: true },
  });

  if (!existing) {
    console.log(`\n✅ Created admin ${admin.email}`);
  } else if (existing.role !== "ADMIN") {
    console.log(
      `\n✅ Promoted existing ${existing.role} ${admin.email} to ADMIN and set a password`
    );
  } else {
    console.log(`\n✅ Reset the password for existing admin ${admin.email}`);
  }

  console.log(`   id: ${admin.id}`);
  console.log(`   Sign in at /admin/login\n`);
}

main()
  .catch((error) => {
    console.error("\n✖ seed:admin failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
