import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface FileRecord {
  id: number;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  url: string;
  createdAt: string;
}

export function useFiles(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["files", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<FileRecord[]>(`/api/workspaces/${workspaceId}/files`, {
        token,
      });
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["files", workspaceId] }),
  });
}
