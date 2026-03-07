import { useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import type { ActionCard } from "@godinez/types";
import { apiFetch } from "@/lib/api";

export function useActionExecutor(
  onUpdate: (messageId: number | string, actionId: string, action: ActionCard) => void,
) {
  const { getToken } = useAuth();
  const executingRef = useRef<Set<string>>(new Set());

  const execute = useCallback(
    async (messageId: number, actionId: string) => {
      if (executingRef.current.has(actionId)) return;
      executingRef.current.add(actionId);

      try {
        const token = await getToken();
        const { action } = await apiFetch<{ action: ActionCard }>(
          `/api/chat/actions/${messageId}/execute`,
          {
            method: "POST",
            body: JSON.stringify({ actionId }),
            token,
          },
        );
        onUpdate(messageId, actionId, action);
      } catch (err) {
        // Server already persisted the error status — just surface the message.
        // We only update the status field; the original action data stays intact
        // in the parent's message state (onUpdate merges by actionId).
        const errorMsg = err instanceof Error ? err.message : "Error";
        onUpdate(messageId, actionId, {
          status: "error",
          error: errorMsg,
        } as ActionCard);
      } finally {
        executingRef.current.delete(actionId);
      }
    },
    [getToken, onUpdate],
  );

  return { execute };
}
