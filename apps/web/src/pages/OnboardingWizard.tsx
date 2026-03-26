import { ProjectTypeIcon, ProjectSubtypeIcon, RoleIcon } from "@/lib/icons";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useCreateWorkspace } from "@/hooks/use-workspace";
import { useProvision } from "@/hooks/use-provision";
import { apiFetch } from "@/lib/api";
import { content } from "@/lib/content";
import type { Workspace } from "@godinez/types";

const { onboarding } = content.studio;

// Feature flag for V3 onboarding
const USE_ONBOARDING_V3 = true;

// === V3 Types and Constants ===
const PROJECT_TYPES = ["educacion", "profesional", "personal"] as const;
type ProjectType = typeof PROJECT_TYPES[number];

const PROJECT_SUBTYPES = {
  educacion: ["bootcamp", "aprender"] as const,
  personal: ["hackathon", "emprendimiento", "proyecto"] as const,
  profesional: ["crear_contenido", "automatizar", "construir", "investigar", "vender", "organizar"] as const,
};

type ProjectSubtype = typeof PROJECT_SUBTYPES[keyof typeof PROJECT_SUBTYPES][number];

// V3 Labels
const PROJECT_TYPE_CONFIG = {
  educacion: { title: "Educación", description: "Bootcamp, curso o aprendizaje autodidacta" },
  profesional: { title: "Profesional", description: "Trabajo, negocio o empresa" },
  personal: { title: "Personal", description: "Hackathon, emprendimiento o proyecto propio" },
};

const PROJECT_SUBTYPE_CONFIG: Record<string, { title: string; description: string }> = {
  // educacion
  bootcamp: { title: "Bootcamp o curso", description: "Estoy en un programa de aprendizaje estructurado" },
  aprender: { title: "Aprender por mi cuenta", description: "Quiero aprender algo nuevo de forma autodidacta" },
  // personal
  hackathon: { title: "Hackathon", description: "Estoy participando en un hackathon" },
  emprendimiento: { title: "Emprendimiento", description: "Estoy construyendo mi propio negocio" },
  proyecto: { title: "Proyecto en marcha", description: "Tengo un proyecto personal que quiero avanzar" },
  // profesional
  crear_contenido: { title: "Crear contenido", description: "Posts, copy, videos, marketing" },
  automatizar: { title: "Automatizar tareas", description: "Procesos, flujos, integraciones" },
  construir: { title: "Construir", description: "Apps, sitios, landing pages" },
  investigar: { title: "Investigar y analizar", description: "Datos, mercado, competencia" },
  vender: { title: "Vender y atender", description: "Comercial, soporte, clientes" },
  organizar: { title: "Organizar y planear", description: "Reportes, gestión, admin" },
};

// Legacy constants (for backward compatibility)
const ROLE_IDS = ["negocio", "marketing", "ventas", "admin", "tech", "educacion", "creatividad", "consultoria", "otra"] as const;
const NEED_IDS = ["launch", "automate", "social", "sales", "time", "research", "support", "build"] as const;
const PERSONALITY_IDS = ["professional", "friendly", "creative", "technical"] as const;

