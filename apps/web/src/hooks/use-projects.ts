import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, Task, FileRecord, Conversation } from "@godinez/types";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { content } from "@/lib/content";
import { trackEvent } from "@/lib/posthog";

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
    staleTime: 0,
    refetchOnMount: true,
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
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useProjectTasks(projectId: string | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["projectTasks", projectId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Task[]>(`/api/projects/${projectId}/tasks`, { token });
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useProjectFiles(projectId: string | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["projectFiles", projectId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<FileRecord[]>(`/api/projects/${projectId}/files`, {
        token,
      });
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

export function useProjectConversations(projectId: string | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["projectConversations", projectId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Conversation[]>(
        `/api/projects/${projectId}/conversations`,
        { token },
      );
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: true,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      toast.success(content.toast.projectCreated);
      trackEvent("project_created");
    },
  });
}

export function useDeleteProject(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: number) => {
      const token = await getToken();
      return apiFetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
      toast.success(content.toast.projectDeleted ?? "Proyecto eliminado");
      trackEvent("project_deleted");
    },
  });
}
