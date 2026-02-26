import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Conversation {
  id: number;
  title: string | null;
  channel: string;
  lastMessageAt: string | null;
  createdAt: string;
}

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
