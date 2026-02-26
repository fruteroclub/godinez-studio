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
    onMutate: async ({ taskId, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks", workspaceId] });
      const previous = qc.getQueryData<Task[]>(["tasks", workspaceId]);
      qc.setQueryData<Task[]>(["tasks", workspaceId], (old) =>
        old?.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status,
                completedAt:
                  status === "completed" ? new Date().toISOString() : null,
              }
            : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(["tasks", workspaceId], context.previous);
      }
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
  });
}
