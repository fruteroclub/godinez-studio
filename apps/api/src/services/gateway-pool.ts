import { GatewayRelay } from "./gateway-relay";
import {
  getInstanceById,
  getInstanceByName,
  pickSharedInstance,
  pickDedicatedInstance,
  markInstanceOffline,
  markInstanceActive,
} from "../dal/instances";
import {
  POOL_IDLE_TIMEOUT_MS,
  POOL_HEALTH_INTERVAL_MS,
  LEGACY_INSTANCE_NAME,
} from "../lib/config";

const MAX_CONNECT_FAILURES = 3;

class GatewayPool {
  private relays = new Map<number, GatewayRelay>();
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private legacyInstanceId: number | null = null;
  private failureCounts = new Map<number, number>();

  constructor() {
    this.healthTimer = setInterval(() => {
      this.reapIdle();
    }, POOL_HEALTH_INTERVAL_MS);
  }

  async getRelay(instanceId: number): Promise<GatewayRelay> {
    const cached = this.relays.get(instanceId);
    if (cached?.isConnected) {
      cached.lastActivityAt = new Date();
      return cached;
    }

    // Cache miss or disconnected — load from DB and connect
    const instance = await getInstanceById(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    if (instance.status === "offline") {
      throw new Error("AGENT_OFFLINE");
    }
    if (instance.status !== "active") {
      throw new Error(`Instance ${instance.name} is ${instance.status}`);
    }

    try {
      const relay = new GatewayRelay(instanceId);
      await relay.connect(instance.url, instance.token);
      this.relays.set(instanceId, relay);
      // Reset failure count on success and ensure active status
      if (this.failureCounts.has(instanceId)) {
        this.failureCounts.delete(instanceId);
        await markInstanceActive(instanceId);
        console.log(`[GatewayPool] Instance ${instance.name} recovered, marking active`);
      }
      return relay;
    } catch (err) {
      await this.recordFailure(instanceId, instance.name);
      throw err;
    }
  }

  async getRelayForWorkspace(instanceId: number | null): Promise<GatewayRelay> {
    const resolvedId = instanceId ?? (await this.getLegacyInstanceId());
    if (resolvedId === null) {
      throw new Error("No legacy instance configured");
    }
    return this.getRelay(resolvedId);
  }

  async pickInstance(
    tier: "shared" | "dedicated",
    customerId?: number,
  ) {
    if (tier === "dedicated" && customerId) {
      return pickDedicatedInstance(customerId);
    }
    return pickSharedInstance();
  }

  releaseRelay(instanceId: number): void {
    const relay = this.relays.get(instanceId);
    if (relay) {
      relay.disconnect();
      this.relays.delete(instanceId);
    }
  }

  private async recordFailure(instanceId: number, name: string): Promise<void> {
    const count = (this.failureCounts.get(instanceId) ?? 0) + 1;
    this.failureCounts.set(instanceId, count);
    if (count >= MAX_CONNECT_FAILURES) {
      await markInstanceOffline(instanceId);
      console.log(`[GatewayPool] Instance ${name} marked offline after ${count} failures`);
    }
  }

  private reapIdle(): void {
    const now = Date.now();
    for (const [id, relay] of this.relays) {
      const idle = now - relay.lastActivityAt.getTime();
      if (idle > POOL_IDLE_TIMEOUT_MS) {
        console.log(`[GatewayPool] Reaping idle relay for instance ${id} (${idle}ms idle)`);
        relay.disconnect();
        this.relays.delete(id);
      }
    }
  }

  private async getLegacyInstanceId(): Promise<number | null> {
    if (this.legacyInstanceId !== null) return this.legacyInstanceId;
    const instance = await getInstanceByName(LEGACY_INSTANCE_NAME);
    if (instance) {
      this.legacyInstanceId = instance.id;
    }
    return this.legacyInstanceId;
  }

  shutdown(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    for (const [, relay] of this.relays) {
      relay.disconnect();
    }
    this.relays.clear();
  }
}

export const pool = new GatewayPool();
