import { sql, eq, and, gte } from "drizzle-orm";
import { gatewayInstances, agentLogs } from "@godinez/db";
import { db } from "../db";
import { logger } from "../lib/logger";

const log = logger.child({ service: "alerts" });

export interface Alert {
  id: string;
  level: "warn" | "error";
  condition: string;
  message: string;
  instanceId?: number;
  instanceName?: string;
  timestamp: string;
}

const SLOT_WARN_THRESHOLD = 0.8;
const CAPACITY_WARN_THRESHOLD = 0.7;
const ERROR_COUNT_THRESHOLD = 10;
const OFFLINE_MINUTES_THRESHOLD = 5;

let lastAlerts: Alert[] = [];

export function getActiveAlerts(): Alert[] {
  return lastAlerts;
}

export async function checkAlerts(): Promise<void> {
  const alerts: Alert[] = [];
  const now = new Date();

  try {
    // Get all instances
    const instances = await db
      .select({
        id: gatewayInstances.id,
        name: gatewayInstances.name,
        tier: gatewayInstances.tier,
        status: gatewayInstances.status,
        maxSlots: gatewayInstances.maxSlots,
        usedSlots: gatewayInstances.usedSlots,
        updatedAt: gatewayInstances.updatedAt,
      })
      .from(gatewayInstances);

    let totalSharedSlots = 0;
    let usedSharedSlots = 0;

    for (const instance of instances) {
      const utilization = instance.maxSlots > 0
        ? instance.usedSlots / instance.maxSlots
        : 0;

      // Per-instance slot utilization > 80%
      if (instance.status === "active" && utilization > SLOT_WARN_THRESHOLD) {
        alerts.push({
          id: `slot-${instance.id}`,
          level: "warn",
          condition: "slot_utilization_high",
          message: `${instance.name}: ${Math.round(utilization * 100)}% slots used (${instance.usedSlots}/${instance.maxSlots})`,
          instanceId: instance.id,
          instanceName: instance.name,
          timestamp: now.toISOString(),
        });
      }

      // Instance offline > 5 minutes
      if (instance.status === "offline") {
        const offlineMinutes = instance.updatedAt
          ? (now.getTime() - new Date(instance.updatedAt).getTime()) / 60000
          : 0;
        if (offlineMinutes > OFFLINE_MINUTES_THRESHOLD) {
          alerts.push({
            id: `offline-${instance.id}`,
            level: "error",
            condition: "instance_offline",
            message: `${instance.name}: offline for ${Math.round(offlineMinutes)} minutes`,
            instanceId: instance.id,
            instanceName: instance.name,
            timestamp: now.toISOString(),
          });
        }
      }

      // Track shared capacity
      if (instance.tier === "shared" && instance.status === "active") {
        totalSharedSlots += instance.maxSlots;
        usedSharedSlots += instance.usedSlots;
      }
    }

    // All shared instances > 70% utilized
    if (totalSharedSlots > 0 && usedSharedSlots / totalSharedSlots > CAPACITY_WARN_THRESHOLD) {
      alerts.push({
        id: "shared-capacity",
        level: "warn",
        condition: "shared_capacity_high",
        message: `Shared capacity at ${Math.round((usedSharedSlots / totalSharedSlots) * 100)}% — provision new instance soon`,
        timestamp: now.toISOString(),
      });
    }

    // Agents with > 10 errors in 24h
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const errorCounts = await db
      .select({
        agentId: agentLogs.agentId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(agentLogs)
      .where(
        and(
          eq(agentLogs.level, "error"),
          gte(agentLogs.createdAt, dayAgo),
        ),
      )
      .groupBy(agentLogs.agentId);

    for (const row of errorCounts) {
      if (row.count > ERROR_COUNT_THRESHOLD) {
        alerts.push({
          id: `agent-errors-${row.agentId}`,
          level: "warn",
          condition: "agent_error_spike",
          message: `Agent ${row.agentId}: ${row.count} errors in last 24h`,
          timestamp: now.toISOString(),
        });
      }
    }

    lastAlerts = alerts;

    if (alerts.length > 0) {
      log.warn({ alertCount: alerts.length, alerts: alerts.map(a => a.condition) }, "active alerts");
    }
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : String(err) }, "alert check failed");
  }
}
