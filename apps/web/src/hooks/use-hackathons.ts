import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "@/lib/api";

export interface HackathonPhase {
  number: number;
  status: "done" | "current" | "pending";
  notes: string[];
  completedAt?: string;
}

export interface HackathonData {
  id: number;
  workspaceId: number;
  active: boolean;
  name: string;
  deadline: string;
  hackathonUrl?: string;
  resourcesUrl?: string;
  currentPhase: number;
  phases: HackathonPhase[];
  createdAt: string;
  updatedAt: string;
}

export function useHackathons(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // Query ALL hackathons for workspace
  const { data: hackathons, isLoading, refetch } = useQuery({
    queryKey: ["hackathons", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const token = await getToken();
      const data = await apiFetch<HackathonData[]>(
        `/api/hackathons/list/${workspaceId}`,
        { token }
      );
      return data;
    },
    enabled: !!workspaceId,
  });

  // Invalidate + refetch helper
  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["hackathons", workspaceId] });
    await queryClient.invalidateQueries({ queryKey: ["conversations", workspaceId] });
    await refetch();
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      deadline: string;
      hackathonUrl?: string;
      resourcesUrl?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const token = await getToken();
      return apiFetch<HackathonData>("/api/hackathons", {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          ...data,
        }),
        token,
      });
    },
    onSuccess: invalidateAll,
  });

  // Toggle mutation (by hackathon ID)
  const toggleMutation = useMutation({
    mutationFn: async (hackathonId: number) => {
      const token = await getToken();
      return apiFetch<HackathonData>(`/api/hackathons/${hackathonId}/toggle`, {
        method: "POST",
        token,
      });
    },
    onSuccess: invalidateAll,
  });

  // Delete mutation (by hackathon ID)
  const deleteMutation = useMutation({
    mutationFn: async (hackathonId: number) => {
      const token = await getToken();
      return apiFetch(`/api/hackathons/${hackathonId}`, {
        method: "DELETE",
        token,
      });
    },
    onSuccess: invalidateAll,
  });

  // Update phase mutation (by hackathon ID)
  const updatePhaseMutation = useMutation({
    mutationFn: async (data: {
      hackathonId: number;
      phaseNumber: number;
      status: "done" | "current" | "pending";
      notes?: string[];
    }) => {
      const token = await getToken();
      return apiFetch<HackathonData>(`/api/hackathons/${data.hackathonId}/phase`, {
        method: "POST",
        body: JSON.stringify({
          phaseNumber: data.phaseNumber,
          status: data.status,
          notes: data.notes,
        }),
        token,
      });
    },
    onSuccess: invalidateAll,
  });

  // Add note mutation (by hackathon ID)
  const addNoteMutation = useMutation({
    mutationFn: async (data: { hackathonId: number; phaseNumber: number; note: string }) => {
      const token = await getToken();
      return apiFetch<HackathonData>(`/api/hackathons/${data.hackathonId}/note`, {
        method: "POST",
        body: JSON.stringify({
          phaseNumber: data.phaseNumber,
          note: data.note,
        }),
        token,
      });
    },
    onSuccess: invalidateAll,
  });

  // Helper functions
  const create = async (data: {
    name: string;
    deadline: string;
    hackathonUrl?: string;
    resourcesUrl?: string;
  }) => {
    return createMutation.mutateAsync(data);
  };

  const toggle = async (hackathonId: number) => {
    return toggleMutation.mutateAsync(hackathonId);
  };

  const remove = async (hackathonId: number) => {
    return deleteMutation.mutateAsync(hackathonId);
  };

  const updatePhase = async (
    hackathonId: number,
    phaseNumber: number,
    status: "done" | "current" | "pending",
    notes?: string[]
  ) => {
    return updatePhaseMutation.mutateAsync({ hackathonId, phaseNumber, status, notes });
  };

  const addNote = async (hackathonId: number, phaseNumber: number, note: string) => {
    return addNoteMutation.mutateAsync({ hackathonId, phaseNumber, note });
  };

  // Utility: get time remaining for a hackathon
  const getTimeRemaining = (hackathon: HackathonData) => {
    if (!hackathon?.deadline) return null;
    const deadline = new Date(hackathon.deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return "¡Tiempo terminado!";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  // Utility: get progress for a hackathon
  const getProgress = (hackathon: HackathonData) => {
    if (!hackathon?.phases) return 0;
    const done = hackathon.phases.filter((p) => p.status === "done").length;
    return Math.round((done / 9) * 100);
  };

  return {
    hackathons: hackathons ?? [],
    isLoading,
    create,
    toggle,
    remove,
    updatePhase,
    addNote,
    getTimeRemaining,
    getProgress,
  };
}

export const PHASE_NAMES = [
  "Cargar Info",
  "Idear",
  "Validar",
  "Planear MVP",
  "Construir",
  "Testear",
  "Deploy",
  "Pitch",
  "Entregar",
];
