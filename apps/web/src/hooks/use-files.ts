import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FileRecord } from "@godinez/types";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { content } from "@/lib/content";
import { trackEvent } from "@/lib/posthog";

interface StorageQuota {
  usedBytes: number;
  quotaBytes: number;
  usedPercent: number;
}

interface FileWithConversation extends FileRecord {
  isGlobal: boolean | null;
  isGlobalChat: boolean | null;
  conversationTitle: string | null;
}

export function useFiles(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["files", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      const res = await apiFetch<{ items: FileWithConversation[]; nextCursor: number | null }>(
        `/api/workspaces/${workspaceId}/files`,
        { token },
      );
      return res.items;
    },
    enabled: !!workspaceId,
  });
}

export function useStorageQuota(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["storage-quota", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<StorageQuota>(
        `/api/workspaces/${workspaceId}/storage`,
        { token },
      );
    },
    enabled: !!workspaceId,
  });
}

export function useUploadFile(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", String(workspaceId));
      return apiFetch<FileRecord>("/api/files/upload", {
        method: "POST",
        body: formData,
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files", workspaceId] });
      qc.invalidateQueries({ queryKey: ["storage-quota", workspaceId] });
      toast.success(content.toast.fileUploaded);
      trackEvent("file_uploaded");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Error al subir archivo");
    },
  });
}

export function useDeleteFile(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: number) => {
      const token = await getToken();
      return apiFetch<{ deleted: boolean }>(`/api/files/${fileId}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files", workspaceId] });
      qc.invalidateQueries({ queryKey: ["storage-quota", workspaceId] });
      toast.success("Archivo eliminado");
      trackEvent("file_deleted");
    },
    onError: () => {
      toast.error("Error al eliminar archivo");
    },
  });
}

export function useRenameFile(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileId, filename }: { fileId: number; filename: string }) => {
      const token = await getToken();
      return apiFetch<FileRecord>(`/api/files/${fileId}`, {
        method: "PATCH",
        body: JSON.stringify({ filename }),
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files", workspaceId] });
      toast.success("Archivo renombrado");
      trackEvent("file_renamed");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Error al renombrar");
    },
  });
}

export function useAssociateFile(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileId, projectId, isGlobal, conversationId, isGlobalChat }: { fileId: number; projectId?: number | null; isGlobal?: boolean; conversationId?: number | null; isGlobalChat?: boolean }) => {
      const token = await getToken();
      return apiFetch<FileRecord>(`/api/files/${fileId}`, {
        method: "PATCH",
        body: JSON.stringify({ projectId, isGlobal, conversationId, isGlobalChat }),
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files", workspaceId] });
      toast.success("Asociación actualizada");
      trackEvent("file_project_changed");
    },
    onError: () => {
      toast.error("Error al asociar");
    },
  });
}
