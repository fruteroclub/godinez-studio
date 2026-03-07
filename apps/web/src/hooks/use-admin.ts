import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AdminOverviewStats,
  AdminWorkspaceRow,
  AdminInstanceRow,
  AdminInstanceHealth,
  AdminGrowthPoint,
} from "@godinez/types";
import { apiFetch } from "@/lib/api";

export function useAdminOverview() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<AdminOverviewStats>("/api/admin/overview", { token });
    },
  });
}

export function useAdminWorkspaces(cursor?: number) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "workspaces", cursor],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", String(cursor));
      return apiFetch<{ data: AdminWorkspaceRow[]; nextCursor: number | null }>(
        `/api/admin/workspaces?${params}`,
        { token },
      );
    },
  });
}

export function useAdminInstances() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "instances"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<AdminInstanceRow[]>("/api/admin/instances", { token });
    },
  });
}

export function useAdminUsage(period: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "usage", period],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<{
        data: Array<{
          id: number;
          name: string;
          slug: string;
          tier: string;
          ownerEmail: string | null;
          tokenUsage: number;
          storageBytes: number;
          messageCount: number;
        }>;
        nextCursor: number | null;
      }>(`/api/admin/usage?period=${period}`, { token });
    },
  });
}

export function useAdminGrowth(period: "7d" | "30d" | "90d") {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "growth", period],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<{ period: string; data: AdminGrowthPoint[] }>(
        `/api/admin/growth?period=${period}`,
        { token },
      );
    },
  });
}

export function useCreateInstance() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      url: string;
      token: string;
      tier?: "shared" | "dedicated";
      maxSlots?: number;
      workspaceBase?: string;
      region?: string;
    }) => {
      const token = await getToken();
      return apiFetch<AdminInstanceRow>("/api/admin/instances", {
        token,
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "instances"] });
    },
  });
}

export function useUpdateInstance() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; status?: string }) => {
      const token = await getToken();
      return apiFetch<AdminInstanceRow>(`/api/admin/instances/${id}`, {
        token,
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

interface ReferralCode {
  id: number;
  code: string;
  email: string;
  name: string | null;
  used: boolean;
  source: string | null;
  expiresAt: string;
  createdAt: string;
  usedAt: string | null;
}

export function useAdminReferralCodes() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "referral-codes"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<ReferralCode[]>("/api/admin/referral-codes", { token });
    },
  });
}

export function useCreateReferralCode() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; name?: string; source?: string }) => {
      const token = await getToken();
      return apiFetch<ReferralCode>("/api/admin/referral-codes", {
        token,
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "referral-codes"] });
    },
  });
}

interface Alert {
  id: string;
  level: "warn" | "error";
  condition: string;
  message: string;
  instanceId?: number;
  instanceName?: string;
  timestamp: string;
}

export function useAdminCapacity() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "capacity"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<{
        instances: Array<{
          id: number; name: string; tier: string; status: string;
          maxSlots: number; usedSlots: number; utilization: number; region: string | null;
        }>;
        aggregate: { totalSlots: number; usedSlots: number; utilization: number };
        trends: {
          dailyActiveWorkspaces: Array<{ day: string; count: number }>;
          dailyTokens: Array<{ day: string; tokens: number }>;
        };
        projection: {
          weeklyGrowthRate: number;
          remainingSlots: number;
          daysUntilFull: number | null;
        };
      }>("/api/admin/capacity", { token });
    },
  });
}

export function useAdminAgentActivity() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "agent-activity"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<{
        agents: Array<{
          agentId: number; workspaceId: number;
          totalEvents: number; totalTokens: number; errorCount: number;
          lastActivity: string;
        }>;
        dailyEvents: Array<{ day: string; events: number; tokens: number }>;
        summary: {
          totalEvents: number; totalTokens: number; errorCount: number; activeAgents: number;
        };
      }>("/api/admin/agent-activity", { token });
    },
  });
}

export function useAdminAlerts() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "alerts"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Alert[]>("/api/admin/alerts", { token });
    },
    refetchInterval: 60_000,
  });
}

export function useInstanceHealth(id: number | null) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["admin", "instance-health", id],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<AdminInstanceHealth>(
        `/api/admin/instances/${id}/health`,
        { token },
      );
    },
    enabled: id !== null,
  });
}
