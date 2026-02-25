import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useConversations,
  useCreateConversation,
} from "@/hooks/use-conversations";
import { content } from "@/lib/content";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

const { chat } = content.studio;

export default function Chat() {
  const { workspace, slug } = useWorkspace();
  const { data: conversations, isLoading } = useConversations(workspace?.id);
  const createConversation = useCreateConversation(workspace?.id ?? 0);
  const navigate = useNavigate();

  async function handleNew() {
    const conv = await createConversation.mutateAsync({});
    navigate(`/studio/${slug}/chat/${conv.id}`);
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

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !conversations?.length ? (
        <EmptyState message="Inicia una conversacion con tu agente" />
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => navigate(`/studio/${slug}/chat/${conv.id}`)}
              className="flex w-full items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left transition-colors hover:border-magenta/30"
            >
              <div>
                <p className="font-medium text-[hsl(var(--foreground))]">
                  {conv.title ?? "Conversacion"}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {conv.channel}
                </p>
              </div>
              {conv.lastMessageAt && (
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(conv.lastMessageAt).toLocaleDateString("es-MX")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
