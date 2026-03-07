import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useChat } from "@/hooks/use-chat";
import { useActionExecutor } from "@/hooks/use-action-executor";
import { ActionCard } from "@/components/chat/ActionCard";
import { stripActionBlocks } from "@/lib/action-parser";
import AgentOfflineBanner from "@/components/AgentOfflineBanner";
import { content } from "@/lib/content";

const { chat } = content.studio;

// Regex to detect tunnel URLs
const TUNNEL_URL_REGEX = /(https?:\/\/[a-z0-9-]+\.(?:trycloudflare\.com|ngrok\.io|ngrok-free\.app|localhost\.run)(?:\/[^\s\)\]\*\`\<\>]*)?)/gi;

type TunnelStatus = "idle" | "checking" | "live" | "dead";
type PreviewDevice = "desktop" | "mobile";

// Extract tunnel URL from message content
function extractTunnelUrl(messageContent: string): string | null {
  if (typeof messageContent !== "string") return null;
  const matches = messageContent.match(TUNNEL_URL_REGEX);
  return matches ? matches[0] : null;
}

export default function ChatConversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { workspace, slug } = useWorkspace();
  const qc = useQueryClient();
  const onComplete = useCallback(
    () => qc.invalidateQueries({ queryKey: ["conversations", workspace?.id] }),
    [qc, workspace?.id],
  );
  const { messages, sendMessage, isStreaming, isLoading, agentOffline, updateAction, connectionStatus } =
    useChat(Number(conversationId), workspace?.id ?? 0, { onComplete });
  const { execute } = useActionExecutor(updateAction);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [input, setInput] = useState("");

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>("idle");
  const [isMobile, setIsMobile] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Detect mobile - only on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Check if tunnel is alive
  const checkTunnelHealth = useCallback(async (url: string): Promise<boolean> => {
    setTunnelStatus("checking");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      await fetch(url, { mode: "no-cors", signal: controller.signal });
      clearTimeout(timeout);
      setTunnelStatus("live");
      return true;
    } catch {
      setTunnelStatus("dead");
      return false;
    }
  }, []);

  // Scan messages for tunnel URLs - only when messages change
  const detectedUrl = useMemo(() => {
    for (const msg of [...messages].reverse()) {
      if (msg.role === "agent") {
        const url = extractTunnelUrl(msg.content);
        if (url) return url;
      }
    }
    return null;
  }, [messages]);

  // Update preview URL when detected - with animation
  useEffect(() => {
    if (detectedUrl && detectedUrl !== previewUrl) {
      setPreviewUrl(detectedUrl);
      checkTunnelHealth(detectedUrl);

      // Trigger transition animation on desktop
      if (!isMobile) {
        setIsTransitioning(true);
        setTimeout(() => {
          setShowPreview(true);
          setIsTransitioning(false);
        }, 300);
      }
    }
  }, [detectedUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save preview URL to DB - debounced
  useEffect(() => {
    if (!previewUrl || !slug) return;
    const timeout = setTimeout(() => {
      fetch(`/api/workspaces/${slug}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewUrl }),
      }).catch(console.error);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [previewUrl, slug]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (!value || isStreaming) return;
    setInput("");
    sendMessage(value);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const handleRefreshPreview = useCallback(() => {
    if (iframeRef.current && previewUrl) {
      const url = new URL(previewUrl);
      url.searchParams.set("_t", Date.now().toString());
      iframeRef.current.src = url.toString();
    }
    if (previewUrl) checkTunnelHealth(previewUrl);
  }, [previewUrl, checkTunnelHealth]);

  const statusColor = useMemo(() => {
    switch (tunnelStatus) {
      case "live": return "bg-green-400";
      case "checking": return "bg-yellow-400 animate-pulse";
      case "dead": return "bg-red-400";
      default: return "bg-gray-400";
    }
  }, [tunnelStatus]);

  const previewWidth = previewDevice === "mobile" ? "375px" : "100%";

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Agent offline banner */}
      {agentOffline && (
        <div className="px-4 pt-3">
          <AgentOfflineBanner />
        </div>
      )}

      {/* Connection status banners */}
      {connectionStatus === "reconnecting" && (
        <div className="mx-4 mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-400">
          {content.studio.connection.reconnecting}
        </div>
      )}
      {connectionStatus === "timeout" && (
        <div className="mx-4 mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-400">
          {content.studio.connection.timeout}
        </div>
      )}

      {/* Mobile banner when preview available */}
      {isMobile && previewUrl && (
        <div className="bg-gradient-to-r from-magenta/10 to-violet/10 border-b border-magenta/20 px-4 py-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                ✨ Preview listo
              </span>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-magenta px-4 py-1.5 text-xs font-medium text-white shadow-lg shadow-magenta/25 hover:shadow-magenta/40 transition-shadow"
            >
              Abrir ↗️
            </a>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">
            💻 Para editar en vivo, usa escritorio
          </p>
        </div>
      )}

      {/* Main content with animated transition */}
      <div className={`flex-1 flex overflow-hidden transition-all duration-500 ease-out ${
        isTransitioning ? "opacity-50" : "opacity-100"
      }`}>
        {/* Chat panel */}
        <div className={`flex flex-col transition-all duration-500 ease-out ${
          showPreview && !isMobile
            ? "w-1/2 border-r border-[hsl(var(--border))]"
            : "w-full"
        }`}>
          {/* Typing indicator */}
          {isStreaming && (
            <div className="border-b border-[hsl(var(--border))] px-4 py-2 bg-magenta/5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-magenta rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-magenta rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-magenta rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-xs text-magenta font-medium">
                  Creando tu proyecto...
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-magenta border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-8">
                  Envía un mensaje para empezar la conversación
                </p>
              </div>
            ) : (
              <Virtuoso
                ref={virtuosoRef}
                data={messages}
                initialTopMostItemIndex={messages.length - 1}
                followOutput="smooth"
                className="h-full"
                itemContent={(_index, msg) => (
                  <div className={`flex px-4 py-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-magenta text-white rounded-br-md whitespace-pre-wrap"
                          : msg.role === "agent"
                            ? "bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-bl-md prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2"
                            : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-xs italic whitespace-pre-wrap"
                      }`}
                    >
                      {msg.role === "agent" ? (
                        <>
                          <ReactMarkdown>
                            {stripActionBlocks(msg.content)}
                          </ReactMarkdown>
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-2 not-prose">
                              {msg.actions.map((action) => (
                                <ActionCard
                                  key={action.id}
                                  action={action}
                                  messageId={msg.id}
                                  onExecute={execute}
                                  disabled={msg.streaming}
                                />
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                )}
              />
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-[hsl(var(--border))] p-4"
          >
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={agentOffline ? "Agente no disponible" : chat.placeholder}
                disabled={isStreaming || agentOffline}
                rows={1}
                className="flex-1 resize-none rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isStreaming || agentOffline || !input.trim()}
                className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
              >
                {chat.send}
              </button>
            </div>
          </form>
        </div>

        {/* Preview panel - slides in with animation */}
        {showPreview && !isMobile && (
          <div className="flex flex-col bg-[hsl(var(--muted))] w-1/2 animate-in slide-in-from-right duration-500">
            {/* Preview header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                  ✨ Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Device toggle */}
                <div className="flex gap-1 p-1 bg-[hsl(var(--muted))] rounded-lg">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      previewDevice === "desktop"
                        ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
                        : "text-[hsl(var(--muted-foreground))]"
                    }`}
                    title="Desktop"
                  >
                    🖥️
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      previewDevice === "mobile"
                        ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
                        : "text-[hsl(var(--muted-foreground))]"
                    }`}
                    title="Mobile"
                  >
                    📱
                  </button>
                </div>
                <button
                  onClick={handleRefreshPreview}
                  className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded"
                  title="Refresh"
                >
                  🔄
                </button>
                <a
                  href={previewUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded"
                  title="Abrir en nueva pestaña"
                >
                  ↗️
                </a>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] rounded"
                  title="Cerrar preview"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 relative flex items-center justify-center bg-[hsl(var(--muted))] p-4">
              {tunnelStatus === "live" && previewUrl ? (
                <div
                  className={`bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
                    previewDevice === "mobile" ? "h-[667px]" : "w-full h-full"
                  }`}
                  style={{ width: previewWidth }}
                >
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  />
                </div>
              ) : tunnelStatus === "checking" ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-magenta to-violet flex items-center justify-center animate-pulse">
                    <span className="text-2xl">✨</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Conectando preview...
                  </p>
                </div>
              ) : tunnelStatus === "dead" ? (
                <div className="text-center p-8">
                  <div className="text-4xl mb-4">🔌</div>
                  <p className="text-sm text-destructive font-medium mb-2">
                    Preview desconectado
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-xs">
                    Pide al agente que regenere el tunnel
                  </p>
                </div>
              ) : (
                <div className="text-center p-8">
                  <div className="text-4xl mb-4">🧪</div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    El preview aparecerá aquí
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
