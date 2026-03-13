import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

// Types
interface ErrorChain {
  gateway?: string;
  instance?: string;
  agent?: string;
  subagent?: string;
  workspaceId?: number;
  workspaceSlug?: string;
  conversationId?: number;
}

interface SystemHealth {
  status: "healthy" | "warning" | "critical";
  totalErrors: number;
  unresolvedErrors: number;
  errorsToday: number;
  criticalErrors: number;
  agentErrors: number;
  checkedAt: string;
}

interface ErrorStats {
  id: number;
  code: string;
  totalCount: number;
  todayCount: number;
  affectedUsers: number;
  affectedWorkspaces: number;
  affectedAgents: string[] | null;
  currentPriority: string;
  lastOccurrence: string | null;
  updatedAt: string;
}

interface ErrorItem {
  id: number;
  code: string;
  message: string;
  userMessage: string;
  priority: string;
  chain: ErrorChain | null;
  userId: string | null;
  path: string | null;
  resolved: boolean;
  createdAt: string;
}

interface FeedbackItem {
  id: number;
  type: "bug" | "feature" | "comment";
  message: string;
  email: string | null;
  status: string;
  priority: string | null;
  createdAt: string;
}

interface DashboardSummary {
  health: SystemHealth;
  errorStats: ErrorStats[];
  feedback: {
    total: number;
    new: number;
    reviewing: number;
  };
}

// ============================================
// HOOKS
// ============================================

export function useDashboard() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["errors", "dashboard"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<DashboardSummary>("/api/admin/errors/dashboard", { token });
    },
    refetchInterval: 30000,
  });
}

export function useHealth() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["errors", "health"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<SystemHealth>("/api/admin/errors/health", { token });
    },
    refetchInterval: 30000,
  });
}

export function useErrors(options?: { resolved?: boolean; priority?: string; agent?: string }) {
  const { getToken } = useAuth();
  const params = new URLSearchParams();
  if (options?.resolved !== undefined) params.set("resolved", String(options.resolved));
  if (options?.priority) params.set("priority", options.priority);
  if (options?.agent) params.set("agent", options.agent);

  return useQuery({
    queryKey: ["errors", "list", options],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<ErrorItem[]>(`/api/admin/errors?${params}`, { token });
    },
  });
}

export function useErrorStats() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["errors", "stats"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<ErrorStats[]>("/api/admin/errors/stats", { token });
    },
  });
}

export function useFeedback(options?: { type?: string; status?: string }) {
  const { getToken } = useAuth();
  const params = new URLSearchParams();
  if (options?.type) params.set("type", options.type);
  if (options?.status) params.set("status", options.status);

  return useQuery({
    queryKey: ["errors", "feedback", options],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<FeedbackItem[]>(`/api/admin/errors/feedback?${params}`, { token });
    },
  });
}

export function useResolveError() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      return apiFetch(`/api/admin/errors/${id}/resolve`, {
        token,
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["errors"] });
    },
  });
}

export function useUpdateFeedbackStatus() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      response,
    }: {
      id: number;
      status: string;
      response?: string;
    }) => {
      const token = await getToken();
      return apiFetch(`/api/admin/errors/feedback/${id}`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ status, response }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["errors", "feedback"] });
      queryClient.invalidateQueries({ queryKey: ["errors", "dashboard"] });
    },
  });
}

export function useDeleteFeedback() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      return apiFetch(`/api/admin/errors/feedback/${id}`, {
        token,
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["errors", "feedback"] });
      queryClient.invalidateQueries({ queryKey: ["errors", "dashboard"] });
    },
  });
}

export function useSubmitFeedback() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      type: "bug" | "feature" | "comment";
      message: string;
      email?: string;
    }) => {
      const token = await getToken();
      return apiFetch("/api/admin/errors/feedback", {
        token,
        method: "POST",
        body: JSON.stringify({
          ...data,
          path: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
    },
  });
}

// Helper function to get overall health status color
export function getHealthColor(status: string) {
  switch (status) {
    case "healthy":
      return { bg: "bg-green-500/20", text: "text-green-400", label: "Saludable" };
    case "warning":
      return { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Advertencia" };
    case "critical":
      return { bg: "bg-red-500/20", text: "text-red-400", label: "Crítico" };
    default:
      return { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Desconocido" };
  }
}

// Helper function to get priority color
export function getPriorityColor(priority: string) {
  switch (priority) {
    case "P0":
      return "bg-red-500/20 text-red-400";
    case "P1":
      return "bg-orange-500/20 text-orange-400";
    case "P2":
      return "bg-yellow-500/20 text-yellow-400";
    case "P3":
      return "bg-zinc-500/20 text-zinc-400";
    default:
      return "bg-zinc-500/20 text-zinc-400";
  }
}
