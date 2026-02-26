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

export default function ChatConversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { workspace } = useWorkspace();
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
  const [input, setInput] = useState("");

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
    // For now this is a placeholder
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
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
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
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
            {/* Manual action menu on agent messages */}
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
}
