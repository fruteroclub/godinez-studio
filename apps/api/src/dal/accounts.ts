import { eq } from "drizzle-orm";
import { accounts } from "@godinez/db";
import { db } from "../db";

export async function getAccountByUserId(userId: number) {
  return db.query.accounts.findFirst({
    where: eq(accounts.ownerId, userId),
  });
}

export async function getAccountByStripeCustomerId(customerId: string) {
  return db.query.accounts.findFirst({
    where: eq(accounts.stripeCustomerId, customerId),
  });
}

export async function createAccount(
  ownerId: number,
  stripeCustomerId?: string,
) {
  const [account] = await db
    .insert(accounts)
    .values({ ownerId, stripeCustomerId })
    .onConflictDoUpdate({
      target: accounts.ownerId,
      set: {
        updatedAt: new Date(),
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
      },
    })
    .returning();
  return account;
}

export async function updateAccountSubscription(
  stripeCustomerId: string,
  data: {
    subscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionTier?: string;
    currentPeriodEnd?: Date;
  },
) {
  const [updated] = await db
    .update(accounts)
    .set(data)
    .where(eq(accounts.stripeCustomerId, stripeCustomerId))
    .returning();
  return updated;
}
