import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateWorkspace } from "@/hooks/use-workspace";
import { useProvision } from "@/hooks/use-provision";
import { content } from "@/lib/content";

const { onboarding } = content.studio;

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

const PERSONALITY_IDS = [
  "professional",
  "friendly",
  "creative",
  "technical",
] as const;

type Step = 1 | 2 | 3 | 4;

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const createWorkspace = useCreateWorkspace();

  // Form state
  const [workspaceName, setWorkspaceName] = useState("");
  const [userName, setUserName] = useState("");
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [agentName, setAgentName] = useState("");
  const [personality, setPersonality] = useState<string>("friendly");

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [needsError, setNeedsError] = useState(false);
  const [provisionSlug, setProvisionSlug] = useState<string | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Provision hook — slug is set after workspace creation
  const provision = useProvision(provisionSlug || "");

  function toggleNeed(id: string) {
    setNeedsError(false);
    setSelectedNeeds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return workspaceName.trim().length > 0 && userName.trim().length > 0;
      case 2:
        return selectedNeeds.length > 0;
      case 3:
        return agentName.trim().length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (step === 2 && selectedNeeds.length === 0) {
      setNeedsError(true);
      return;
    }
    if (step < 4) setStep((step + 1) as Step);
  }

  function handleBack() {
    if (step > 1) setStep((step - 1) as Step);
  }

  async function handleLaunch() {
    setProvisionError(null);
    setIsProvisioning(true);

    try {
      // 1. Create workspace
      const ws = await createWorkspace.mutateAsync(workspaceName.trim());
      setProvisionSlug(ws.slug);

      // 2. Provision agent
      const result = await provision.mutateAsync({
        workspaceId: ws.id,
        userName: userName.trim(),
        agentName: agentName.trim(),
        personality,
        needs: selectedNeeds,
      });

      // 3. Navigate to chat
      navigate(`/studio/${ws.slug}/chat/${result.conversationId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("CAPACITY_FULL")) {
        setProvisionError(onboarding.capacityFull);
      } else if (msg.includes("GATEWAY_OFFLINE")) {
        setProvisionError(onboarding.gatewayOffline);
      } else {
        setProvisionError(onboarding.genericError);
      }
      setIsProvisioning(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-12">
      {/* Progress indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 w-12 rounded-full transition-colors ${
              s <= step ? "bg-magenta" : "bg-[hsl(var(--muted))]"
            }`}
          />
        ))}
        <span className="ml-3 text-xs text-[hsl(var(--muted-foreground))]">
          {onboarding.step} {step} {onboarding.of} 4
        </span>
      </div>

      {/* Step content */}
      <div className="flex-1">
        {step === 1 && (
          <StepWorkspace
            workspaceName={workspaceName}
            setWorkspaceName={setWorkspaceName}
            userName={userName}
            setUserName={setUserName}
          />
        )}
        {step === 2 && (
          <StepNeeds
            selected={selectedNeeds}
            onToggle={toggleNeed}
            error={needsError}
          />
        )}
        {step === 3 && (
          <StepAgent
            agentName={agentName}
            setAgentName={setAgentName}
            personality={personality}
            setPersonality={setPersonality}
          />
        )}
        {step === 4 && (
          <StepReview
            workspaceName={workspaceName}
            userName={userName}
            selectedNeeds={selectedNeeds}
            agentName={agentName}
            personality={personality}
            isProvisioning={isProvisioning}
            error={provisionError}
            onLaunch={handleLaunch}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="rounded-md px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] disabled:invisible"
        >
          {onboarding.back}
        </button>

        {step < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="rounded-md bg-magenta px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-magenta/90 disabled:opacity-50"
          >
            {onboarding.next}
          </button>
        ) : (
          /* Step 4 has its own launch button inside StepReview */
          <div />
        )}
      </div>
    </div>
  );
}

/* ── Step 1: Workspace + User Name ─────────────────────────── */

function StepWorkspace({
  workspaceName,
  setWorkspaceName,
  userName,
  setUserName,
}: {
  workspaceName: string;
  setWorkspaceName: (v: string) => void;
  userName: string;
  setUserName: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {onboarding.step1Title}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            {onboarding.workspaceNameLabel}
          </label>
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder={onboarding.workspaceNamePlaceholder}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            {onboarding.userNameLabel}
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder={onboarding.userNamePlaceholder}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
          />
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Needs Selection ───────────────────────────────── */

function StepNeeds({
  selected,
  onToggle,
  error,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  error: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          {onboarding.step2Title}
        </h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          {onboarding.step2Subtitle}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {NEED_IDS.map((id) => {
          const need = onboarding.needs[id];
          if (!need) return null;
          const isSelected = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
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

      {error && (
        <p className="text-sm text-[hsl(var(--destructive))]">
          {onboarding.needsValidation}
        </p>
      )}
    </div>
  );
}

/* ── Step 3: Agent Personalization ─────────────────────────── */

function StepAgent({
  agentName,
  setAgentName,
  personality,
  setPersonality,
}: {
  agentName: string;
  setAgentName: (v: string) => void;
  personality: string;
  setPersonality: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {onboarding.step3Title}
      </h2>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
          {onboarding.agentNameLabel}
        </label>
        <input
          type="text"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder={onboarding.agentNamePlaceholder}
          maxLength={50}
          className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
          autoFocus
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">
          {onboarding.personalityLabel}
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
    </div>
  );
}

/* ── Step 4: Review + Launch ───────────────────────────────── */

function StepReview({
  workspaceName,
  userName,
  selectedNeeds,
  agentName,
  personality,
  isProvisioning,
  error,
  onLaunch,
}: {
  workspaceName: string;
  userName: string;
  selectedNeeds: string[];
  agentName: string;
  personality: string;
  isProvisioning: boolean;
  error: string | null;
  onLaunch: () => void;
}) {
  const personalityLabel =
    onboarding.personalities[personality]?.title || personality;
  const needLabels = selectedNeeds
    .map((id) => onboarding.needs[id]?.title)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {onboarding.step4Title}
      </h2>

      <div className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <ReviewRow label={onboarding.reviewWorkspace} value={workspaceName} />
        <ReviewRow label={onboarding.reviewUser} value={userName} />
        <ReviewRow label={onboarding.reviewNeeds} value={needLabels.join(", ")} />
        <ReviewRow label={onboarding.reviewAgent} value={agentName} />
        <ReviewRow label={onboarding.reviewPersonality} value={personalityLabel} />
      </div>

      <div className="text-center">
        <button
          onClick={onLaunch}
          disabled={isProvisioning}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-magenta px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-magenta/90 disabled:opacity-50"
        >
          {isProvisioning ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {onboarding.launching}
            </>
          ) : (
            onboarding.launchCta
          )}
        </button>

        {error && (
          <p className="mt-4 text-sm text-[hsl(var(--destructive))]">{error}</p>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <span className="text-right text-sm font-medium text-[hsl(var(--foreground))]">
        {value}
      </span>
    </div>
  );
}
