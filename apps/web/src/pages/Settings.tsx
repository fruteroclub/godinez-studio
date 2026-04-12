import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useUpdateWorkspace, useDeleteWorkspace, useWorkspaceUsage } from "@/hooks/use-workspace";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "@/lib/api";
import { content } from "@/lib/content";
import {
  Bot,
  ChevronLeft,
  Settings as SettingsIcon,
  User,
  Link,
  CreditCard,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import Agents from "./Agents";

const { settings: sc, onboarding } = content.studio;

const ROLE_IDS = ["negocio", "marketing", "ventas", "admin", "tech", "educacion", "creatividad", "consultoria", "otra"] as const;
const MAX_ROLES = 5;

interface UserContext {
  projectType: string | null;
  projectSubtype: string | null;
  jobRole?: string | null;
}

type TabId = "general" | "agente" | "perfil" | "uso" | "integraciones" | "facturacion" | "peligro";

const TABS: { id: TabId; label: string; Icon: typeof SettingsIcon }[] = [
  { id: "general", label: "General", Icon: SettingsIcon },
  { id: "agente", label: "Agente", Icon: Bot },
  { id: "perfil", label: "Perfil", Icon: User },
  { id: "uso", label: "Uso", Icon: BarChart3 },
  { id: "integraciones", label: "Integraciones", Icon: Link },
  { id: "facturacion", label: "Facturación", Icon: CreditCard },
  { id: "peligro", label: "Zona peligrosa", Icon: AlertTriangle },
];

function UsageBar({ label, used, limit, format }: {
  label: string;
  used: number;
  limit: number;
  format: "tokens" | "bytes" | "number";
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isHigh = pct >= 80;

  function fmt(value: number) {
    if (format === "bytes") {
      if (value === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(value) / Math.log(k));
      return `${(value / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }
    if (format === "tokens") {
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return String(value);
    }
    return String(value);
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
        <span className="text-[hsl(var(--foreground))]">
          {fmt(used)} / {fmt(limit)}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[hsl(var(--muted))]">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? "bg-red-500" : "bg-magenta"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Settings() {
  const { workspace, slug } = useWorkspace();
  const updateWorkspace = useUpdateWorkspace(workspace?.id ?? 0);
  const deleteWorkspace = useDeleteWorkspace(workspace?.id ?? 0);
  const { data: usage } = useWorkspaceUsage(workspace?.id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") as TabId | null;
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabId>(tabFromUrl || "general");
  const [name, setName] = useState(workspace?.name ?? "");
  const [deleteSlug, setDeleteSlug] = useState("");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [saveFlash, setSaveFlash] = useState(false);

  // Fetch user context (includes jobRole)
  const { data: userContext } = useQuery({
    queryKey: ["userContext"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<UserContext>("/api/context", { token });
    },
  });

  // Update roles when context loads
  useEffect(() => {
    if (userContext?.jobRole) {
      setUserRoles(userContext.jobRole.split(",").map(r => r.trim()).filter(Boolean));
    }
  }, [userContext]);

  // Mutation to update user role
  const updateRole = useMutation({
    mutationFn: async (role: string) => {
      const token = await getToken();
      return apiFetch("/api/context/role", {
        method: "PATCH",
        body: JSON.stringify({ jobRole: role }),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userContext"] });
    },
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    
    await updateWorkspace.mutateAsync({ name: name.trim() });
    
    const rolesString = userRoles.join(",");
    if (rolesString && rolesString !== userContext?.jobRole) {
      await updateRole.mutateAsync(rolesString);
    }
    
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  }

  async function handleDelete() {
    if (deleteSlug !== workspace?.slug) return;
    await deleteWorkspace.mutateAsync();
    navigate("/studio");
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/studio/${slug}`)}
        className="flex items-center gap-2 text-lg font-medium text-[hsl(var(--foreground))] hover:text-magenta transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Configuración</span>
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-magenta/10 text-magenta"
                    : tab.id === "peligro"
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <tab.Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {activeTab === "general" && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                  {sc.general}
                </h2>
                {saveFlash && (
                  <span className="text-sm text-green-400 animate-in fade-in">
                    ✓ Guardado
                  </span>
                )}
              </div>
              <form onSubmit={handleSave} className="mt-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-sm text-[hsl(var(--foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    ¿A qué te dedicas?
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ROLE_IDS.map((id) => {
                      const label = onboarding.roles[id];
                      if (!label) return null;
                      const isSelected = userRoles.includes(id);
                      const isDisabled = !isSelected && userRoles.length >= MAX_ROLES;
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (isSelected) {
                              setUserRoles(userRoles.filter(r => r !== id));
                            } else if (userRoles.length < MAX_ROLES) {
                              setUserRoles([...userRoles, id]);
                            }
                          }}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                            isSelected
                              ? "border-magenta bg-magenta/10 text-[hsl(var(--foreground))]"
                              : isDisabled
                              ? "border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] opacity-40 cursor-not-allowed"
                              : "border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:border-white/20"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {userRoles.length >= MAX_ROLES && (
                    <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Máximo {MAX_ROLES} roles</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    Slug
                  </label>
                  <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                    {workspace?.slug}
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={updateWorkspace.isPending || updateRole.isPending}
                  className="rounded-md bg-magenta px-5 py-2.5 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
                >
                  {sc.save}
                </button>
              </form>
            </div>
          )}

          {activeTab === "agente" && <Agents />}

          {activeTab === "perfil" && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                Perfil
              </h2>
              <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
                Configura tu información personal y preferencias de cuenta.
              </p>
              <div className="mt-6 flex items-center justify-center h-40 rounded-lg border border-dashed border-[hsl(var(--border))]">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  Próximamente
                </span>
              </div>
            </div>
          )}

          {activeTab === "uso" && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                Uso del mes
              </h2>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                Revisa el consumo de recursos de tu workspace.
              </p>
              {usage ? (
                <div className="mt-6 space-y-5">
                  <UsageBar label="Tokens" used={usage.tokens.used} limit={usage.tokens.limit} format="tokens" />
                  <UsageBar label="Almacenamiento" used={usage.storage.used} limit={usage.storage.limit} format="bytes" />
                  <UsageBar label="Miembros" used={usage.members.used} limit={usage.members.limit} format="number" />
                </div>
              ) : (
                <div className="mt-6 flex items-center justify-center h-40 rounded-lg border border-dashed border-[hsl(var(--border))]">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">
                    Cargando...
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === "integraciones" && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                Integraciones
              </h2>
              <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
                Conecta servicios externos para extender las capacidades de tu agente.
              </p>
              <div className="mt-6 flex items-center justify-center h-40 rounded-lg border border-dashed border-[hsl(var(--border))]">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  Próximamente
                </span>
              </div>
            </div>
          )}

          {activeTab === "facturacion" && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                Facturación
              </h2>
              <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
                Administra tu plan, método de pago y revisa tu historial de uso.
              </p>
              <div className="mt-6 flex items-center justify-center h-40 rounded-lg border border-dashed border-[hsl(var(--border))]">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  Próximamente
                </span>
              </div>
            </div>
          )}

          {activeTab === "peligro" && (
            <div className="rounded-lg border border-red-500/30 bg-[hsl(var(--card))] p-6">
              <h2 className="text-xl font-semibold text-red-400">{sc.danger}</h2>
              <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
                {sc.deleteConfirm}
                <code className="mx-1 rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-xs">
                  {workspace?.slug}
                </code>
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={deleteSlug}
                  onChange={(e) => setDeleteSlug(e.target.value)}
                  placeholder={workspace?.slug}
                  className="flex-1 rounded-md border border-red-500/30 bg-[hsl(var(--background))] px-4 py-2.5 text-sm text-[hsl(var(--foreground))] focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <button
                  onClick={handleDelete}
                  disabled={
                    deleteSlug !== workspace?.slug || deleteWorkspace.isPending
                  }
                  className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {sc.deleteCta}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
