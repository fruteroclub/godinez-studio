import { WifiOff, RefreshCw, AlertTriangle, Clock } from "lucide-react";

type ConnectionState = "offline" | "reconnecting" | "timeout" | "unstable";

interface AgentOfflineBannerProps {
  state?: ConnectionState;
  message?: string;
  retryIn?: number;
  onRetry?: () => void;
}

export default function AgentOfflineBanner({ 
  state = "offline", 
  message,
  retryIn,
  onRetry 
}: AgentOfflineBannerProps) {
  const config = {
    offline: {
      icon: WifiOff,
      bg: "bg-red-500/15 border-red-500/40",
      iconColor: "text-red-400",
      textColor: "text-red-200",
      title: "Agente desconectado",
      description: message ?? "Tu agente no está disponible. Los mensajes no serán respondidos hasta que se reconecte.",
    },
    reconnecting: {
      icon: RefreshCw,
      bg: "bg-yellow-500/15 border-yellow-500/40",
      iconColor: "text-yellow-400 animate-spin",
      textColor: "text-yellow-200",
      title: "Reconectando...",
      description: message ?? "Intentando reconectar con tu agente. Espera un momento.",
    },
    timeout: {
      icon: Clock,
      bg: "bg-orange-500/15 border-orange-500/40",
      iconColor: "text-orange-400",
      textColor: "text-orange-200",
      title: "Conexión agotada",
      description: message ?? `La conexión tardó demasiado.${retryIn ? ` Reintentando en ${retryIn}s...` : ""}`,
    },
    unstable: {
      icon: AlertTriangle,
      bg: "bg-amber-500/15 border-amber-500/40",
      iconColor: "text-amber-400",
      textColor: "text-amber-200",
      title: "Conexión inestable",
      description: message ?? "La conexión con el agente es intermitente. Algunas respuestas pueden tardar.",
    },
  };

  const { icon: Icon, bg, iconColor, textColor, title, description } = config[state];

  return (
    <div 
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${bg}`}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textColor}`}>{title}</p>
        <p className={`text-xs ${textColor} opacity-80 mt-0.5`}>{description}</p>
      </div>
      {onRetry && state !== "reconnecting" && (
        <button
          onClick={onRetry}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
