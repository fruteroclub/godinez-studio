import { eq } from "drizzle-orm";
import { users } from "@godinez/db";
import { db } from "../db";

export async function getUserByClerkId(clerkId: string) {
  return db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
}

export async function getUserById(id: number) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function upsertUser(data: {
  clerkId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}) {
  const [user] = await db
    .insert(users)
    .values(data)
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
    })
    .returning();
  return user;
}
