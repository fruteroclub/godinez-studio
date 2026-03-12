import { useState } from "react";
import {
  useDashboard,
  useErrors,
  useFeedback,
  useResolveError,
  useUpdateFeedbackStatus,
  useDeleteFeedback,
  getPriorityColor,
} from "@/hooks/use-errors";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Bug,
  Lightbulb,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
  Server,
  Layers,
  Trash2,
  ArrowLeft,
  Database,
  Globe,
  Monitor,
  Activity,
} from "lucide-react";

// Categorías de errores
const ERROR_CATEGORIES = {
  frontend: {
    name: "Frontend",
    icon: Monitor,
    codes: ["REACT_ERROR", "UI_ERROR", "RENDER_ERROR", "CLIENT_ERROR"],
    description: "Interfaz y React",
  },
  backend: {
    name: "Backend",
    icon: Server,
    codes: ["API_ERROR", "SERVER_ERROR", "ROUTE_ERROR", "VALIDATION_ERROR", "REQUEST_INVALID", "REQUEST_TIMEOUT", "RATE_LIMITED"],
    description: "API y servidor",
  },
  gateway: {
    name: "Gateway",
    icon: Activity,
    codes: ["GATEWAY_DOWN", "GATEWAY_TOKEN_INVALID", "TUNNEL_DOWN", "TAILSCALE_DOWN", "AWS_DOWN"],
    description: "Conexión agentes",
  },
  agents: {
    name: "Agentes",
    icon: Cpu,
    codes: ["AGENT_CRASH", "AGENT_TIMEOUT", "AGENT_MISCONFIGURED", "AGENT_RESTART_UNEXPECTED", "AGENT_EMPTY_RESPONSE", "AGENT_ERROR", "CONTEXT_OVERFLOW", "AGENT_RATE_LIMITED", "ANTHROPIC_TOKEN_INVALID", "ANTHROPIC_SUBSCRIPTION_DOWN"],
    description: "IA principal",
  },
  subagents: {
    name: "Sub-agentes",
    icon: Layers,
    codes: ["SUBAGENT_SPAWN_FAILED", "SUBAGENT_CRASH", "SUBAGENT_TIMEOUT", "SUBAGENT_MISCONFIGURED", "SUBAGENT_ORPHANED"],
    description: "Tareas delegadas",
  },
  database: {
    name: "Base de datos",
    icon: Database,
    codes: ["DB_CONNECTION_LOST", "DB_QUERY_FAILED", "DB_TIMEOUT", "STORAGE_FULL", "DISK_FULL"],
    description: "Consultas y conexiones",
  },
  communication: {
    name: "Comunicación",
    icon: Zap,
    codes: ["SSE_DISCONNECT", "WEBSOCKET_CLOSED", "WEBSOCKET_ERROR", "MESSAGE_LOST", "MESSAGE_DROPPED", "RESPONSE_TRUNCATED"],
    description: "Tiempo real",
  },
  external: {
    name: "Externos",
    icon: Globe,
    codes: [
      // Auth (Clerk)
      "CLERK_DOWN", "CLERK_TOKEN_INVALID", "AUTH_SERVICE_DOWN",
      // AI Provider (Anthropic)
      "ANTHROPIC_DOWN", "ANTHROPIC_RATE_LIMITED", "ANTHROPIC_TOKEN_INVALID", "ANTHROPIC_QUOTA_EXCEEDED",
      // OpenClaw
      "OPENCLAW_DOWN", "OPENCLAW_VERSION_MISMATCH",
      // Otros servicios
      "EXTERNAL_API_DOWN", "EXTERNAL_API_TIMEOUT", "THIRD_PARTY_ERROR",
      // Vercel/Hosting
      "VERCEL_DOWN", "CDN_ERROR", "DNS_ERROR",
    ],
    description: "Servicios de terceros",
  },
};

type CategoryKey = keyof typeof ERROR_CATEGORIES;
type ViewType = "overview" | "category" | "feedback";

// Calcular salud basado en errores
function calculateHealth(errors: any[]): { percent: number; status: "healthy" | "warning" | "critical" } {
  if (errors.length === 0) {
    return { percent: 100, status: "healthy" };
  }

  // Penalización por prioridad
  let damage = 0;
  for (const error of errors) {
    switch (error.priority) {
      case "P0": damage += 25; break;
      case "P1": damage += 15; break;
      case "P2": damage += 8; break;
      case "P3": damage += 3; break;
      default: damage += 5;
    }
  }

  const percent = Math.max(0, 100 - damage);
  
  let status: "healthy" | "warning" | "critical";
  if (percent >= 85) status = "healthy";
  else if (percent >= 50) status = "warning";
  else status = "critical";

  return { percent, status };
}

