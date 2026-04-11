export interface TierLimits {
  monthlyTokens: number;
  storageBytes: number;
  maxAgents: number;
  maxMembers: number;
}

export const TIER_LIMITS: Record<string, TierLimits> = {
  beta_tester: {
    monthlyTokens: 500_000,
    storageBytes: 500 * 1024 * 1024, // 500 MB
    maxAgents: 1,
    maxMembers: 5,
  },
  starter: {
    monthlyTokens: 1_000_000,
    storageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    maxAgents: 2,
    maxMembers: 10,
  },
  pro: {
    monthlyTokens: 5_000_000,
    storageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
    maxAgents: 5,
    maxMembers: 25,
  },
};

export function getTierLimits(tier: string): TierLimits {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.beta_tester;
}

/** Maps workspace tier → instance tier for routing decisions. */
export const TIER_INSTANCE_MAP: Record<string, "shared" | "dedicated"> = {
  beta_tester: "shared",
  starter: "shared",
  pro: "dedicated",
};

export function getInstanceTier(workspaceTier: string): "shared" | "dedicated" {
  return TIER_INSTANCE_MAP[workspaceTier] ?? "shared";
}
