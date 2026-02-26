import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import type { ActionCard } from "@godinez/types";
import { apiFetch } from "@/lib/api";
import { connectSSE } from "@/lib/sse";
import { parseActionBlocks } from "@/lib/action-parser";

export interface ChatMessage {
  id: number | string;
  role: "user" | "agent" | "system";
  content: string;
  streaming?: boolean;
  actions?: ActionCard[];
  createdAt?: string;
}

export function useChat(
  conversationId: number,
  workspaceId: number,
  options?: { onComplete?: () => void },
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { getToken } = useAuth();

  // Load history on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const data = await apiFetch<{
          messages: Array<{
            id: number;
            role: "user" | "agent" | "system";
            content: string;
            metadata: string | null;
            createdAt?: string;
          }>;
        }>(`/api/chat/history/${conversationId}`, { token });
        if (!cancelled) {
          setMessages(
            data.messages.map((m) => {
              let actions: ActionCard[] | undefined;
              if (m.metadata) {
                try {
                  const meta = JSON.parse(m.metadata);
                  if (Array.isArray(meta.actions)) {
                    actions = meta.actions;
                  }
                } catch {
                  // invalid metadata JSON
                }
              }
              return {
                id: m.id,
                role: m.role,
                content: m.content,
                actions,
                createdAt: m.createdAt,
              };
            }),
          );
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, getToken]);

  const updateAction = useCallback(
    (messageId: number | string, actionId: string, updated: ActionCard) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            actions: m.actions?.map((a) =>
              a.id === actionId ? { ...a, ...updated } : a,
            ),
          };
        }),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const token = await getToken();
      const tempUserId = `temp-${Date.now()}`;
      const tempAgentId = `temp-agent-${Date.now()}`;

      // Optimistic user message
      setMessages((prev) => [
        ...prev,
        { id: tempUserId, role: "user", content },
      ]);

      // POST to send
      const { runId, messageId } = await apiFetch<{
        runId: string;
        messageId: number;
      }>("/api/chat/send", {
        method: "POST",
        body: JSON.stringify({ conversationId, workspaceId, content }),
        token,
      });

      // Replace temp user message with real ID
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempUserId ? { ...m, id: messageId } : m,
        ),
      );

      // Add empty agent message
      setMessages((prev) => [
        ...prev,
        { id: tempAgentId, role: "agent", content: "", streaming: true },
      ]);
      setIsStreaming(true);

      // Connect SSE (pass token via query param — EventSource can't send headers)
      connectSSE(
        runId,
        {
          onDelta: (text) => {
            // Parse action blocks from streaming text for live preview
            const streamActions = parseActionBlocks(text);
            const liveActions: ActionCard[] | undefined =
              streamActions.length > 0
                ? streamActions.map((b) => ({ ...b, status: "pending" as const }))
                : undefined;

            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAgentId
                  ? { ...m, content: text, actions: liveActions }
                  : m,
              ),
            );
          },
          onDone: (text, agentMessageId, actions) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAgentId
                  ? {
                      ...m,
                      id: agentMessageId ?? tempAgentId,
                      content: text,
                      streaming: false,
                      actions,
                    }
                  : m,
              ),
            );
            setIsStreaming(false);
            options?.onComplete?.();
          },
          onError: () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAgentId
                  ? { ...m, content: "Error al obtener respuesta", streaming: false }
                  : m,
              ),
            );
            setIsStreaming(false);
          },
        },
        token,
      );
    },
    [conversationId, workspaceId, getToken],
  );

  return { messages, sendMessage, isStreaming, isLoading, updateAction };
}