type Step = 1 | 2 | 3 | 4;

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const createWorkspace = useCreateWorkspace();

  // V3 Form state
  const [userName, setUserName] = useState("");
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [projectSubtype, setProjectSubtype] = useState<ProjectSubtype | null>(null);
  const [userRole, setUserRole] = useState("");  // Only for profesional
  const [businessDescription, setBusinessDescription] = useState("");  // Only for profesional
  
  // Legacy form state (for non-V3 or profesional needs)
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  
  // Agent config
  const [agentName, setAgentName] = useState("");
  const [personality, setPersonality] = useState<string>("friendly");
  
  // Auto-generated workspace name
  const [workspaceName, setWorkspaceName] = useState("");

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [needsError, setNeedsError] = useState(false);
  const [provisionSlug, setProvisionSlug] = useState<string | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Provision hook
  const provision = useProvision(provisionSlug || "");

  // Auto-generate workspace name based on user name and type
  useEffect(() => {
    if (userName.trim() && projectType) {
      const typeLabel = PROJECT_TYPE_CONFIG[projectType].title;
      setWorkspaceName(`${userName.trim()} - ${typeLabel}`);
    }
  }, [userName, projectType]);

  // Reset subtype when type changes
  useEffect(() => {
    setProjectSubtype(null);
    setUserRole("");
    setBusinessDescription("");
    setSelectedNeeds([]);
  }, [projectType]);

  function toggleNeed(id: string) {
    setNeedsError(false);
    setSelectedNeeds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function canAdvance(): boolean {
    if (USE_ONBOARDING_V3) {
      switch (step) {
        case 1:
          // Name + Type + Subtype required
          // Role required for all types
          const hasBasics = userName.trim().length > 0 && projectType && projectSubtype;
          return Boolean(hasBasics);
        case 2:
          // For profesional, require business description
          if (projectType === "profesional") {
            return businessDescription.trim().length > 0;
          }
          // For others, step 2 is optional/skip
          return true;
        case 3:
          return agentName.trim().length > 0;
        case 4:
          return true;
        default:
          return false;
      }
    } else {
      // Legacy validation
      switch (step) {
        case 1:
          return (
            workspaceName.trim().length > 0 &&
            userName.trim().length > 0 &&
            userRole.length > 0 &&
            businessDescription.trim().length > 0
          );
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
  }

  function handleNext() {
    if (step === 2 && !USE_ONBOARDING_V3 && selectedNeeds.length === 0) {
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
      let ws: Workspace;

      // 1. Create workspace
      try {
        ws = await createWorkspace.mutateAsync(workspaceName.trim());
      } catch (createErr) {
        const createMsg = createErr instanceof Error ? createErr.message : "";
        if (createMsg.includes("WORKSPACE_LIMIT")) {
          const token = await getToken();
          const workspaces = await apiFetch<Workspace[]>("/api/workspaces", { token });
          if (!workspaces || workspaces.length === 0) throw createErr;
          ws = workspaces[0];
        } else {
          throw createErr;
        }
      }

      setProvisionSlug(ws.slug);

      // 2. Provision agent with V3 fields
      let result: { agent: { id: number; openclawId: string; name: string }; conversationId: number };
      try {
        result = await provision.mutateAsync({
          workspaceId: ws.id,
          userName: userName.trim(),
          agentName: agentName.trim(),
          personality,
          needs: selectedNeeds.length > 0 ? selectedNeeds : undefined,
          userRole: userRole || undefined,
          businessDescription: businessDescription.trim() || undefined,
          // V3 fields
          projectType: projectType || undefined,
          projectSubtype: projectSubtype || undefined,
        });
      } catch (provisionErr) {
        const provisionMsg = provisionErr instanceof Error ? provisionErr.message : "";
        if (provisionMsg.includes("already has an agent")) {
          navigate(`/studio/${ws.slug}`);
          return;
        }
        throw provisionErr;
      }

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
        {USE_ONBOARDING_V3 ? (
          <>
            {step === 1 && (
              <StepContextV3
                userName={userName}
                setUserName={setUserName}
                projectType={projectType}
                setProjectType={setProjectType}
                projectSubtype={projectSubtype}
                setProjectSubtype={setProjectSubtype}
                userRole={userRole}
                setUserRole={setUserRole}
              />
            )}
            {step === 2 && (
              <StepDetailsV3
                projectType={projectType}
                businessDescription={businessDescription}
                setBusinessDescription={setBusinessDescription}
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
              <StepReviewV3
                userName={userName}
                projectType={projectType}
                projectSubtype={projectSubtype}
                userRole={userRole}
                businessDescription={businessDescription}
                workspaceName={workspaceName}
                setWorkspaceName={setWorkspaceName}
                agentName={agentName}
                personality={personality}
                isProvisioning={isProvisioning}
                error={provisionError}
                onLaunch={handleLaunch}
              />
            )}
          </>
        ) : (
          <>
            {step === 1 && (
              <StepWorkspaceLegacy
                workspaceName={workspaceName}
                setWorkspaceName={setWorkspaceName}
                userName={userName}
                setUserName={setUserName}
                userRole={userRole}
                setUserRole={setUserRole}
                businessDescription={businessDescription}
                setBusinessDescription={setBusinessDescription}
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
              <StepReviewLegacy
                workspaceName={workspaceName}
                userName={userName}
                userRole={userRole}
                businessDescription={businessDescription}
                selectedNeeds={selectedNeeds}
                agentName={agentName}
                personality={personality}
                isProvisioning={isProvisioning}
                error={provisionError}
                onLaunch={handleLaunch}
              />
            )}
          </>
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
          <div />
        )}
      </div>
    </div>
  );
}

/* ── V3 Step 1: Context + Profile ─────────────────────────── */

function StepContextV3({
  userName,
  setUserName,
  projectType,
  setProjectType,
  projectSubtype,
  setProjectSubtype,
  userRole,
  setUserRole,
}: {
  userName: string;
  setUserName: (v: string) => void;
  projectType: ProjectType | null;
  setProjectType: (v: ProjectType) => void;
  projectSubtype: ProjectSubtype | null;
  setProjectSubtype: (v: ProjectSubtype) => void;
  userRole: string;
  setUserRole: (v: string) => void;
}) {
  const subtypes = projectType ? PROJECT_SUBTYPES[projectType] : [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        Cuéntanos sobre ti
      </h2>

      {/* User name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
          ¿Cómo te llamas?
        </label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
          autoFocus
        />
      </div>


      {/* User role */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
          ¿A qué te dedicas?
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
                onClick={() => setUserRole(isSelected ? "" : id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                  isSelected
                    ? "border-magenta bg-magenta/10 text-[hsl(var(--foreground))]"
                    : "border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:border-white/20"
                }`}
              >
                <RoleIcon roleId={id} className="w-4 h-4 stroke-[1.5] inline mr-1.5" />{label}
              </button>
            );
          })}
        </div>
      </div>
      {/* Project type */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">
          ¿Cómo vas a usar Godínez?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {PROJECT_TYPES.map((type) => {
            const config = PROJECT_TYPE_CONFIG[type];
            const isSelected = projectType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setProjectType(type)}
                className={`relative flex flex-col items-center rounded-lg border p-4 text-center transition-all ${
                  isSelected
                    ? "border-magenta bg-magenta/10"
                    : "border-white/10 bg-[hsl(var(--card))] hover:border-white/20"
                }`}
              >
                <ProjectTypeIcon typeId={type} className="w-8 h-8 text-white" />
                <span className="mt-2 text-sm font-medium text-[hsl(var(--foreground))]">
                  {config.title}
                </span>
                <span className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {config.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Project subtype (appears after selecting type) */}
      {projectType && subtypes.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]">
            ¿Por dónde empezamos?
          </label>
          <div className={`grid gap-3 ${subtypes.length > 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-' + subtypes.length}`}>
            {subtypes.map((subtype) => {
              const config = PROJECT_SUBTYPE_CONFIG[subtype];
              if (!config) return null;
              const isSelected = projectSubtype === subtype;
              return (
                <button
                  key={subtype}
                  type="button"
                  onClick={() => setProjectSubtype(subtype as ProjectSubtype)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-magenta bg-magenta/10"
                      : "border-white/10 bg-[hsl(var(--card))] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ProjectSubtypeIcon subtypeId={subtype} className="w-5 h-5 text-white" />
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">
                      {config.title}
                    </span>
                  </div>
                  <span className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {config.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Role selector (only for profesional) */}
      {projectType === "profesional" && projectSubtype && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            ¿Cuál es tu rol?
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
      )}
    </div>
  );
}

/* ── V3 Step 2: Context Details ────────────────────────────── */

function StepDetailsV3({
  projectType,
  businessDescription,
  setBusinessDescription,
}: {
  projectType: ProjectType | null;
  businessDescription: string;
  setBusinessDescription: (v: string) => void;
}) {
  // For profesional, ask about business
  if (projectType === "profesional") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          Cuéntanos de tu negocio
        </h2>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            ¿A qué se dedica tu negocio?
          </label>
          <input
            type="text"
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            placeholder="Ej: Agencia de marketing digital, Tienda de ropa online..."
            maxLength={150}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
            autoFocus
          />
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {businessDescription.length}/150 caracteres
          </p>
        </div>
      </div>
    );
  }

  // For educacion and personal, this step is mostly informational
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        ¡Perfecto!
      </h2>
      <p className="text-[hsl(var(--muted-foreground))]">
        {projectType === "educacion" 
          ? "Tu agente estará listo para ayudarte a aprender. Podrás activar un bootcamp o curso específico desde el dashboard cuando lo necesites."
          : "Tu agente estará listo para ayudarte con tus proyectos. Podrás activar el modo hackathon desde el dashboard cuando lo necesites."
        }
      </p>
      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          💡 <strong>Tip:</strong> Cuando actives un modo específico (hackathon, bootcamp), tu agente se adaptará automáticamente con deadline y prioridades.
        </p>
      </div>
    </div>
  );
}

/* ── V3 Step 4: Review + Launch ────────────────────────────── */

function StepReviewV3({
  userName,
  projectType,
  projectSubtype,
  userRole,
  businessDescription,
  workspaceName,
  setWorkspaceName,
  agentName,
  personality,
  isProvisioning,
  error,
  onLaunch,
}: {
  userName: string;
  projectType: ProjectType | null;
  projectSubtype: ProjectSubtype | null;
  userRole: string;
  businessDescription: string;
  workspaceName: string;
  setWorkspaceName: (v: string) => void;
  agentName: string;
  personality: string;
  isProvisioning: boolean;
  error: string | null;
  onLaunch: () => void;
}) {
  const personalityLabel = onboarding.personalities[personality]?.title || personality;
  const typeLabel = projectType ? PROJECT_TYPE_CONFIG[projectType].title : "";
  const subtypeLabel = projectSubtype ? PROJECT_SUBTYPE_CONFIG[projectSubtype]?.title : "";
  const roleLabel = userRole ? onboarding.roles[userRole] : "";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        Todo listo
      </h2>

      <div className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <ReviewRow label="Tu nombre" value={userName} />
        <ReviewRow label="Contexto" value={`${typeLabel} → ${subtypeLabel}`} />
        {roleLabel && <ReviewRow label="Tu rol" value={roleLabel} />}
        {businessDescription && <ReviewRow label="Tu negocio" value={businessDescription} />}
        <ReviewRow label="Tu agente" value={agentName} />
        <ReviewRow label="Personalidad" value={personalityLabel} />
        
        {/* Editable workspace name */}
        <div className="flex items-baseline justify-between gap-4 pt-2 border-t border-[hsl(var(--border))]">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            Nombre del workspace
          </span>
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="text-right text-sm font-medium text-[hsl(var(--foreground))] bg-transparent border-b border-dashed border-[hsl(var(--muted-foreground))] focus:outline-none focus:border-magenta"
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onLaunch}
          disabled={isProvisioning}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-magenta px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-magenta/90 disabled:opacity-50"
        >
          {isProvisioning ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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

/* ── Shared: Step 3 Agent ──────────────────────────────────── */

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

/* ── Legacy Components ─────────────────────────────────────── */

function StepWorkspaceLegacy({
  workspaceName,
  setWorkspaceName,
  userName,
  setUserName,
  userRole,
  setUserRole,
  businessDescription,
  setBusinessDescription,
}: {
  workspaceName: string;
  setWorkspaceName: (v: string) => void;
  userName: string;
  setUserName: (v: string) => void;
  userRole: string;
  setUserRole: (v: string) => void;
  businessDescription: string;
  setBusinessDescription: (v: string) => void;
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

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            {onboarding.userRoleLabel}
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

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[hsl(var(--foreground))]">
            {onboarding.businessDescriptionLabel}
          </label>
          <input
            type="text"
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            placeholder={onboarding.businessDescriptionPlaceholder}
            maxLength={120}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
          />
        </div>
      </div>
    </div>
  );
}

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

function StepReviewLegacy({
  workspaceName,
  userName,
  userRole,
  businessDescription,
  selectedNeeds,
  agentName,
  personality,
  isProvisioning,
  error,
  onLaunch,
}: {
  workspaceName: string;
  userName: string;
  userRole: string;
  businessDescription: string;
  selectedNeeds: string[];
  agentName: string;
  personality: string;
  isProvisioning: boolean;
  error: string | null;
  onLaunch: () => void;
}) {
  const personalityLabel = onboarding.personalities[personality]?.title || personality;
  const roleLabel = onboarding.roles[userRole] || userRole;
  const needLabels = selectedNeeds.map((id) => onboarding.needs[id]?.title).filter(Boolean);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {onboarding.step4Title}
      </h2>

      <div className="space-y-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
        <ReviewRow label={onboarding.reviewWorkspace} value={workspaceName} />
        <ReviewRow label={onboarding.reviewUser} value={userName} />
        <ReviewRow label={onboarding.reviewRole} value={roleLabel} />
        <ReviewRow label={onboarding.reviewBusiness} value={businessDescription} />
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
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
      <span className="text-sm text-[hsl(var(--muted-foreground))]">{label}</span>
      <span className="text-right text-sm font-medium text-[hsl(var(--foreground))]">{value}</span>
    </div>
  );
}
