import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Star, Pencil, Trash2, X, Check } from "lucide-react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useUpdateConversation,
} from "@/hooks/use-conversations";
import { useProjects } from "@/hooks/use-projects";
import { content } from "@/lib/content";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

const { chat } = content.studio;

<<<<<<< Updated upstream
interface ConversationToDelete {
  id: number;
  title: string;
}

interface MenuState {
  conversationId: number | null;
  position: { x: number; y: number };
}

interface RenameState {
  conversationId: number | null;
  title: string;
=======
interface Conversation {
  id: number;
  title: string | null;
  channel: string;
  projectId: number | null;
  isHackathon?: boolean;
  lastMessageAt: string | null;
>>>>>>> Stashed changes
}

export default function Chat() {
  const { workspace, slug } = useWorkspace();
  const { data: conversations, isLoading } = useConversations(workspace?.id) as {
    data: Conversation[] | undefined;
    isLoading: boolean;
  };
  const { data: projects } = useProjects(workspace?.id);
  const createConversation = useCreateConversation(workspace?.id ?? 0);
  const deleteConversation = useDeleteConversation(workspace?.id ?? 0);
  const updateConversation = useUpdateConversation(workspace?.id ?? 0);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [convToDelete, setConvToDelete] = useState<ConversationToDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuState, setMenuState] = useState<MenuState>({ conversationId: null, position: { x: 0, y: 0 } });
  const [renameState, setRenameState] = useState<RenameState>({ conversationId: null, title: "" });
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuState({ conversationId: null, position: { x: 0, y: 0 } });
      }
    };
    if (menuState.conversationId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuState.conversationId]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (convToDelete) setConvToDelete(null);
        if (menuState.conversationId) setMenuState({ conversationId: null, position: { x: 0, y: 0 } });
        if (renameState.conversationId) setRenameState({ conversationId: null, title: "" });
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [convToDelete, menuState.conversationId, renameState.conversationId]);

  // Focus rename input when opening
  useEffect(() => {
    if (renameState.conversationId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renameState.conversationId]);

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

<<<<<<< Updated upstream
  function handleMenuClick(conv: { id: number }, e: React.MouseEvent) {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMenuState({
      conversationId: conv.id,
      position: { x: rect.right - 160, y: rect.bottom + 4 },
    });
  }

  function handleDeleteClick(conv: { id: number; title: string | null }) {
    setMenuState({ conversationId: null, position: { x: 0, y: 0 } });
    setConvToDelete({ id: conv.id, title: conv.title ?? "Conversación" });
  }

  function handleRenameClick(conv: { id: number; title: string | null }) {
    setMenuState({ conversationId: null, position: { x: 0, y: 0 } });
    setRenameState({ conversationId: conv.id, title: conv.title ?? "" });
  }

  function handleToggleStar(conv: { id: number; isStarred?: boolean }) {
    setMenuState({ conversationId: null, position: { x: 0, y: 0 } });
    updateConversation.mutate({
      conversationId: conv.id,
      isStarred: !conv.isStarred,
    });
  }

  function handleConfirmRename() {
    if (!renameState.conversationId || !renameState.title.trim()) return;
    updateConversation.mutate({
      conversationId: renameState.conversationId,
      title: renameState.title.trim(),
    });
    setRenameState({ conversationId: null, title: "" });
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

  // Separate starred and regular conversations
  const starredConversations = conversations?.filter(c => c.isStarred) ?? [];
  const regularConversations = conversations?.filter(c => !c.isStarred) ?? [];

  const renderConversationItem = (conv: NonNullable<typeof conversations>[number]) => {
    const projName = conv.projectId ? projectMap.get(conv.projectId) : undefined;
    const isRenaming = renameState.conversationId === conv.id;

    return (
      <div
        key={conv.id}
        className="group flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-magenta/30"
      >
        <button
          onClick={() => !isRenaming && navigate(`/studio/${slug}/chat/${conv.id}`)}
          className="min-w-0 flex-1 text-left"
          disabled={isRenaming}
        >
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <input
                ref={renameInputRef}
                type="text"
                value={renameState.title}
                onChange={(e) => setRenameState(prev => ({ ...prev, title: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmRename();
                  if (e.key === "Escape") setRenameState({ conversationId: null, title: "" });
                }}
                className="flex-1 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-magenta"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleConfirmRename(); }}
                className="p-1 text-green-400 hover:bg-green-500/20 rounded transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setRenameState({ conversationId: null, title: "" }); }}
                className="p-1 text-zinc-400 hover:bg-zinc-500/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {conv.isStarred && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                <p className="font-medium text-[hsl(var(--foreground))] truncate">
                  {conv.title ?? "Conversación"}
                </p>
              </div>
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
            </>
          )}
        </button>
        <div className="ml-4 flex items-center gap-3">
          {conv.lastMessageAt && (
            <span className="shrink-0 text-xs text-[hsl(var(--muted-foreground))]">
              {new Date(conv.lastMessageAt).toLocaleDateString("es-MX")}
            </span>
          )}
          <button
            onClick={(e) => handleMenuClick(conv, e)}
            className="rounded p-1.5 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-all"
            title="Opciones"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };
=======
  // Sort conversations: hackathon first, then by lastMessageAt
  const sortedConversations = [...(conversations ?? [])].sort((a, b) => {
    // Hackathon conversations always first
    if (a.isHackathon && !b.isHackathon) return -1;
    if (!a.isHackathon && b.isHackathon) return 1;
    // Then by date
    const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return dateB - dateA;
  });
>>>>>>> Stashed changes

  return (
    <div className="space-y-6">
      {/* Context Menu */}
      {menuState.conversationId && (
        <div
          ref={menuRef}
          className="fixed z-50 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ left: menuState.position.x, top: menuState.position.y }}
        >
          {(() => {
            const conv = conversations?.find(c => c.id === menuState.conversationId);
            if (!conv) return null;
            return (
              <>
                <button
                  onClick={() => handleToggleStar(conv)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <Star className={`w-4 h-4 ${conv.isStarred ? "text-yellow-400 fill-yellow-400" : ""}`} />
                  {conv.isStarred ? "Quitar estrella" : "Marcar importante"}
                </button>
                <button
                  onClick={() => handleRenameClick(conv)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Renombrar
                </button>
                <div className="border-t border-zinc-700 my-1" />
                <button
                  onClick={() => handleDeleteClick(conv)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </>
            );
          })()}
        </div>
      )}

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
      ) : !sortedConversations?.length ? (
        <EmptyState message="Inicia una conversacion con tu agente" />
      ) : (
<<<<<<< Updated upstream
        <div className="space-y-6">
          {/* Starred Conversations */}
          {starredConversations.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                Destacados
              </h2>
              <div className="space-y-2">
                {starredConversations.map(renderConversationItem)}
              </div>
            </div>
          )}

          {/* Regular Conversations */}
          {regularConversations.length > 0 && (
            <div className="space-y-2">
              {starredConversations.length > 0 && (
                <h2 className="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                  Recientes
                </h2>
              )}
              <div className="space-y-2">
                {regularConversations.map(renderConversationItem)}
              </div>
            </div>
          )}
=======
        <div className="space-y-2">
          {sortedConversations.map((conv) => {
            const projName = conv.projectId
              ? projectMap.get(conv.projectId)
              : undefined;
            return (
              <button
                key={conv.id}
                onClick={() => navigate(`/studio/${slug}/chat/${conv.id}`)}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
                  conv.isHackathon
                    ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-magenta/30"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {conv.isHackathon && (
                      <span className="text-lg">🏆</span>
                    )}
                    <p className="font-medium text-[hsl(var(--foreground))] truncate">
                      {conv.title ?? "Conversación"}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {conv.isHackathon && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        Hackathon
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
                </div>
                {conv.lastMessageAt && (
                  <span className="ml-4 shrink-0 text-xs text-[hsl(var(--muted-foreground))]">
                    {new Date(conv.lastMessageAt).toLocaleDateString("es-MX")}
                  </span>
                )}
              </button>
            );
          })}
>>>>>>> Stashed changes
        </div>
      )}
    </div>
  );
}
