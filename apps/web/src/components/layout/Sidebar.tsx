import { Link, useLocation } from "react-router-dom";
import { content } from "@/lib/content";
import { useCurrentUser } from "@/hooks/use-current-user";
import { 
  LayoutDashboard, 
  MessageCircle, 
  FolderOpen, 
  CheckSquare, 
  FileText, 
  BarChart3, 
  Trophy, 
  Bot, 
  Users, 
  Settings,
  Lock,
  type LucideIcon
} from "lucide-react";

const { sidebar } = content.studio;

interface NavItem {
  label: string;
  subtitle?: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  highlight?: "amber";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function getNavSections(slug: string): NavSection[] {
  return [
    {
      title: "ZONA DE TRABAJO",
      items: [
        { 
          label: sidebar.dashboard, 
          subtitle: "Vista general · inicio de sesión",
          href: `/studio/${slug}`, 
          icon: LayoutDashboard 
        },
        { 
          label: sidebar.chat, 
          subtitle: "Uso más frecuente",
          href: `/studio/${slug}/chat`, 
          icon: MessageCircle 
        },
        { 
          label: sidebar.projects, 
          subtitle: "Contenedor de chats y tareas",
          href: `/studio/${slug}/projects`, 
          icon: FolderOpen 
        },
        { 
          label: sidebar.tasks, 
          subtitle: "Vista global de todas las tareas",
          href: `/studio/${slug}/tasks`, 
          icon: CheckSquare 
        },
      ],
    },
    {
      title: "RECURSOS",
      items: [
        { 
          label: sidebar.files, 
          subtitle: "Consulta puntual",
          href: `/studio/${slug}/files`, 
          icon: FileText 
        },
        { 
          label: sidebar.activity, 
          subtitle: "Próximamente",
          href: `/studio/${slug}/activity`, 
          icon: BarChart3,
          disabled: true,
        },
      ],
    },
    {
      title: "MODO ESPECIAL",
      items: [
        { 
          label: "Hackathon", 
          subtitle: "Flujo guiado",
          href: `/studio/${slug}/hackathon`, 
          icon: Trophy,
          highlight: "amber",
        },
      ],
    },
  ];
}

function getConfigItems(slug: string): NavItem[] {
  return [
    { label: sidebar.agent, href: `/studio/${slug}/agents`, icon: Bot },
    { label: sidebar.team, subtitle: "Próximamente", href: `/studio/${slug}/team`, icon: Users, disabled: true },
    { label: sidebar.settings, href: `/studio/${slug}/settings`, icon: Settings },
  ];
}

export default function Sidebar({
  slug,
  onNavigate,
}: {
  slug: string;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const { data: currentUser } = useCurrentUser();
  const sections = getNavSections(slug);
  const configItems = getConfigItems(slug);

  if (currentUser?.role === "admin") {
    configItems.push({
      label: content.studio.admin.sidebar,
      href: "/admin",
      icon: Lock,
    });
  }

  function isActive(href: string) {
    if (href === `/studio/${slug}`) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))]">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-[hsl(var(--sidebar-border))] px-4">
        <Link to="/studio" onClick={onNavigate} className="flex items-center gap-2">
          <img src="/logo.svg" alt="" width={24} height={24} />
          <span className="text-lg">
            <span className="font-sans font-medium text-[hsl(var(--sidebar-foreground))]">
              Godínez
            </span>
            <span className="text-gold">.</span>
            <span
              className="font-serif italic font-bold text-magenta inline-block"
              style={{ transform: "skewX(6deg)" }}
            >
              AI
            </span>
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2">
        {sections.map((section) => (
          <div key={section.title} className="mb-2">
            {/* Section Title */}
            <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-[hsl(var(--sidebar-foreground))]/[0.27] uppercase">
              {section.title}
            </div>
            
            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.disabled ? "#" : item.href}
                    onClick={item.disabled ? (e) => e.preventDefault() : onNavigate}
                    className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors ${
                      item.disabled
                        ? "opacity-70 cursor-not-allowed text-[hsl(var(--sidebar-foreground))]/[0.27]"
                        : item.highlight === "amber"
                        ? isActive(item.href)
                          ? "bg-amber-500/20 text-amber-400 font-medium"
                          : "text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-400"
                        : isActive(item.href)
                        ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))] font-medium"
                        : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 stroke-[1.5] ${section.title === "ZONA DE TRABAJO" ? "-mt-1" : "-mt-0.5"}`} />
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      {item.subtitle && (
                        <span className={`text-[10px] ${item.disabled ? "text-[hsl(var(--sidebar-foreground))]/[0.27]" : "text-[hsl(var(--sidebar-foreground))]/30"}`}>
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Configuration Section */}
      <nav className="border-t border-[hsl(var(--sidebar-border))] px-2 py-2">
        <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-[hsl(var(--sidebar-foreground))]/[0.27] uppercase">
          CONFIGURACIÓN
        </div>
        {configItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.disabled ? "#" : item.href}
              onClick={item.disabled ? (e) => e.preventDefault() : onNavigate}
              className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors ${
                item.disabled
                  ? "opacity-70 cursor-not-allowed text-[hsl(var(--sidebar-foreground))]/[0.27]"
                  : isActive(item.href)
                  ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))] font-medium"
                  : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
              }`}
            >
              <Icon className="w-4 h-4 stroke-[1.5] mt-0.5" />
              <div className="flex flex-col">
                <span>{item.label}</span>
                {item.subtitle && (
                  <span className="text-[10px] text-[hsl(var(--sidebar-foreground))]/[0.27]">
                    {item.subtitle}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
