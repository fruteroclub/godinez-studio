import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task, TaskStatus } from "@godinez/types";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { content } from "@/lib/content";

export function useTasks(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      const res = await apiFetch<{ items: Task[]; nextCursor: number | null }>(
        `/api/workspaces/${workspaceId}/tasks`,
        { token },
      );
      return res.items;
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      toast.success(content.toast.taskCreated);
    },
  });
}

export function useUpdateTask(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      ...data
    }: {
      taskId: number;
      title?: string;
      description?: string;
      priority?: string;
      projectId?: number | null;
    }) => {
      const token = await getToken();
      return apiFetch<Task>(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
  });
}

export function useUpdateTaskProject(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      projectId,
    }: {
      taskId: number;
      projectId: number | null;
    }) => {
      const token = await getToken();
      return apiFetch<Task>(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ projectId }),
        token,
      });
    },
    onMutate: async ({ taskId, projectId }) => {
      await qc.cancelQueries({ queryKey: ["tasks", workspaceId] });
      const previous = qc.getQueryData<Task[]>(["tasks", workspaceId]);
      qc.setQueryData<Task[]>(["tasks", workspaceId], (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, projectId } : t)),
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

export function useUpdateTaskStatus(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: number;
      status: TaskStatus;
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
