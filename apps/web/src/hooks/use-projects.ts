import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
}

interface ProjectDetail extends Project {
  stats: {
    totalTasks: number;
    completedTasks: number;
    conversations: number;
    files: number;
  };
}

export function useProjects(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Project[]>(
        `/api/workspaces/${workspaceId}/projects`,
        { token },
      );
    },
    enabled: !!workspaceId,
  });
}

export function useProject(projectId: string | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<ProjectDetail>(`/api/projects/${projectId}`, { token });
    },
    enabled: !!projectId,
  });
}

export function useCreateProject(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const token = await getToken();
      return apiFetch<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ ...data, workspaceId }),
        token,
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] }),
  });
}
