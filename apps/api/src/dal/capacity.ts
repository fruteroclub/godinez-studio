import { sql, gte, eq } from "drizzle-orm";
import { gatewayInstances, workspaces, agentLogs, messages } from "@godinez/db";
import { db } from "../db";

export async function getCapacityOverview() {
  // Per-instance breakdown
  const instances = await db
    .select({
      id: gatewayInstances.id,
      name: gatewayInstances.name,
      tier: gatewayInstances.tier,
      status: gatewayInstances.status,
      maxSlots: gatewayInstances.maxSlots,
      usedSlots: gatewayInstances.usedSlots,
      region: gatewayInstances.region,
    })
    .from(gatewayInstances)
    .orderBy(gatewayInstances.id);

  const perInstance = instances.map((i) => ({
    ...i,
    utilization: i.maxSlots > 0 ? Math.round((i.usedSlots / i.maxSlots) * 100) : 0,
  }));

  // Aggregate
  const totalSlots = instances.reduce((s, i) => s + i.maxSlots, 0);
  const usedSlots = instances.reduce((s, i) => s + i.usedSlots, 0);

  // Trends: last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Daily active workspaces (workspaces with messages each day)
  const dailyActive = await db
    .select({
      day: sql<string>`date_trunc('day', ${messages.createdAt})::date::text`.as("day"),
      count: sql<number>`count(distinct ${messages.workspaceId})`.mapWith(Number),
    })
    .from(messages)
    .where(gte(messages.createdAt, thirtyDaysAgo))
    .groupBy(sql`date_trunc('day', ${messages.createdAt})`)
    .orderBy(sql`date_trunc('day', ${messages.createdAt})`);

  // Daily token consumption
  const dailyTokens = await db
    .select({
      day: sql<string>`date_trunc('day', ${agentLogs.createdAt})::date::text`.as("day"),
      tokens: sql<number>`coalesce(sum(${agentLogs.tokensUsed}), 0)`.mapWith(Number),
    })
    .from(agentLogs)
    .where(gte(agentLogs.createdAt, thirtyDaysAgo))
    .groupBy(sql`date_trunc('day', ${agentLogs.createdAt})`)
    .orderBy(sql`date_trunc('day', ${agentLogs.createdAt})`);

  // Simple linear projection for slot capacity
  const activeInstances = instances.filter((i) => i.status === "active" && i.tier === "shared");
  const activeTotal = activeInstances.reduce((s, i) => s + i.maxSlots, 0);
  const activeUsed = activeInstances.reduce((s, i) => s + i.usedSlots, 0);

  // Count new workspaces in last 7 days for growth rate
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentGrowth] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(workspaces)
    .where(gte(workspaces.createdAt, sevenDaysAgo));

  const weeklyGrowthRate = recentGrowth?.count ?? 0;
  const remaining = activeTotal - activeUsed;
  const daysUntilFull = weeklyGrowthRate > 0
    ? Math.round((remaining / weeklyGrowthRate) * 7)
    : null;

  return {
    instances: perInstance,
    aggregate: {
      totalSlots,
      usedSlots,
      utilization: totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0,
    },
    trends: {
      dailyActiveWorkspaces: dailyActive,
      dailyTokens,
    },
    projection: {
      weeklyGrowthRate,
      remainingSlots: remaining,
      daysUntilFull,
    },
  };
}

export async function getAgentActivity() {
  // Recent agent activity: logs grouped by workspace/agent
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const activity = await db
    .select({
      agentId: agentLogs.agentId,
      workspaceId: agentLogs.workspaceId,
      totalEvents: sql<number>`count(*)`.mapWith(Number),
      totalTokens: sql<number>`coalesce(sum(${agentLogs.tokensUsed}), 0)`.mapWith(Number),
      errorCount: sql<number>`count(*) filter (where ${agentLogs.level} = 'error')`.mapWith(Number),
      lastActivity: sql<string>`max(${agentLogs.createdAt})::text`,
    })
    .from(agentLogs)
    .where(gte(agentLogs.createdAt, thirtyDaysAgo))
    .groupBy(agentLogs.agentId, agentLogs.workspaceId)
    .orderBy(sql`max(${agentLogs.createdAt}) desc`)
    .limit(50);

  // Daily event counts for chart
  const dailyEvents = await db
    .select({
      day: sql<string>`date_trunc('day', ${agentLogs.createdAt})::date::text`.as("day"),
      events: sql<number>`count(*)`.mapWith(Number),
      tokens: sql<number>`coalesce(sum(${agentLogs.tokensUsed}), 0)`.mapWith(Number),
    })
    .from(agentLogs)
    .where(gte(agentLogs.createdAt, thirtyDaysAgo))
    .groupBy(sql`date_trunc('day', ${agentLogs.createdAt})`)
    .orderBy(sql`date_trunc('day', ${agentLogs.createdAt})`);

  // Summary stats
  const [summary] = await db
    .select({
      totalEvents: sql<number>`count(*)`.mapWith(Number),
      totalTokens: sql<number>`coalesce(sum(${agentLogs.tokensUsed}), 0)`.mapWith(Number),
      errorCount: sql<number>`count(*) filter (where ${agentLogs.level} = 'error')`.mapWith(Number),
      activeAgents: sql<number>`count(distinct ${agentLogs.agentId})`.mapWith(Number),
    })
    .from(agentLogs)
    .where(gte(agentLogs.createdAt, thirtyDaysAgo));

  return {
    agents: activity,
    dailyEvents,
    summary: summary ?? { totalEvents: 0, totalTokens: 0, errorCount: 0, activeAgents: 0 },
  };
}