// Health Bar Component - sutil en cards (hover), siempre visible en banner
function HealthBar({ percent, size = "md", showOnHover = false }: { percent: number; size?: "sm" | "md" | "lg"; showOnHover?: boolean }) {
  const getColor = () => {
    if (percent >= 85) {
      // showOnHover=true: gris→verde en hover (para cards)
      // showOnHover=false: siempre verde (para banner principal)
      return showOnHover ? "bg-zinc-600 group-hover:bg-green-500 transition-colors" : "bg-green-500";
    }
    if (percent >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTextColor = () => {
    if (percent >= 85) {
      return showOnHover ? "text-zinc-500 group-hover:text-green-400 transition-colors" : "text-green-400";
    }
    if (percent >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const heights = { sm: "h-1.5", md: "h-2", lg: "h-3" };
  const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-lg" };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-zinc-800 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`${getColor()} ${heights[size]} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`font-bold ${getTextColor()} ${textSizes[size]} min-w-[3rem] text-right`}>
        {percent}%
      </span>
    </div>
  );
}

// Status Badge
function StatusBadge({ status }: { status: "healthy" | "warning" | "critical" }) {
  const config = {
    healthy: { bg: "bg-green-500/20", text: "text-green-400", label: "Saludable" },
    warning: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Advertencia" },
    critical: { bg: "bg-red-500/20", text: "text-red-400", label: "Crítico" },
  };
  const c = config[status];
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export default function ErrorsPage() {
  const [view, setView] = useState<ViewType>("overview");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useDashboard();
  const { data: allErrors, isLoading: errorsLoading, refetch: refetchErrors } = useErrors({
    resolved: showResolved,
  });
  const { data: feedback, isLoading: feedbackLoading, refetch: refetchFeedback } = useFeedback();
  const resolveError = useResolveError();
  const updateFeedback = useUpdateFeedbackStatus();
  const deleteFeedback = useDeleteFeedback();

  // Errores sin resolver
  const unresolvedErrors = (allErrors || []).filter(e => !e.resolved);

  // Calcular errores y salud por categoría
  const categoryData = Object.entries(ERROR_CATEGORIES).reduce((acc, [key, cat]) => {
    const errors = unresolvedErrors.filter(e => cat.codes.includes(e.code));
    acc[key as CategoryKey] = {
      errors,
      health: calculateHealth(errors),
    };
    return acc;
  }, {} as Record<CategoryKey, { errors: any[]; health: { percent: number; status: "healthy" | "warning" | "critical" } }>);

  // Salud general
  const overallHealth = calculateHealth(unresolvedErrors);

  // Errores sin categoría
  const uncategorizedErrors = unresolvedErrors.filter(e => {
    const allCodes = Object.values(ERROR_CATEGORIES).flatMap(c => c.codes);
    return !allCodes.includes(e.code);
  });

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Vista de categoría específica
  if (view === "category" && selectedCategory) {
    const category = ERROR_CATEGORIES[selectedCategory];
    const data = categoryData[selectedCategory];

    return (
      <div className="space-y-6">
        {/* Header con back */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setView("overview");
              setSelectedCategory(null);
            }}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <category.icon className="w-6 h-6 text-zinc-400" />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">{category.name}</h2>
                <StatusBadge status={data.health.status} />
              </div>
              <p className="text-sm text-zinc-500">{category.description}</p>
            </div>
          </div>
          <button
            onClick={() => refetchErrors()}
            className="p-2 text-zinc-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Health bar grande */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Salud de {category.name}</span>
            <span className="text-sm text-zinc-500">{data.errors.length} errores</span>
          </div>
          <HealthBar percent={data.health.percent} size="lg" />
        </div>

        {/* Lista de errores */}
        <ErrorsList
          errors={data.errors}
          isLoading={errorsLoading}
          showResolved={showResolved}
          setShowResolved={setShowResolved}
          onRefresh={() => refetchErrors()}
          onResolve={(id) => resolveError.mutate(id)}
          isResolving={resolveError.isPending}
          emptyMessage={`${category.name} está funcionando perfectamente`}
        />
      </div>
    );
  }

  // Vista de Feedback
  if (view === "feedback") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView("overview")}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Feedback de usuarios</h2>
              <p className="text-sm text-zinc-500">Bugs y sugerencias</p>
            </div>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => refetchFeedback()}
              className="p-2 text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <FeedbackList
          feedback={feedback || []}
          isLoading={feedbackLoading}
          onRefresh={() => refetchFeedback()}
          onUpdateStatus={(id, status) => updateFeedback.mutate({ id, status })}
          onDelete={(id) => deleteFeedback.mutate(id)}
          isUpdating={updateFeedback.isPending}
          isDeleting={deleteFeedback.isPending}
        />
      </div>
    );
  }

  // Vista Overview (principal)
  const statusConfig = {
    healthy: { icon: CheckCircle, bg: "bg-zinc-900", border: "border-zinc-700", text: "text-green-400" },
    warning: { icon: AlertTriangle, bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
    critical: { icon: AlertTriangle, bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
  };
  const statusStyle = statusConfig[overallHealth.status];
  const StatusIcon = statusStyle.icon;

  return (
    <div className="space-y-6">
      {/* Health Banner General */}
      <div className={`p-5 rounded-xl border ${statusStyle.bg} ${statusStyle.border}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-6 h-6 ${statusStyle.text}`} />
            <div>
              <h3 className={`font-semibold ${statusStyle.text}`}>
                {overallHealth.status === "healthy" ? "Sistema Saludable" : 
                 overallHealth.status === "warning" ? "Requiere Atención" : "Estado Crítico"}
              </h3>
              <p className="text-sm text-zinc-400">
                {unresolvedErrors.length} {unresolvedErrors.length === 1 ? 'error' : 'errores'} sin resolver
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              refetchDashboard();
              refetchErrors();
            }}
            className="p-2 text-zinc-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {/* Barra de salud general */}
        <HealthBar percent={overallHealth.percent} size="lg" />
        
        {/* Stats */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-zinc-700/50">
          <div>
            <div className="text-2xl font-bold text-white">{dashboard?.health?.totalErrors || 0}</div>
            <div className="text-xs text-zinc-500">Total histórico</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">{dashboard?.health?.criticalErrors || 0}</div>
            <div className="text-xs text-zinc-500">P0/P1</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-400">{dashboard?.health?.errorsToday || 0}</div>
            <div className="text-xs text-zinc-500">Hoy</div>
          </div>
        </div>
      </div>

      {/* Categorías Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(ERROR_CATEGORIES).map(([key, category]) => {
          const data = categoryData[key as CategoryKey];
          const Icon = category.icon;
          const hasErrors = data.errors.length > 0;

          return (
            <button
              key={key}
              onClick={() => {
                setSelectedCategory(key as CategoryKey);
                setView("category");
              }}
              className={`group p-4 rounded-xl border transition-all text-left hover:scale-[1.02] ${
                hasErrors
                  ? "bg-zinc-900 border-zinc-700 hover:border-zinc-600"
                  : "bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-5 h-5 ${hasErrors ? 'text-zinc-300' : 'text-zinc-600'}`} />
                {/* Palomita verde siempre visible cuando está bien */}
                <span className={`text-xs px-2 py-0.5 rounded ${
                  data.health.percent >= 85 ? 'bg-green-500/20 text-green-400' :
                  data.health.percent >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {data.errors.length > 0 ? `${data.errors.length} error${data.errors.length > 1 ? 'es' : ''}` : '✓'}
                </span>
              </div>
              
              <div className={`font-medium mb-1 ${hasErrors ? 'text-white' : 'text-zinc-500'}`}>
                {category.name}
              </div>
              <div className="text-xs text-zinc-500 mb-3">{category.description}</div>
              
              {/* Mini health bar - gris hasta hover, luego verde */}
              <HealthBar percent={data.health.percent} size="sm" showOnHover />
            </button>
          );
        })}
      </div>

      {/* Errores sin categoría */}
      {uncategorizedErrors.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="font-medium text-white mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-zinc-400" />
            Otros errores ({uncategorizedErrors.length})
          </h3>
          <div className="space-y-2">
            {uncategorizedErrors.slice(0, 5).map((error) => (
              <ErrorRow
                key={error.id}
                error={error}
                onResolve={() => resolveError.mutate(error.id)}
                isResolving={resolveError.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Feedback Card */}
      <button
        onClick={() => setView("feedback")}
        className="w-full p-4 rounded-xl border bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <div>
              <div className="font-medium text-white">Feedback de usuarios</div>
              <div className="text-xs text-zinc-500">Bugs y sugerencias</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {dashboard?.feedback?.new ? (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {dashboard.feedback.new} nuevos
              </span>
            ) : null}
            <span className="text-xl font-bold text-zinc-400">
              {dashboard?.feedback?.total || 0}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

// Errors List Component
function ErrorsList({
  errors,
  isLoading,
  showResolved,
  setShowResolved,
  onRefresh,
  onResolve,
  isResolving,
  emptyMessage = "No hay errores",
}: {
  errors: any[];
  isLoading: boolean;
  showResolved: boolean;
  setShowResolved: (v: boolean) => void;
  onRefresh: () => void;
  onResolve: (id: number) => void;
  isResolving: boolean;
  emptyMessage?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded bg-zinc-800 border-zinc-700"
          />
          Ver resueltos
        </label>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      ) : errors.length > 0 ? (
        <div className="space-y-2">
          {errors.map((error) => (
            <ErrorRow
              key={error.id}
              error={error}
              onResolve={() => onResolve(error.id)}
              isResolving={isResolving}
              showChain
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-green-500/5 rounded-lg border border-green-500/20">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
          <p className="text-green-400 font-medium">{emptyMessage}</p>
          <p className="text-xs text-zinc-500 mt-1">100% operativo</p>
        </div>
      )}
    </div>
  );
}

// Error Row Component
function ErrorRow({
  error,
  onResolve,
  isResolving,
  showChain = false,
}: {
  error: {
    id: number;
    code: string;
    message: string;
    userMessage: string;
    priority: string;
    path: string | null;
    chain?: { gateway?: string; agent?: string; subagent?: string; workspaceId?: number } | null;
    resolved: boolean;
    createdAt: string;
  };
  onResolve: () => void;
  isResolving: boolean;
  showChain?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-mono ${getPriorityColor(error.priority)}`}>
            {error.priority}
          </span>
          <div>
            <div className="font-mono text-sm text-white">{error.code}</div>
            <div className="text-xs text-zinc-500">
              {error.chain?.agent || error.path || "—"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {error.chain?.agent && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
              {error.chain.agent}
            </span>
          )}
          <div className="text-xs text-zinc-500">
            {new Date(error.createdAt).toLocaleString()}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
          {showChain && error.chain && (
            <div className="bg-zinc-950 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-2">Cadena de impacto</div>
              <div className="flex items-center gap-2 text-sm">
                {error.chain.gateway && (
                  <>
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                      Gateway
                    </span>
                    <span className="text-zinc-500">→</span>
                  </>
                )}
                {error.chain.agent && (
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs">
                    {error.chain.agent}
                  </span>
                )}
                {error.chain.subagent && (
                  <>
                    <span className="text-zinc-500">→</span>
                    <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs">
                      {error.chain.subagent}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-zinc-500 mb-1">Mensaje</div>
            <div className="text-sm text-zinc-300">{error.userMessage || error.message}</div>
          </div>

          <div>
            <div className="text-xs text-zinc-500 mb-1">Detalles técnicos</div>
            <div className="text-sm text-zinc-300 font-mono bg-zinc-950 p-2 rounded text-xs">
              {error.message}
            </div>
          </div>

          {!error.resolved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResolve();
              }}
              disabled={isResolving}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {isResolving ? "Resolviendo..." : "Marcar resuelto"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Feedback List Component
function FeedbackList({
  feedback,
  isLoading,
  onRefresh,
  onUpdateStatus,
  onDelete,
  isUpdating,
  isDeleting,
}: {
  feedback: any[];
  isLoading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}) {
  const typeIcons: Record<string, typeof Bug> = {
    bug: Bug,
    feature: Lightbulb,
    comment: MessageSquare,
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-500/20 text-blue-400",
    reviewing: "bg-yellow-500/20 text-yellow-400",
    resolved: "bg-green-500/20 text-green-400",
    dismissed: "bg-zinc-500/20 text-zinc-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      ) : feedback.length > 0 ? (
        <div className="space-y-2">
          {feedback.map((item) => {
            const TypeIcon = typeIcons[item.type] || MessageSquare;
            return (
              <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <TypeIcon className="w-5 h-5 text-zinc-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-white">{item.message}</div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                        {item.email && <span>{item.email}</span>}
                        <span>·</span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${statusColors[item.status] || statusColors.new}`}>
                      {item.status}
                    </span>
                    {item.status === "new" && (
                      <button
                        onClick={() => onUpdateStatus(item.id, "reviewing")}
                        disabled={isUpdating}
                        className="text-xs text-zinc-400 hover:text-white disabled:opacity-50 p-1"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    )}
                    {item.status === "reviewing" && (
                      <button
                        onClick={() => onUpdateStatus(item.id, "resolved")}
                        disabled={isUpdating}
                        className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50 p-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(item.id)}
                      disabled={isDeleting}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-400">No hay feedback</p>
        </div>
      )}
    </div>
  );
}
