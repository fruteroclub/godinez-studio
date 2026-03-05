import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useChat } from "@/hooks/use-chat";
import { useActionExecutor } from "@/hooks/use-action-executor";
import { ActionCard } from "@/components/chat/ActionCard";
import { ManualActionMenu } from "@/components/chat/ManualActionMenu";
import { stripActionBlocks } from "@/lib/action-parser";
import { content } from "@/lib/content";
import type { ActionType } from "@godinez/types";

const { chat } = content.studio;

// Regex to detect tunnel URLs
const TUNNEL_URL_REGEX = /(https?:\/\/[a-z0-9-]+\.(?:trycloudflare\.com|ngrok\.io|ngrok-free\.app|localhost\.run)(?:\/[^\s\)\]\*\`\<\>]*)?)/gi;

type ViewMode = "chat" | "split" | "preview";
type TunnelStatus = "idle" | "checking" | "live" | "dead";

export default function ChatConversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { workspace, slug } = useWorkspace();
  const qc = useQueryClient();
  const onComplete = useCallback(
    () => qc.invalidateQueries({ queryKey: ["conversations", workspace?.id] }),
    [qc, workspace?.id],
  );
  const { messages, sendMessage, isStreaming, isLoading, updateAction } =
    useChat(Number(conversationId), workspace?.id ?? 0, { onComplete });
  const { execute } = useActionExecutor(updateAction);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [input, setInput] = useState("");
  
  // Preview state
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>("idle");
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Extract tunnel URL from message content
  const extractTunnelUrl = (content: string): string | null => {
    if (typeof content !== "string") return null;
    const matches = content.match(TUNNEL_URL_REGEX);
    return matches ? matches[0] : null;
  };

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

  // Scan messages for tunnel URLs
  useEffect(() => {
    for (const msg of [...messages].reverse()) {
      if (msg.role === "agent") {
        const url = extractTunnelUrl(msg.content);
        if (url && url !== previewUrl) {
          setPreviewUrl(url);
          checkTunnelHealth(url);
          // Auto-switch to split view on desktop when tunnel detected
          if (!isMobile && viewMode === "chat") {
            setViewMode("split");
          }
          break;
        }
      }
    }
  }, [messages, previewUrl, isMobile, viewMode, checkTunnelHealth]);

  // Save preview URL to DB
  useEffect(() => {
    if (previewUrl && slug) {
      fetch(`/api/workspaces/${slug}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewUrl }),
      }).catch(console.error);
    }
  }, [previewUrl, slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || isStreaming) return;
    setInput("");
    sendMessage(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleManualAction(_type: ActionType) {
    // TODO Phase 2: open a form dialog for the selected action type
  }

  function handleRefreshPreview() {
    if (iframeRef.current && previewUrl) {
      const url = new URL(previewUrl);
      url.searchParams.set("_t", Date.now().toString());
      iframeRef.current.src = url.toString();
    }
    if (previewUrl) checkTunnelHealth(previewUrl);
  }

  const getStatusColor = () => {
    switch (tunnelStatus) {
      case "live": return "bg-green-400";
      case "checking": return "bg-yellow-400 animate-pulse";
      case "dead": return "bg-red-400";
      default: return "bg-gray-400";
    }
  };

  // Mobile banner when preview is available
  const MobileBanner = () => {
    if (!isMobile || !previewUrl) return null;
    return (
      <div className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              Preview disponible
            </span>
          </div>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-magenta px-3 py-1.5 text-xs font-medium text-white"
          >
            Abrir ↗️
          </a>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          💻 Para mejor experiencia usa escritorio
        </p>
      </div>
    );
  };

  // View mode tabs (desktop only)
  const ViewTabs = () => {
    if (isMobile) return null;
    return (
      <div className="flex gap-1 p-1 bg-[hsl(var(--muted))] rounded-lg">
        <button
          onClick={() => setViewMode("chat")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            viewMode === "chat"
              ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          }`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setViewMode("split")}
          disabled={!previewUrl}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
            viewMode === "split"
              ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          }`}
        >
          🖥️ Split
        </button>
        <button
          onClick={() => setViewMode("preview")}
          disabled={!previewUrl}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
            viewMode === "preview"
              ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm"
              : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          }`}
        >
          🧪 Preview
        </button>
      </div>
    );
  };

  // Chat panel component
  const ChatPanel = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col ${className}`}>
      {/* Typing indicator */}
      {isStreaming && (
        <div className="border-b border-[hsl(var(--border))] px-4 py-1.5">
          <p className="text-xs text-magenta animate-pulse">
            Agente está escribiendo...
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-magenta border-t-transparent" />
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
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
            {msg.role === "agent" && !msg.streaming && (
              <div className="ml-1 flex items-end">
                <ManualActionMenu onSelect={handleManualAction} />
              </div>
            )}
          </div>
        ))}

        {messages.length === 0 && !isLoading && (
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-8">
            Envía un mensaje para empezar la conversación
          </p>
        )}

        <div ref={bottomRef} />
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
            placeholder={chat.placeholder}
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
          >
            {chat.send}
          </button>
        </div>
      </form>
    </div>
  );

  // Preview panel component
  const PreviewPanel = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col bg-[hsl(var(--muted))] ${className}`}>
      {/* Preview header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[200px]">
            {previewUrl}
          </span>
        </div>
        <div className="flex items-center gap-1">
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
            title="Open in new tab"
          >
            ↗️
          </a>
        </div>
      </div>

      {/* Preview content */}
      <div className="flex-1 relative">
        {tunnelStatus === "live" && previewUrl ? (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="absolute inset-0 w-full h-full border-0 bg-white"
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : tunnelStatus === "checking" ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-spin">⏳</div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Verificando tunnel...
              </p>
            </div>
          </div>
        ) : tunnelStatus === "dead" ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <div className="text-4xl mb-4">🔌</div>
              <p className="text-sm text-destructive font-medium mb-2">
                Tunnel desconectado
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-xs">
                Pide al agente que genere un nuevo tunnel
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <div className="text-4xl mb-4">🧪</div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                El preview aparecerá aquí cuando el agente cree tu proyecto
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header with view tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))]">
        <h2 className="text-sm font-medium text-[hsl(var(--foreground))]">
          {chat.title}
        </h2>
        <ViewTabs />
      </div>

      {/* Mobile banner */}
      <MobileBanner />

      {/* Main content based on view mode */}
      {viewMode === "chat" || isMobile ? (
        <ChatPanel className="flex-1" />
      ) : viewMode === "split" ? (
        <div className="flex-1 flex">
          <ChatPanel className="w-1/2 border-r border-[hsl(var(--border))]" />
          <PreviewPanel className="w-1/2" />
        </div>
      ) : (
        <PreviewPanel className="flex-1" />
      )}
    </div>
  );
}
