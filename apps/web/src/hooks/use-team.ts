import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Member {
  id: number;
  userId: number;
  role: string;
  user: { id: number; name: string | null; email: string; avatarUrl: string | null };
}

export function useMembers(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Member[]>(`/api/workspaces/${workspaceId}/members`, {
        token,
      });
    },
    enabled: !!workspaceId,
  });
}

export function useInviteMember(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; role?: string }) => {
      const token = await getToken();
      return apiFetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["members", workspaceId] }),
  });
}

export function useRemoveMember(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: number) => {
      const token = await getToken();
      return apiFetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["members", workspaceId] }),
  });
}
