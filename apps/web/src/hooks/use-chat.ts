import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "@/lib/api";
import { connectSSE } from "@/lib/sse";

interface Message {
  id: number | string;
  role: "user" | "agent" | "system";
  content: string;
  streaming?: boolean;
  createdAt?: string;
}

export function useChat(conversationId: number, workspaceId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { getToken } = useAuth();

  // Load history on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const data = await apiFetch<{ messages: Message[] }>(
          `/api/chat/history/${conversationId}`,
          { token },
        );
        if (!cancelled) {
          setMessages(data.messages);
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
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAgentId ? { ...m, content: text } : m,
              ),
            );
          },
          onDone: (text, agentMessageId) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAgentId
                  ? {
                      ...m,
                      id: agentMessageId ?? tempAgentId,
                      content: text,
                      streaming: false,
                    }
                  : m,
              ),
            );
            setIsStreaming(false);
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

  return { messages, sendMessage, isStreaming, isLoading };
}
