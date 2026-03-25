import { Link, useNavigate } from "react-router-dom";
import { useWorkspaces } from "@/hooks/use-workspace";
import { useUser } from "@clerk/clerk-react";
import { content } from "@/lib/content";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Plus, Sparkles, Code, PenLine, BookOpen, Folder, Rocket } from "lucide-react";

const { workspaceSelector } = content.studio;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️";
  if (hour < 18) return "🌤️";
  return "🌙";
}

const QUICK_ACTIONS = [
  { icon: Code, label: "Código", color: "text-blue-400" },
  { icon: PenLine, label: "Escribir", color: "text-purple-400" },
  { icon: BookOpen, label: "Aprender", color: "text-green-400" },
  { icon: Folder, label: "Proyectos", color: "text-yellow-400" },
  { icon: Rocket, label: "Hackathon", color: "text-magenta" },
];

export default function WorkspaceSelector() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const { user } = useUser();
  const navigate = useNavigate();
  
  const firstName = user?.firstName || user?.username || "Usuario";
  const greeting = getGreeting();
  const emoji = getGreetingEmoji();

  // Si no hay workspaces, mostrar pantalla de bienvenida
  if (!isLoading && (!workspaces || workspaces.length === 0)) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">
          {/* Saludo grande */}
          <h1 className="mb-8 text-4xl font-semibold text-[hsl(var(--foreground))] md:text-5xl">
            <span className="mr-3">{emoji}</span>
            {greeting}, {firstName}
          </h1>
          
          {/* Input centrado */}
          <div className="relative mb-6">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-lg transition-all focus-within:border-magenta/50 focus-within:shadow-magenta/10">
              <p className="text-left text-[hsl(var(--muted-foreground))]">
                ¿En qué te puedo ayudar hoy?
              </p>
              <div className="mt-3 flex items-center justify-between">
                <button className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  <Sparkles className="mr-1 inline h-3 w-3 text-magenta" />
                  Godinez AI
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick action chips */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate("/studio/new")}
                className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm text-[hsl(var(--foreground))] transition-all hover:border-magenta/30 hover:bg-magenta/5"
              >
                <action.icon className={`h-4 w-4 ${action.color}`} />
                {action.label}
              </button>
            ))}
          </div>
          
          {/* CTA principal */}
          <button
            onClick={() => navigate("/studio/new")}
            className="rounded-xl bg-gradient-to-r from-magenta to-magenta/80 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all hover:shadow-magenta/25 hover:scale-[1.02]"
          >
            ✨ Crear mi espacio de trabajo
          </button>
          
          <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
            Tu asistente de productividad personal
          </p>
        </div>
      </div>
    );
  }

  // Si hay workspaces, mostrar lista mejorada
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Saludo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))] md:text-4xl">
            <span className="mr-2">{emoji}</span>
            {greeting}, {firstName}
          </h1>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-magenta/20 to-magenta/5 text-xl">
                      🚀
                    </div>
                    <div>
                      <p className="font-medium text-[hsl(var(--foreground))] group-hover:text-magenta transition-colors">
                        {ws.name}
                      </p>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {ws.slug}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    ws.status === 'active' 
                      ? 'bg-green-500/10 text-green-400' 
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {ws.status === 'active' ? 'Activo' : ws.status}
                  </span>
                </Link>
              ))}
            </div>

            {/* Botón crear nuevo */}
            <button
              onClick={() => navigate("/studio/new")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[hsl(var(--border))] p-5 text-[hsl(var(--muted-foreground))] transition-all hover:border-magenta/40 hover:text-magenta"
            >
              <Plus className="h-5 w-5" />
              {workspaceSelector.create}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
