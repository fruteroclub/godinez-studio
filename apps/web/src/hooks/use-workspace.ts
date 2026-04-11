import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Workspace } from "@godinez/types";
import { apiFetch } from "@/lib/api";

interface DashboardStats {
  activeProjects: number;
  pendingTasks: number;
  totalMessages: number;
  agent: { name: string; template: string; status: string } | null;
}

export function useWorkspaces() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Workspace[]>("/api/workspaces", { token });
    },
  });
}

export function useCreateWorkspace() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const token = await getToken();
      return apiFetch<Workspace>("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
        token,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useDashboard(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["dashboard", workspaceId],
    refetchInterval: 5000,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<DashboardStats>(
        `/api/workspaces/${workspaceId}/dashboard`,
        { token },
      );
    },
    enabled: !!workspaceId,
  });
}

interface WorkspaceUsage {
  tier: string;
  tokens: { used: number; limit: number };
  storage: { used: number; limit: number };
  members: { used: number; limit: number };
}

export function useWorkspaceUsage(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["workspace-usage", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<WorkspaceUsage>(
        `/api/workspaces/${workspaceId}/usage`,
        { token },
      );
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useUpdateWorkspace(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name?: string; tier?: string }) => {
      const token = await getToken();
      return apiFetch<Workspace>(`/api/workspaces/${workspaceId}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      qc.invalidateQueries({ queryKey: ["workspace"] });
    },
  });
}

export function useDeleteWorkspace(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiFetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}
