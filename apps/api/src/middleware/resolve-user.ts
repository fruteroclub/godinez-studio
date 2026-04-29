import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { createClerkClient } from "@clerk/backend";
import { getUserByClerkId, getUserByEmail, upsertUser } from "../dal/users";
import { db } from "../db";
import { users } from "@godinez/db";
import type { AuthEnv } from "../types";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

async function syncUserFromClerk(clerkId: string) {
  try {
    const clerkUser = await clerk.users.getUser(clerkId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      undefined;
    const avatarUrl = clerkUser.imageUrl ?? undefined;

    try {
      return await upsertUser({ clerkId, email, name, avatarUrl });
    } catch {
      // Email unique constraint hit — user exists with a different clerkId
      // (e.g. manually inserted or migrated). Update to the real clerkId.
      const existing = await getUserByEmail(email);
      if (!existing) return undefined;
      const [updated] = await db
        .update(users)
        .set({ clerkId, name, avatarUrl })
        .where(eq(users.id, existing.id))
        .returning();
      return updated;
    }
  } catch {
    return undefined;
  }
}

export const resolveUser = createMiddleware<AuthEnv>(async (c, next) => {
  const clerkId = c.get("clerkUserId");
  let user = await getUserByClerkId(clerkId);

  if (!user) {
    user = await syncUserFromClerk(clerkId);
  }

  if (!user) return c.json({ error: "User not found" }, 404);

  c.set("userId", user.id);
  await next();
});
