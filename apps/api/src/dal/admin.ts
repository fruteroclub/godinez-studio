import { sql, eq, gt, gte } from "drizzle-orm";
import {
  workspaces,
  users,
  agents,
  conversations,
  messages,
  files,
  agentLogs,
  workspaceMembers,
} from "@godinez/db";
import { db } from "../db";

export async function getOverviewStats() {
  const [ws, userCount, ag, convCount, msgCount, fileStats] = await Promise.all(
    [
      db
        .select({
          total: sql<number>`count(*)`.mapWith(Number),
          active: sql<number>`count(*) filter (where ${workspaces.status} = 'active')`.mapWith(Number),
          suspended: sql<number>`count(*) filter (where ${workspaces.status} = 'suspended')`.mapWith(Number),
          provisioning: sql<number>`count(*) filter (where ${workspaces.status} = 'provisioning')`.mapWith(Number),
        })
        .from(workspaces),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(users),
      db
        .select({
          total: sql<number>`count(*)`.mapWith(Number),
          active: sql<number>`count(*) filter (where ${agents.status} = 'active')`.mapWith(Number),
          paused: sql<number>`count(*) filter (where ${agents.status} = 'paused')`.mapWith(Number),
          provisioning: sql<number>`count(*) filter (where ${agents.status} = 'provisioning')`.mapWith(Number),
          error: sql<number>`count(*) filter (where ${agents.status} = 'error')`.mapWith(Number),
          archived: sql<number>`count(*) filter (where ${agents.status} = 'archived')`.mapWith(Number),
        })
        .from(agents),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(conversations),
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(messages),
      db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
          storageBytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)`.mapWith(Number),
        })
        .from(files),
    ],
  );

  return {
    workspaces: ws[0],
    users: userCount[0].count,
    agents: ag[0],
    conversations: convCount[0].count,
    messages: msgCount[0].count,
    files: fileStats[0].count,
    storageBytes: fileStats[0].storageBytes,
  };
}

export async function getWorkspacesList({
  limit,
  cursor,
}: {
  limit: number;
  cursor?: number;
}) {
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      status: workspaces.status,
      tier: workspaces.tier,
      createdAt: workspaces.createdAt,
      ownerEmail: users.email,
      memberCount:
        sql<number>`(select count(*) from ${workspaceMembers} wm where wm.workspace_id = ${workspaces.id})`.mapWith(
          Number,
        ),
      messageCount:
        sql<number>`(select count(*) from ${messages} m where m.workspace_id = ${workspaces.id})`.mapWith(
          Number,
        ),
      lastActivity:
        sql<string | null>`(select max(m.created_at) from ${messages} m where m.workspace_id = ${workspaces.id})`,
    })
    .from(workspaces)
    .leftJoin(users, eq(workspaces.ownerId, users.id))
    .where(cursor ? gt(workspaces.id, cursor) : undefined)
    .orderBy(workspaces.id)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor };
}

export async function getAgentsList({
  limit,
  cursor,
}: {
  limit: number;
  cursor?: number;
}) {
  const rows = await db
    .select({
      id: agents.id,
      name: agents.name,
      slug: agents.slug,
      template: agents.template,
      status: agents.status,
      createdAt: agents.createdAt,
      workspaceName:
        sql<string | null>`(select w.name from ${workspaces} w where w.agent_id = ${agents.id} limit 1)`,
      tokenUsage:
        sql<number>`coalesce((select sum(al.tokens_used) from ${agentLogs} al where al.agent_id = ${agents.id}), 0)`.mapWith(
          Number,
        ),
      lastActive:
        sql<string | null>`(select max(al.created_at) from ${agentLogs} al where al.agent_id = ${agents.id})`,
    })
    .from(agents)
    .where(cursor ? gt(agents.id, cursor) : undefined)
    .orderBy(agents.id)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor };
}

const PERIOD_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export async function getGrowthTimeSeries({
  period,
}: {
  period: string;
}) {
  const days = PERIOD_DAYS[period] ?? 7;

  const rows = await db.execute<{
    date: string;
    new_users: number;
    new_workspaces: number;
    new_conversations: number;
    messages_sent: number;
  }>(sql`
    with dates as (
      select generate_series(
        date_trunc('day', now() - interval '1 day' * ${days}),
        date_trunc('day', now()),
        interval '1 day'
      )::date as d
    )
    select
      d as date,
      coalesce((select count(*) from ${users} where date_trunc('day', ${users.createdAt}) = d), 0)::int as new_users,
      coalesce((select count(*) from ${workspaces} where date_trunc('day', ${workspaces.createdAt}) = d), 0)::int as new_workspaces,
      coalesce((select count(*) from ${conversations} where date_trunc('day', ${conversations.createdAt}) = d), 0)::int as new_conversations,
      coalesce((select count(*) from ${messages} where date_trunc('day', ${messages.createdAt}) = d), 0)::int as messages_sent
    from dates
    order by d
  `);

  return {
    period,
    data: rows.map((r) => ({
      date: r.date,
      newUsers: Number(r.new_users),
      newWorkspaces: Number(r.new_workspaces),
      newConversations: Number(r.new_conversations),
      messagesSent: Number(r.messages_sent),
    })),
  };
}

export async function getUsageByWorkspace({
  limit,
  cursor,
  period,
}: {
  limit: number;
  cursor?: number;
  period: string;
}) {
  const days = PERIOD_DAYS[period] ?? 30;

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      tier: workspaces.tier,
      ownerEmail: users.email,
      tokenUsage:
        sql<number>`coalesce((
          select sum(al.tokens_used)
          from ${agentLogs} al
          where al.workspace_id = ${workspaces.id}
          and al.created_at >= now() - interval '1 day' * ${days}
        ), 0)`.mapWith(Number),
      storageBytes:
        sql<number>`coalesce((
          select sum(f.size_bytes)
          from ${files} f
          where f.workspace_id = ${workspaces.id}
        ), 0)`.mapWith(Number),
      messageCount:
        sql<number>`coalesce((
          select count(*)
          from ${messages} m
          where m.workspace_id = ${workspaces.id}
          and m.created_at >= now() - interval '1 day' * ${days}
        ), 0)`.mapWith(Number),
    })
    .from(workspaces)
    .leftJoin(users, eq(workspaces.ownerId, users.id))
    .where(cursor ? gt(workspaces.id, cursor) : undefined)
    .orderBy(sql`coalesce((
      select sum(al.tokens_used)
      from ${agentLogs} al
      where al.workspace_id = ${workspaces.id}
      and al.created_at >= now() - interval '1 day' * ${days}
    ), 0) desc`)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor };
}
