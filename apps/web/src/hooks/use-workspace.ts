import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Workspace {
  id: number;
  name: string;
  slug: string;
  tier: string;
  status: string;
  agentId: number | null;
  agentSlot: string | null;
}

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
