import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from "@/hooks/use-conversations";
import { useProjects } from "@/hooks/use-projects";
import { content } from "@/lib/content";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

const { chat } = content.studio;

export default function Chat() {
  const { workspace, slug } = useWorkspace();
  const { data: conversations, isLoading } = useConversations(workspace?.id);
  const { data: projects } = useProjects(workspace?.id);
  const createConversation = useCreateConversation(workspace?.id ?? 0);
  const deleteConversation = useDeleteConversation(workspace?.id ?? 0);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const projectMap = new Map(
    (projects ?? []).map((p) => [p.id, p.name]),
  );

  async function handleNew() {
    try {
      setError(null);
      const conv = await createConversation.mutateAsync({});
      navigate(`/studio/${slug}/chat/${conv.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear conversación");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          {chat.title}
        </h1>
        <button
          onClick={handleNew}
          disabled={createConversation.isPending}
          className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
        >
          {chat.newConversation}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !conversations?.length ? (
        <EmptyState message="Inicia una conversacion con tu agente" />
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const projName = conv.projectId
              ? projectMap.get(conv.projectId)
              : undefined;
            return (
              <div
                key={conv.id}
                className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-magenta/30"
              >
                <button
                  onClick={() => navigate(`/studio/${slug}/chat/${conv.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="font-medium text-[hsl(var(--foreground))] truncate">
                    {conv.title ?? "Conversación"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {conv.isHackathon && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        hackathon
                      </span>
                    )}
                    {projName && (
                      <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                        {projName}
                      </span>
                    )}
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {conv.channel}
                    </span>
                  </div>
                </button>
                <div className="ml-4 flex items-center gap-3">
                  {conv.lastMessageAt && (
                    <span className="shrink-0 text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(conv.lastMessageAt).toLocaleDateString("es-MX")}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(chat.deleteConfirm)) {
                        deleteConversation.mutate(conv.id);
                      }
                    }}
                    className="rounded p-1 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
