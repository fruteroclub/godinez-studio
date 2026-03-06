import { useAuth } from "@clerk/clerk-react";
import {
  useQuery,
  useQueries,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { content } from "@/lib/content";

export interface AgentFile {
  name: string;
  content: string;
  path?: string;
  size?: number;
  updatedAtMs?: number;
}

const CONFIG_FILES = ["SOUL.md", "IDENTITY.md", "TOOLS.md"] as const;
const STALE_TIME = 5 * 60_000; // 5 min — files rarely change

function agentFileQueryOptions(
  agentId: number | null,
  filename: string,
  getToken: () => Promise<string | null>,
) {
  return {
    queryKey: ["agent-file", agentId, filename],
    queryFn: async () => {
      const token = await getToken();
      const data = await apiFetch<{ file: AgentFile }>(
        `/api/agents/${agentId}/files/${filename}`,
        { token },
      );
      return data.file;
    },
    enabled: !!agentId,
    staleTime: STALE_TIME,
  };
}

/** Prefetch all 3 config files in parallel on mount */
export function usePrefetchAgentFiles(agentId: number | null) {
  const { getToken } = useAuth();
  return useQueries({
    queries: CONFIG_FILES.map((name) =>
      agentFileQueryOptions(agentId, name, getToken),
    ),
  });
}

/** Read a single agent file (hits cache if prefetched) */
export function useAgentFile(agentId: number | null, filename: string) {
  const { getToken } = useAuth();
  return useQuery<AgentFile>(
    agentFileQueryOptions(agentId, filename, getToken),
  );
}

export function useUpdateAgentFile(agentId: number | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      filename,
      content,
    }: {
      filename: string;
      content: string;
    }) => {
      const token = await getToken();
      return apiFetch<{ file: AgentFile }>(
        `/api/agents/${agentId}/files/${filename}`,
        {
          method: "PUT",
          body: JSON.stringify({ content }),
          token,
        },
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["agent-file", agentId, variables.filename],
      });
    },
  });
}

export interface AgentConfigInput {
  agentName?: string;
  userRole?: string;
  businessDescription?: string;
  personality?: string;
  needs?: string[];
  customInstructions?: string;
}

export function useUpdateAgentConfig(agentId: number | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AgentConfigInput) => {
      const token = await getToken();
      return apiFetch<Record<string, unknown>>(
        `/api/agents/${agentId}/config`,
        {
          method: "PUT",
          body: JSON.stringify(input),
          token,
        },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent", agentId] });
      qc.invalidateQueries({
        queryKey: ["agent-file", agentId, "SOUL.md"],
      });
      toast.success(content.toast.configSaved);
    },
  });
}

export function useResetSoul(agentId: number | null) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiFetch<{ ok: boolean }>(
        `/api/agents/${agentId}/reinject-soul`,
        { method: "POST", token },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["agent-file", agentId, "SOUL.md"],
      });
    },
  });
}
