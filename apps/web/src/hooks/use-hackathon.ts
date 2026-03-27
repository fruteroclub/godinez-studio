import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export interface HackathonPhase {
  number: number;
  status: "done" | "current" | "pending";
  notes: string[];
  completedAt?: string;
}

export interface HackathonData {
  _id: string;
  workspaceId: string;
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

// workspaceSlug kept for backward compatibility but no longer used
export function useHackathon(workspaceId: string | undefined, _workspaceSlug?: string) {
  const hackathon = useQuery(
    api.hackathon.getByWorkspace,
    workspaceId ? { workspaceId } : "skip"
  );

  const createMutation = useMutation(api.hackathon.create);
  const toggleMutation = useMutation(api.hackathon.toggleActive);
  const updatePhaseMutation = useMutation(api.hackathon.updatePhase);
  const addNoteMutation = useMutation(api.hackathon.addNote);

  const create = async (data: {
    name: string;
    deadline: string;
    hackathonUrl?: string;
    resourcesUrl?: string;
  }) => {
    if (!workspaceId) return;
    return createMutation({ workspaceId, ...data });
  };

  const toggle = async () => {
    if (!workspaceId) return;
    return toggleMutation({ workspaceId });
  };

  const updatePhase = async (
    phaseNumber: number,
    status: "done" | "current" | "pending",
    notes?: string[]
  ) => {
    if (!workspaceId) return;
    return updatePhaseMutation({ workspaceId, phaseNumber, status, notes });
  };

  const addNote = async (phaseNumber: number, note: string) => {
    if (!workspaceId) return;
    return addNoteMutation({ workspaceId, phaseNumber, note });
  };

  const getTimeRemaining = () => {
    if (!hackathon?.deadline) return null;
    const deadline = new Date(hackathon.deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return "¡Tiempo terminado!";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return days + "d " + (hours % 24) + "h restantes";
    return hours + "h restantes";
  };

  const getProgress = () => {
    if (!hackathon?.phases) return 0;
    const done = hackathon.phases.filter((p) => p.status === "done").length;
    return Math.round((done / 9) * 100);
  };

  return {
    hackathon: hackathon as HackathonData | null | undefined,
    isLoading: hackathon === undefined,
    create,
    toggle,
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
