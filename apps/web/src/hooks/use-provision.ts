import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface ProvisionResult {
  agent: { id: number; openclawId: string; name: string };
  conversationId: number;
}

export function useProvision(workspaceSlug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: number) => {
      const token = await getToken();
      return apiFetch<ProvisionResult>("/api/agents/provision", {
        method: "POST",
        body: JSON.stringify({ workspaceId }),
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", workspaceSlug] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
