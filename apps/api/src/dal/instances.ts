import { sql, eq, and, notInArray } from "drizzle-orm";
import {
  gatewayInstances,
  workspaces,
  users,
  agents,
  messages,
} from "@godinez/db";
import { db } from "../db";

export async function getAllInstances() {
  const rows = await db
    .select({
      id: gatewayInstances.id,
      name: gatewayInstances.name,
      url: gatewayInstances.url,
      tier: gatewayInstances.tier,
      status: gatewayInstances.status,
      maxSlots: gatewayInstances.maxSlots,
      usedSlots: gatewayInstances.usedSlots,
      region: gatewayInstances.region,
      customerId: gatewayInstances.customerId,
      metadata: gatewayInstances.metadata,
      createdAt: gatewayInstances.createdAt,
      updatedAt: gatewayInstances.updatedAt,
    })
    .from(gatewayInstances)
    .orderBy(gatewayInstances.id);

  return rows.map((r) => ({
    ...r,
    utilizationPercent:
      r.maxSlots > 0 ? Math.round((r.usedSlots / r.maxSlots) * 100) : 0,
  }));
}

export async function getInstanceById(id: number) {
  return db.query.gatewayInstances.findFirst({
    where: eq(gatewayInstances.id, id),
  });
}

export async function getInstanceWithWorkspaces(id: number) {
  const instance = await db.query.gatewayInstances.findFirst({
    where: eq(gatewayInstances.id, id),
  });
  if (!instance) return null;

  const assignedWorkspaces = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      status: workspaces.status,
      ownerEmail: users.email,
      agentStatus:
        sql<string | null>`(select ${agents.status} from ${agents} where ${agents.id} = ${workspaces.agentId})`,
      lastMessageAt:
        sql<string | null>`(select max(${messages.createdAt}) from ${messages} where ${messages.workspaceId} = ${workspaces.id})`,
    })
    .from(workspaces)
    .leftJoin(users, eq(workspaces.ownerId, users.id))
    .where(eq(workspaces.instanceId, id));

  return {
    ...instance,
    utilizationPercent:
      instance.maxSlots > 0
        ? Math.round((instance.usedSlots / instance.maxSlots) * 100)
        : 0,
    workspaces: assignedWorkspaces,
  };
}

export async function createInstance(data: {
  name: string;
  url: string;
  token: string;
  tier?: string;
  maxSlots?: number;
  region?: string;
  customerId?: number;
  metadata?: unknown;
}) {
  const [instance] = await db
    .insert(gatewayInstances)
    .values(data)
    .returning();
  return instance;
}

export async function updateInstance(
  id: number,
  data: Partial<{
    name: string;
    url: string;
    token: string;
    tier: string;
    status: string;
    maxSlots: number;
    region: string;
    customerId: number | null;
    metadata: unknown;
  }>,
) {
  const [instance] = await db
    .update(gatewayInstances)
    .set(data)
    .where(eq(gatewayInstances.id, id))
    .returning();
  return instance;
}

export async function getInstanceByName(name: string) {
  return db.query.gatewayInstances.findFirst({
    where: eq(gatewayInstances.name, name),
  });
}

export async function pickSharedInstance() {
  // Fill-then-spill: pick the fullest non-full active shared instance
  const [row] = await db
    .select()
    .from(gatewayInstances)
    .where(
      and(
        eq(gatewayInstances.tier, "shared"),
        eq(gatewayInstances.status, "active"),
        sql`${gatewayInstances.usedSlots} < ${gatewayInstances.maxSlots}`,
      ),
    )
    .orderBy(sql`${gatewayInstances.usedSlots} DESC`)
    .limit(1);
  return row ?? null;
}

export async function pickSharedInstanceExcluding(excludeIds: number[]) {
  const conditions = [
    eq(gatewayInstances.tier, "shared"),
    eq(gatewayInstances.status, "active"),
    sql`${gatewayInstances.usedSlots} < ${gatewayInstances.maxSlots}`,
  ];
  if (excludeIds.length > 0) {
    conditions.push(notInArray(gatewayInstances.id, excludeIds));
  }
  const [row] = await db
    .select()
    .from(gatewayInstances)
    .where(and(...conditions))
    .orderBy(sql`${gatewayInstances.usedSlots} DESC`)
    .limit(1);
  return row ?? null;
}

export async function pickDedicatedInstance(customerId: number) {
  const [row] = await db
    .select()
    .from(gatewayInstances)
    .where(
      and(
        eq(gatewayInstances.tier, "dedicated"),
        eq(gatewayInstances.customerId, customerId),
        eq(gatewayInstances.status, "active"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function incrementUsedSlots(id: number) {
  await db
    .update(gatewayInstances)
    .set({ usedSlots: sql`${gatewayInstances.usedSlots} + 1` })
    .where(eq(gatewayInstances.id, id));
}

export async function decrementUsedSlots(id: number) {
  await db
    .update(gatewayInstances)
    .set({ usedSlots: sql`GREATEST(${gatewayInstances.usedSlots} - 1, 0)` })
    .where(eq(gatewayInstances.id, id));
}

export async function markInstanceOffline(id: number) {
  await db
    .update(gatewayInstances)
    .set({ status: "offline" })
    .where(eq(gatewayInstances.id, id));
}

export async function markInstanceActive(id: number) {
  await db
    .update(gatewayInstances)
    .set({ status: "active" })
    .where(eq(gatewayInstances.id, id));
}

export async function getOfflineInstances() {
  return db
    .select({
      id: gatewayInstances.id,
      name: gatewayInstances.name,
      url: gatewayInstances.url,
      token: gatewayInstances.token,
    })
    .from(gatewayInstances)
    .where(eq(gatewayInstances.status, "offline"));
}

export async function deleteInstance(id: number) {
  const instance = await db.query.gatewayInstances.findFirst({
    where: eq(gatewayInstances.id, id),
  });
  if (!instance) return { error: "not_found" as const };
  if (instance.status !== "decommissioned") {
    return { error: "must_be_decommissioned" as const };
  }

  const [assigned] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(workspaces)
    .where(eq(workspaces.instanceId, id));
  if (assigned.count > 0) {
    return { error: "has_assigned_workspaces" as const };
  }

  await db.delete(gatewayInstances).where(eq(gatewayInstances.id, id));
  return { error: null };
}
