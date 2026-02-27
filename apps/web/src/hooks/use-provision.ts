import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface ProvisionResult {
  agent: { id: number; openclawId: string; name: string };
  conversationId: number;
}

interface ProvisionInput {
  workspaceId: number;
  userName?: string;
  agentName?: string;
  personality?: string;
  needs?: string[];
}

export function useProvision(workspaceSlug: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProvisionInput) => {
      const token = await getToken();
      return apiFetch<ProvisionResult>("/api/agents/provision", {
        method: "POST",
        body: JSON.stringify(input),
        token,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace", workspaceSlug] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
