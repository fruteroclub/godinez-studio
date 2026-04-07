/**
 * Seed script: create "active" accounts for existing beta users who don't have one.
 *
 * Usage:
 *   source apps/api/.env.local
 *   pnpm --filter @godinez/api tsx ../../scripts/seed-beta-accounts.ts
 */

import { createDb } from "@godinez/db";
import { users, accounts } from "@godinez/db";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const db = createDb(DATABASE_URL);

async function main() {
  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} users`);

  let created = 0;
  for (const user of allUsers) {
    const existing = await db.query.accounts.findFirst({
      where: eq(accounts.ownerId, user.id),
    });

    if (!existing) {
      await db.insert(accounts).values({
        ownerId: user.id,
        subscriptionStatus: "active",
      });
      created++;
      console.log(`Created active account for user ${user.id} (${user.email})`);
    }
  }

  console.log(`Done. Created ${created} accounts, skipped ${allUsers.length - created}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
