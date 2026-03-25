import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import type { ActionCard } from "@godinez/types";
import { apiFetch } from "@/lib/api";
import { connectSSE, type SSEStatusInfo } from "@/lib/sse";
import { parseActionBlocks } from "@/lib/action-parser";
import { trackEvent } from "@/lib/posthog";

export interface ChatAttachment {
  fileId: number;
  url: string;
  mimeType: string;
  filename: string;
}

export interface ChatMessage {
  id: number | string;
  role: "user" | "agent" | "system";
  content: string;
  streaming?: boolean;
  actions?: ActionCard[];
  attachments?: ChatAttachment[];
  createdAt?: string;
}

export type ConnectionStatus = "idle" | "connected" | "reconnecting" | "disconnected" | "timeout";

export interface RetryInfo {
  retryCount: number;
  maxRetries: number;
  startedAt: number;
}

export function useChat(
  conversationId: number,
  workspaceId: number,
  options?: { onComplete?: () => void; hackathonContext?: { name: string; deadline: string; currentPhase: number; phases: Array<{ number: number; status: string; notes: string[] }>; hackathonUrl?: string; resourcesUrl?: string; } | null },
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [agentOffline, setAgentOffline] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [retryInfo, setRetryInfo] = useState<RetryInfo | null>(null);
  const { getToken } = useAuth();
  const sseCleanupRef = useRef<(() => void) | null>(null);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      sseCleanupRef.current?.();
      sseCleanupRef.current = null;
    };
  }, []);

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
              let attachments: ChatAttachment[] | undefined;
              if (m.metadata) {
                try {
                  const meta = JSON.parse(m.metadata);
                  if (Array.isArray(meta.actions)) {
                    actions = meta.actions;
                  }
                  if (Array.isArray(meta.attachments)) {
                    attachments = meta.attachments;
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
                attachments,
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
    async (
      content: string,
      hackathonContext?: { name: string; deadline: string; currentPhase: number; phases: Array<{ number: number; status: string; notes: string[] }>; hackathonUrl?: string; resourcesUrl?: string; active?: boolean; timeRemaining?: string; } | null,
      attachments?: ChatAttachment[],
    ) => {
      const token = await getToken();
      const tempUserId = `temp-${Date.now()}`;
      const tempAgentId = `temp-agent-${Date.now()}`;

      // Optimistic user message (with attachments)
      setMessages((prev) => [
        ...prev,
        { id: tempUserId, role: "user", content, attachments },
      ]);
      trackEvent("chat_message_sent", { conversationId, workspaceId, hasAttachment: !!attachments?.length });

      // POST to send
      let runId: string;
      let messageId: number;
      try {
        const res = await apiFetch<{ runId: string; messageId: number }>(
          "/api/chat/send",
          {
            method: "POST",
            body: JSON.stringify({
              conversationId,
              workspaceId,
              content,
              attachments,
              hackathonContext: hackathonContext || undefined,
            }),
            token,
          },
        );
        runId = res.runId;
        messageId = res.messageId;
        setAgentOffline(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("AGENT_OFFLINE") || msg.includes("GATEWAY_OFFLINE")) {
          setAgentOffline(true);
          // Remove the optimistic user message
          setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
        }
        return;
      }

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

      // Clean up any previous SSE connection
      sseCleanupRef.current?.();

      // Connect SSE (pass token via query param — EventSource can't send headers)
      sseCleanupRef.current = connectSSE(
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
          onDone: async (text, agentMessageId, actions) => {
            // Ensure message is persisted — only send content if SSE didn't provide a messageId
            let finalMessageId = agentMessageId;
            try {
              const persistRes = await apiFetch<{ persisted: boolean; messageId: number; alreadyExisted: boolean }>(
                "/api/chat/persist-response",
                {
                  method: "POST",
                  body: JSON.stringify({
                    conversationId,
                    workspaceId,
                    content: text,
                    ...(agentMessageId ? { messageId: agentMessageId } : {}),
                    ...(actions?.length ? { actions } : {}),
                  }),
                  token,
                },
              );
              if (persistRes.persisted) {
                finalMessageId = persistRes.messageId;
              }
            } catch (err) {
              console.error("[use-chat] Failed to confirm persistence:", err);
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAgentId
                  ? {
                      ...m,
                      id: finalMessageId ?? tempAgentId,
                      content: text,
                      streaming: false,
                      actions,
                    }
                  : m,
              ),
            );
            setIsStreaming(false);
            setConnectionStatus("idle");
            sseCleanupRef.current = null;
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
            setConnectionStatus("disconnected");
            sseCleanupRef.current = null;
          },
          onStatus: (info: SSEStatusInfo) => {
            setConnectionStatus(info.status as ConnectionStatus);
            if (info.status === "reconnecting" && info.retryCount != null && info.maxRetries != null) {
              setRetryInfo((prev) => ({
                retryCount: info.retryCount!,
                maxRetries: info.maxRetries!,
                startedAt: prev?.startedAt ?? Date.now(),
              }));
            } else if (info.status === "connected" || info.status === "error") {
              setRetryInfo(null);
            }
          },
          onTimeout: () => {
            setConnectionStatus("timeout");
          },
        },
        token,
      );
    },
    [conversationId, workspaceId, getToken, options],
  );

  return { messages, sendMessage, isStreaming, isLoading, agentOffline, updateAction, connectionStatus, retryInfo };
}
