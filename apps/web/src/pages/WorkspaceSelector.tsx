import { Link, useNavigate } from "react-router-dom";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useUser } from "@clerk/clerk-react";
import { content } from "@/lib/content";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { 
  Plus, 
  Sparkles, 
  Code, 
  PenLine, 
  BookOpen, 
  FolderKanban, 
  Rocket,
  Sun,
  Moon,
  CloudSun,
  ArrowRight
} from "lucide-react";

const { workspaceSelector } = content.studio;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function GreetingIcon({ className }: { className?: string }) {
  const hour = new Date().getHours();
  if (hour < 12) return <Sun className={className} />;
  if (hour < 18) return <CloudSun className={className} />;
  return <Moon className={className} />;
}

const QUICK_ACTIONS = [
  { icon: Code, label: "Código", color: "text-blue-400" },
  { icon: PenLine, label: "Escribir", color: "text-purple-400" },
  { icon: BookOpen, label: "Aprender", color: "text-green-400" },
  { icon: FolderKanban, label: "Proyectos", color: "text-yellow-400" },
  { icon: Rocket, label: "Hackathon", color: "text-magenta" },
];

export default function WorkspaceSelector() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { user } = useUser();
  const navigate = useNavigate();
  
  const firstName = user?.firstName || user?.username || "Usuario";
  const greeting = getGreeting();

  // Si no hay workspaces, mostrar pantalla de bienvenida
  if (!isLoading && (!workspaces || workspaces.length === 0)) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">
          {/* Icono de saludo */}
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-gradient-to-br from-magenta/20 to-magenta/5 p-4">
              <GreetingIcon className="h-10 w-10 text-magenta" />
            </div>
          </div>

          {/* Saludo grande */}
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] md:text-6xl">
            {greeting}, {firstName}
          </h1>
          
          <p className="mb-10 text-xl text-[hsl(var(--muted-foreground))]">
            Tu asistente de productividad personal
          </p>
          
          {/* Input centrado */}
          <div className="relative mb-8">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-lg transition-all focus-within:border-magenta/50 focus-within:shadow-magenta/10">
              <p className="text-left text-lg text-[hsl(var(--muted-foreground))]">
                ¿En qué te puedo ayudar hoy?
              </p>
              <div className="mt-4 flex items-center justify-between">
                <button className="flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                  <Plus className="h-5 w-5" />
                </button>
                <span className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))]">
                  <Sparkles className="h-4 w-4 text-magenta" />
                  Godinez AI
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick action chips */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate("/studio/new")}
                className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 py-2.5 text-sm font-medium text-[hsl(var(--foreground))] transition-all hover:border-magenta/30 hover:bg-magenta/5"
              >
                <action.icon className={`h-4 w-4 ${action.color}`} />
                {action.label}
              </button>
            ))}
          </div>
          
          {/* CTA principal */}
          <button
            onClick={() => navigate("/studio/new")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-magenta to-magenta/80 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-magenta/25 hover:scale-[1.02]"
          >
            <Sparkles className="h-5 w-5" />
            Crear mi espacio de trabajo
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // Si hay workspaces, mostrar lista mejorada
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Header con saludo */}
        <div className="mb-10 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-gradient-to-br from-magenta/20 to-magenta/5 p-3">
              <GreetingIcon className="h-8 w-8 text-magenta" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-[hsl(var(--foreground))] md:text-5xl">
            {greeting}, {firstName}
          </h1>
          
          <p className="mt-3 text-lg text-[hsl(var(--muted-foreground))]">
            ¿Con cuál espacio quieres trabajar?
          </p>
        </div>

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          <>
            {/* Lista de workspaces */}
            <div className="space-y-3">
              {workspaces?.map((ws) => (
                <Link
                  key={ws.id}
                  to={`/studio/${ws.slug}`}
                  className="group flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-all hover:border-magenta/40 hover:shadow-lg hover:shadow-magenta/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-magenta/20 to-magenta/5">
                      <Rocket className="h-6 w-6 text-magenta" />
                    </div>
                    <div>
                      <p className="font-semibold text-[hsl(var(--foreground))] group-hover:text-magenta transition-colors">
                        {ws.name}
                      </p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {ws.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      ws.status === 'active' 
                        ? 'bg-green-500/10 text-green-400' 
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {ws.status === 'active' ? 'Activo' : ws.status}
                    </span>
                    <ArrowRight className="h-5 w-5 text-[hsl(var(--muted-foreground))] opacity-0 transition-all group-hover:opacity-100 group-hover:text-magenta" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Botón crear nuevo */}
            <button
              onClick={() => navigate("/studio/new")}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[hsl(var(--border))] p-5 text-[hsl(var(--muted-foreground))] transition-all hover:border-magenta/40 hover:text-magenta"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">{workspaceSelector.create}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
