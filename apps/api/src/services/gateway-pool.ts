import { GatewayRelay } from "./gateway-relay";
import {
  getInstanceById,
  getInstanceByName,
  pickSharedInstance,
  pickDedicatedInstance,
} from "../dal/instances";
import {
  POOL_IDLE_TIMEOUT_MS,
  POOL_HEALTH_INTERVAL_MS,
  LEGACY_INSTANCE_NAME,
} from "../lib/config";

class GatewayPool {
  private relays = new Map<number, GatewayRelay>();
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private legacyInstanceId: number | null = null;

  constructor() {
    // Start idle reaping + health checks
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
    if (instance.status !== "active") {
      throw new Error(`Instance ${instance.name} is ${instance.status}`);
    }

    const relay = new GatewayRelay(instanceId);
    await relay.connect(instance.url, instance.token);
    this.relays.set(instanceId, relay);
    return relay;
  }

  async getRelayForWorkspace(instanceId: number | null): Promise<GatewayRelay> {
    // Workspaces with null instanceId fall back to legacy instance
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
