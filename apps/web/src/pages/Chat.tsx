import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
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

interface ConversationToDelete {
  id: number;
  title: string;
}

export default function Chat() {
  const { workspace, slug } = useWorkspace();
  const { data: conversations, isLoading } = useConversations(workspace?.id);
  const { data: projects } = useProjects(workspace?.id);
  const createConversation = useCreateConversation(workspace?.id ?? 0);
  const deleteConversation = useDeleteConversation(workspace?.id ?? 0);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [convToDelete, setConvToDelete] = useState<ConversationToDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && convToDelete) setConvToDelete(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [convToDelete]);

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

  function handleDeleteClick(conv: { id: number; title: string | null }, e: React.MouseEvent) {
    e.stopPropagation();
    setConvToDelete({ id: conv.id, title: conv.title ?? "Conversación" });
  }

  function handleConfirmDelete() {
    if (!convToDelete) return;
    setIsDeleting(true);
    deleteConversation.mutate(convToDelete.id, {
      onSettled: () => {
        setIsDeleting(false);
        setConvToDelete(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {convToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-xl p-6 max-w-md w-full border border-zinc-700 shadow-xl">
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">
              🗑️ ¿Eliminar conversación?
            </h2>
            <p className="text-zinc-400 mb-4">
              Esto eliminará <strong className="text-zinc-200">{convToDelete.title}</strong> y todos sus mensajes. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConvToDelete(null)}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 text-zinc-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 text-white disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Eliminando...
                  </span>
                ) : (
                  "Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    onClick={(e) => handleDeleteClick(conv, e)}
                    className="rounded p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
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
