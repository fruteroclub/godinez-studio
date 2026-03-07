import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { content } from "@/lib/content";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useUpdateAgentConfig } from "@/hooks/use-agent";
import { useCreateConversation } from "@/hooks/use-conversations";
import { PageSkeleton } from "@/components/ui/Skeleton";
import AgentOfflineBanner from "@/components/AgentOfflineBanner";

const { agents: ac, onboarding } = content.studio;

interface Agent {
  id: number;
  name: string;
  slug: string;
  template: string;
  status: string;
  config: Record<string, unknown> | null;
}

const ROLE_IDS = [
  "founder",
  "marketing",
  "sales",
  "operations",
  "tech",
  "support",
  "other",
] as const;

const PERSONALITY_IDS = [
  "professional",
  "friendly",
  "creative",
  "technical",
] as const;

const NEED_IDS = [
  "launch",
  "automate",
  "social",
  "sales",
  "time",
  "research",
  "support",
  "build",
] as const;

const statusColors: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  paused: "bg-yellow-500/20 text-yellow-400",
  provisioning: "bg-blue-500/20 text-blue-400",
  error: "bg-red-500/20 text-red-400",
  archived: "bg-gray-500/20 text-gray-400",
};

const MAX_CUSTOM_INSTRUCTIONS = 500;

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
    return <Navigate to="/studio/new" replace />;
  }

  return (
    <AgentSettingsForm
      agent={agent}
      workspaceId={workspace.id}
      slug={slug}
    />
  );
}

function AgentSettingsForm({
  agent,
  workspaceId,
  slug,
}: {
  agent: Agent;
  workspaceId: number;
  slug: string;
}) {
  const navigate = useNavigate();
  const updateConfig = useUpdateAgentConfig(agent.id);
  const createConversation = useCreateConversation(workspaceId);

  const config = agent.config ?? {};

  // Form state — init from agent config
  const [agentName, setAgentName] = useState(agent.name);
  const [personality, setPersonality] = useState<string>(
    (config.personality as string) || "friendly",
  );
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(
    (config.needs as string[]) || [],
  );
  const [userRole, setUserRole] = useState(
    (config.userRole as string) || "",
  );
  const [businessDescription, setBusinessDescription] = useState(
    (config.businessDescription as string) || "",
  );
  const [customInstructions, setCustomInstructions] = useState(
    (config.customInstructions as string) || "",
  );

  const [saveFlash, setSaveFlash] = useState(false);
  const [needsRestart, setNeedsRestart] = useState(false);
  const [offlineError, setOfflineError] = useState(false);

  // Reset form when agent data changes (e.g. after save invalidation)
  useEffect(() => {
    setAgentName(agent.name);
    setPersonality((agent.config?.personality as string) || "friendly");
    setSelectedNeeds((agent.config?.needs as string[]) || []);
    setUserRole((agent.config?.userRole as string) || "");
    setBusinessDescription((agent.config?.businessDescription as string) || "");
    setCustomInstructions((agent.config?.customInstructions as string) || "");
  }, [agent]);

  function toggleNeed(id: string) {
    setSelectedNeeds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function handleSave() {
    updateConfig.mutate(
      {
        agentName: agentName.trim(),
        userRole,
        businessDescription: businessDescription.trim(),
        personality,
        needs: selectedNeeds,
        customInstructions: customInstructions.trim(),
      },
      {
        onSuccess: () => {
          setOfflineError(false);
          setNeedsRestart(true);
          setSaveFlash(true);
          setTimeout(() => setSaveFlash(false), 2000);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("AGENT_OFFLINE")) {
            setOfflineError(true);
          }
        },
      },
    );
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

  const canSave = agentName.trim().length > 0;

  return (
    <div className="space-y-6">
      {offlineError && (
        <AgentOfflineBanner message="No se puede conectar con el agente. Los cambios se guardarán localmente cuando vuelva a estar disponible." />
      )}
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

      {/* Settings form */}
      <div className="space-y-8 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        {/* Agent name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            {ac.agentNameLabel}
          </label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            maxLength={50}
            className="w-full max-w-sm rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
          />
        </div>

        {/* User role picker */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            {ac.userRoleLabel}
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLE_IDS.map((id) => {
              const label = onboarding.roles[id];
              if (!label) return null;
              const isSelected = userRole === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setUserRole(id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-magenta bg-magenta/10 text-[hsl(var(--foreground))]"
                      : "border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:border-white/20"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Business description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            {ac.businessDescriptionLabel}
          </label>
          <input
            type="text"
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            placeholder={ac.businessDescriptionPlaceholder}
            maxLength={120}
            className="w-full max-w-sm rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
          />
        </div>

        {/* Personality picker */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">
            {ac.personalityLabel}
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PERSONALITY_IDS.map((id) => {
              const p = onboarding.personalities[id];
              if (!p) return null;
              const isSelected = personality === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPersonality(id)}
                  className={`flex flex-col rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-magenta bg-magenta/10"
                      : "border-white/10 bg-[hsl(var(--card))] hover:border-white/20"
                  }`}
                >
                  <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                    {p.title}
                  </span>
                  <span className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                    {p.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Needs picker */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">
            {ac.needsLabel}
          </label>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {NEED_IDS.map((id) => {
              const need = onboarding.needs[id];
              if (!need) return null;
              const isSelected = selectedNeeds.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleNeed(id)}
                  className={`relative flex flex-col items-start rounded-lg border p-4 text-left transition-all ${
                    isSelected
                      ? "border-magenta bg-magenta/10"
                      : "border-white/10 bg-[hsl(var(--card))] hover:border-white/20 hover:shadow-[0_0_12px_rgba(233,30,140,0.08)]"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-magenta text-[10px] text-white">
                      ✓
                    </div>
                  )}
                  <span className="text-2xl">{need.emoji}</span>
                  <span className="mt-2 text-sm font-medium text-[hsl(var(--foreground))]">
                    {need.title}
                  </span>
                  <span className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                    {need.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom instructions */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            {ac.customInstructionsLabel}
          </label>
          <textarea
            value={customInstructions}
            onChange={(e) => {
              if (e.target.value.length <= MAX_CUSTOM_INSTRUCTIONS) {
                setCustomInstructions(e.target.value);
              }
            }}
            rows={4}
            placeholder={ac.customInstructionsPlaceholder}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20 resize-y"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {ac.customInstructionsHint}
            </p>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {customInstructions.length}/{MAX_CUSTOM_INSTRUCTIONS}
            </span>
          </div>
        </div>

        {/* Save button */}
        <div>
          <button
            onClick={handleSave}
            disabled={updateConfig.isPending || !canSave}
            className="rounded-md bg-magenta px-6 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
          >
            {updateConfig.isPending
              ? ac.saving
              : saveFlash
                ? ac.saved
                : ac.save}
          </button>
        </div>
      </div>
    </div>
  );
}
