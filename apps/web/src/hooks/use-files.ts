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

export function useFiles(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["files", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      const res = await apiFetch<{ items: FileRecord[]; nextCursor: number | null }>(
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
  });
}
