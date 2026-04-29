import { eq } from "drizzle-orm";
import { users } from "@godinez/db";
import { db } from "../db";

export async function getUserByClerkId(clerkId: string) {
  return db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function getUserById(id: number) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function updateUser(
  id: number,
  data: {
    name?: string;
    jobRole?: string;
    businessDescription?: string;
    projectType?: string;       // Onboarding V3
    projectSubtype?: string;    // Onboarding V3
    deadline?: Date | null;     // Onboarding V3
  },
) {
  const [updated] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return updated;
}

export async function updateUserRole(id: number, role: "user" | "admin") {
  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, id))
    .returning();
  return updated;
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
