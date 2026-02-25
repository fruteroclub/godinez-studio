import { createContext, useContext } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Workspace {
  id: number;
  name: string;
  slug: string;
  tier: string;
  status: string;
  agentId: number | null;
  agentSlot: string | null;
}

interface WorkspaceContextValue {
  workspace: Workspace | null;
  isLoading: boolean;
  slug: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: null,
  isLoading: true,
  slug: "",
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export default function WorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { slug } = useParams<{ slug: string }>();
  const { getToken } = useAuth();

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace", slug],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Workspace>(`/api/workspaces/${slug}`, { token });
    },
    enabled: !!slug,
  });

  return (
    <WorkspaceContext.Provider
      value={{ workspace: workspace ?? null, isLoading, slug: slug ?? "" }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
