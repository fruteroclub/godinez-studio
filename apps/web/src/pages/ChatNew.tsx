import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateConversation } from "@/hooks/use-conversations";
import { useWorkspace } from "@/providers/WorkspaceProvider";

export default function ChatNew() {
  const navigate = useNavigate();
  const { workspace, slug } = useWorkspace();
  const createConversation = useCreateConversation(workspace?.id ?? 0);

  useEffect(() => {
    if (!workspace) return;
    
    async function create() {
      try {
        const conv = await createConversation.mutateAsync({});
        navigate(`/studio/${slug}/chat/${conv.id}`, { replace: true });
      } catch (err) {
        console.error("Error creating conversation:", err);
        navigate(`/studio/${slug}/chat`, { replace: true });
      }
    }
    create();
  }, [workspace]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-magenta border-t-transparent" />
    </div>
  );
}
