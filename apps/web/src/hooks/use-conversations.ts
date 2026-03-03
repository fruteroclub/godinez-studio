import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "@godinez/types";
import { apiFetch } from "@/lib/api";

export function useConversations(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["conversations", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Conversation[]>(
        `/api/workspaces/${workspaceId}/conversations`,
        { token },
      );
    },
    enabled: !!workspaceId,
  });
}

export function useCreateConversation(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: { title?: string; projectId?: number; agentId?: number }) => {
      const token = await getToken();
      return apiFetch<Conversation>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ workspaceId, ...data }),
        token,
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["conversations", workspaceId] }),
  });
}
