import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { content } from "@/lib/content";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import {
  useAgentFile,
  usePrefetchAgentFiles,
  useUpdateAgentFile,
  useResetSoul,
} from "@/hooks/use-agent";
import { useCreateConversation } from "@/hooks/use-conversations";
import AgentHatching from "@/components/onboarding/AgentHatching";
import { PageSkeleton } from "@/components/ui/Skeleton";

const { agents: ac } = content.studio;

interface Agent {
  id: number;
  name: string;
  slug: string;
  template: string;
  status: string;
  config: Record<string, unknown> | null;
}

const FILES = [
  { name: "SOUL.md", label: ac.fileSoul },
  { name: "IDENTITY.md", label: ac.fileIdentity },
  { name: "TOOLS.md", label: ac.fileTools },
] as const;

type FileName = (typeof FILES)[number]["name"];

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  paused: "bg-yellow-500/20 text-yellow-400",
  provisioning: "bg-blue-500/20 text-blue-400",
  error: "bg-red-500/20 text-red-400",
  archived: "bg-gray-500/20 text-gray-400",
};

function formatTimestamp(ms: number) {
  const d = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "hace un momento";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffMin < 1440) return `hace ${Math.floor(diffMin / 60)}h`;
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Agents() {
  const { workspace, isLoading: wsLoading, slug } = useWorkspace();
  const { getToken } = useAuth();

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ["agent", workspace?.agentId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<Agent>(`/api/agents/${workspace!.agentId}`, { token });
    },
    enabled: !!workspace?.agentId,
  });

  if (wsLoading || (workspace?.agentId && agentLoading)) {
    return <PageSkeleton />;
  }

  if (!workspace?.agentId || !agent) {
    return <AgentHatching />;
  }

  return (
    <AgentConfigEditor
      agent={agent}
      workspaceId={workspace.id}
      slug={slug}
    />
  );
}

function AgentConfigEditor({
  agent,
  workspaceId,
  slug,
}: {
  agent: Agent;
  workspaceId: number;
  slug: string;
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FileName>("SOUL.md");
  const [draft, setDraft] = useState("");
  const [saveFlash, setSaveFlash] = useState(false);
  const [needsRestart, setNeedsRestart] = useState(false);
  // Track the server content we last synced from, to detect external changes
  const syncedContent = useRef<string | null>(null);
  const [externalChange, setExternalChange] = useState(false);

  usePrefetchAgentFiles(agent.id); // load all 3 files in parallel on mount
  const file = useAgentFile(agent.id, activeTab);
  const updateFile = useUpdateAgentFile(agent.id);
  const resetSoul = useResetSoul(agent.id);
  const createConversation = useCreateConversation(workspaceId);

  const serverContent = file.data?.content ?? "";
  const updatedAtMs = file.data?.updatedAtMs;

  // Sync draft when file first loads or tab changes
  useEffect(() => {
    if (file.data === undefined) return;
    setDraft(serverContent);
    syncedContent.current = serverContent;
    setExternalChange(false);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect external changes on refetch (don't overwrite user's draft)
  useEffect(() => {
    if (file.data === undefined || syncedContent.current === null) return;
    if (serverContent !== syncedContent.current) {
      // Server content changed since we last synced
      const userHasEdits = draft !== syncedContent.current;
      if (userHasEdits) {
        // User has local edits — show notice, don't overwrite
        setExternalChange(true);
      } else {
        // No local edits — silently update
        setDraft(serverContent);
        syncedContent.current = serverContent;
        setExternalChange(false);
      }
    }
  }, [serverContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const acceptExternal = useCallback(() => {
    setDraft(serverContent);
    syncedContent.current = serverContent;
    setExternalChange(false);
  }, [serverContent]);

  function handleSave() {
    updateFile.mutate(
      { filename: activeTab, content: draft },
      {
        onSuccess: () => {
          syncedContent.current = draft;
          setExternalChange(false);
          setNeedsRestart(true);
          setSaveFlash(true);
          setTimeout(() => setSaveFlash(false), 2000);
        },
      },
    );
  }

  function handleReset() {
    if (!confirm(ac.resetSoulConfirm)) return;
    resetSoul.mutate(undefined, {
      onSuccess: () => {
        syncedContent.current = null; // let the refetch sync
        setNeedsRestart(true);
      },
    });
  }

  function handleRestart() {
    createConversation.mutate(
      { agentId: agent.id },
      {
        onSuccess: (conv) => {
          navigate(`/studio/${slug}/chat/${conv.id}`);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {ac.title}
      </h1>

      {/* Agent header card */}
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand text-2xl">
            🤖
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                {agent.name}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[agent.status] ?? statusColors.archived}`}
              >
                {agent.status}
              </span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {agent.template} · {agent.slug}
            </p>
          </div>
        </div>
      </div>

      {/* Restart session banner */}
      {needsRestart && (
        <div className="flex items-center justify-between rounded-lg border border-magenta/30 bg-magenta/5 px-5 py-3">
          <p className="text-sm text-[hsl(var(--foreground))]">
            {ac.restartNotice}
          </p>
          <button
            onClick={handleRestart}
            disabled={createConversation.isPending}
            className="rounded-md bg-magenta px-4 py-1.5 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
          >
            {createConversation.isPending ? ac.restarting : ac.restartCta}
          </button>
        </div>
      )}

      {/* File editor card */}
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h3 className="font-medium text-[hsl(var(--foreground))] mb-4">
          {ac.files}
        </h3>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[hsl(var(--border))] mb-4">
          {FILES.map((f) => (
            <button
              key={f.name}
              onClick={() => setActiveTab(f.name)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === f.name
                  ? "border-magenta text-magenta"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* External change banner */}
        {externalChange && (
          <div className="mb-3 flex items-center justify-between rounded-md border border-yellow-500/30 bg-yellow-500/5 px-4 py-2">
            <p className="text-sm text-yellow-400">
              Archivo modificado externamente por el agente.
            </p>
            <button
              onClick={acceptExternal}
              className="text-sm font-medium text-yellow-400 hover:text-yellow-300 underline"
            >
              Cargar versión nueva
            </button>
          </div>
        )}

        {/* Editor area */}
        {file.isLoading ? (
          <div className="h-80 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] animate-pulse" />
        ) : file.error ? (
          <div className="rounded-md border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            {ac.loadError}
          </div>
        ) : (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={20}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 font-mono text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20 resize-y"
          />
        )}

        {/* Footer: timestamp + actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={updateFile.isPending || file.isLoading}
              className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
            >
              {updateFile.isPending
                ? ac.saving
                : saveFlash
                  ? ac.saved
                  : ac.save}
            </button>
            {updatedAtMs && (
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Actualizado {formatTimestamp(updatedAtMs)}
              </span>
            )}
          </div>

          {activeTab === "SOUL.md" && (
            <button
              onClick={handleReset}
              disabled={resetSoul.isPending || file.isLoading}
              className="rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-colors disabled:opacity-50"
            >
              {resetSoul.isPending ? ac.resetting : ac.resetSoul}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
