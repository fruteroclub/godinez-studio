import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: string;
  completedAt: string | null;
}

export function useTasks(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Task[]>(`/api/workspaces/${workspaceId}/tasks`, {
        token,
      });
    },
    enabled: !!workspaceId,
  });
}

export function useCreateTask(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      priority?: string;
      projectId?: number;
    }) => {
      const token = await getToken();
      return apiFetch<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ ...data, workspaceId }),
        token,
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
  });
}

export function useUpdateTaskStatus(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: number;
      status: string;
    }) => {
      const token = await getToken();
      return apiFetch<Task>(`/api/tasks/${taskId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
        token,
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
  });
}
