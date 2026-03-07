import { Hono } from "hono";
import { Webhook } from "svix";
import { upsertUser } from "../dal/users";
import { db } from "../db";
import { users } from "@godinez/db";
import { eq } from "drizzle-orm";

const webhooks = new Hono();

webhooks.post("/clerk", async (c) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return c.json({ error: "Webhook secret not configured" }, 500);
  }

  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: "Missing svix headers" }, 400);
  }

  const body = await c.req.text();

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    return c.json({ error: "Invalid signature" }, 400);
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const emailObj = (data.email_addresses as { email_address: string }[])?.[0];
    await upsertUser({
      clerkId: data.id as string,
      email: emailObj?.email_address ?? "",
      name:
        [data.first_name, data.last_name].filter(Boolean).join(" ") ||
        undefined,
      avatarUrl: (data.image_url as string) ?? undefined,
    });
  }

  if (type === "user.deleted") {
    const clerkId = data.id as string;
    if (clerkId) {
      await db.delete(users).where(eq(users.clerkId, clerkId));
    }
  }

  return c.json({ received: true });
});

export default webhooks;
