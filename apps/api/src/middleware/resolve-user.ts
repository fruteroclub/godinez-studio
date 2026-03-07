import { createMiddleware } from "hono/factory";
import { createClerkClient } from "@clerk/backend";
import { getUserByClerkId, upsertUser } from "../dal/users";
import type { AuthEnv } from "../types";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

async function syncUserFromClerk(clerkId: string) {
  try {
    const clerkUser = await clerk.users.getUser(clerkId);
    return upsertUser({
      clerkId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      name:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        undefined,
      avatarUrl: clerkUser.imageUrl ?? undefined,
    });
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
