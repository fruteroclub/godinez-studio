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
