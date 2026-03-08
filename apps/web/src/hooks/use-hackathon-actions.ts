import { Sentry } from "@/lib/sentry";
import { useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import type { ActionCard } from "@godinez/types";
import { apiFetch } from "@/lib/api";

interface HackathonActionPayload {
  phase?: number;
  phaseNumber?: number;
  status?: "done" | "current" | "pending";
  note?: string;
}

export function useHackathonActions(
  hackathonId: number | null,
  onHackathonUpdate?: () => void,
) {
  const { getToken } = useAuth();
  const executedRef = useRef<Set<string>>(new Set());

  const executeHackathonAction = useCallback(
    async (action: ActionCard): Promise<boolean> => {
      console.log("[HackathonActions] executeHackathonAction called:", { 
        hackathonId, 
        actionType: action.type, 
        actionId: action.id,
        payload: action.payload 
      });
      
      if (!hackathonId) {
        console.log("[HackathonActions] No hackathonId, skipping");
        return false;
      }
      if (executedRef.current.has(action.id)) {
        console.log("[HackathonActions] Already executed:", action.id);
        return false;
      }
      executedRef.current.add(action.id);
      console.log("[HackathonActions] Executing action:", action.type);

      const token = await getToken();
      const payload = action.payload as HackathonActionPayload;

      try {
        if (action.type === "hackathon_advance") {
          const rawPhase = payload.phase ?? payload.phaseNumber ?? 0;
          const phaseNumber = typeof rawPhase === "string" ? parseInt(rawPhase, 10) : rawPhase;
          const status = payload.status ?? "current";
          
          console.log("[HackathonActions] Advancing to phase:", phaseNumber, "status:", status);
          
          const advanceBody = { phaseNumber: Number(phaseNumber), status };
          console.log("[HackathonActions] Sending phase update:", advanceBody);
          await apiFetch(`/api/hackathons/${hackathonId}/phase`, {
            method: "POST",
            body: JSON.stringify(advanceBody),
            token,
          });
          
          // Mark previous phases as done
          for (let i = 0; i < phaseNumber; i++) {
            const prevBody = { phaseNumber: Number(i), status: "done" };
            console.log("[HackathonActions] Marking phase done:", prevBody);
            await apiFetch(`/api/hackathons/${hackathonId}/phase`, {
              method: "POST",
              body: JSON.stringify(prevBody),
              token,
            });
          }
          
          onHackathonUpdate?.();
          return true;
        } else if (action.type === "hackathon_note") {
          const rawPhase = payload.phase ?? payload.phaseNumber ?? 0;
          const phaseNumber = typeof rawPhase === "string" ? parseInt(rawPhase, 10) : rawPhase;
          const note = payload.note ?? "";
          
          console.log("[HackathonActions] Adding note to phase:", phaseNumber, "note:", note);
          
          if (note && note.trim()) {
            const noteBody = { phaseNumber: Number(phaseNumber), note: String(note).trim() };
            console.log("[HackathonActions] Sending note:", noteBody);
            await apiFetch(`/api/hackathons/${hackathonId}/note`, {
              method: "POST",
              body: JSON.stringify(noteBody),
              token,
            });
            onHackathonUpdate?.();
            return true;
          } else {
            console.log("[HackathonActions] Skipping empty note");
            return false;
          }
        }
        return false;
      } catch (err) {
        console.error("Hackathon action failed:", err);
        Sentry.captureException(err, { tags: { feature: "hackathon", action: action.type } });
        return false;
      }
    },
    [hackathonId, getToken, onHackathonUpdate],
  );

  return { executeHackathonAction };
}
