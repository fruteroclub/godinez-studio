import { useState } from "react";
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
  Users, 
  Settings,
  Lock,
  PanelLeftClose,
  PanelLeft,
  Plus,
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
          subtitle: "Vista general",
          href: `/studio/${slug}`, 
          icon: LayoutDashboard 
        },
        { 
          label: sidebar.chat, 
          subtitle: "Conversaciones",
          href: `/studio/${slug}/chat`, 
          icon: MessageCircle 
        },
        { 
          label: sidebar.projects, 
          subtitle: "Proyectos",
          href: `/studio/${slug}/projects`, 
          icon: FolderOpen 
        },
        { 
          label: sidebar.tasks, 
          subtitle: "Tareas",
          href: `/studio/${slug}/tasks`, 
          icon: CheckSquare 
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
    {
      title: "RECURSOS",
      items: [
        { 
          label: sidebar.files, 
          subtitle: "Archivos",
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
  ];
}

function getConfigItems(slug: string): NavItem[] {
  return [
    { label: sidebar.team, subtitle: "Próximamente", href: `/studio/${slug}/team`, icon: Users, disabled: true },
    { label: sidebar.settings, href: `/studio/${slug}/settings`, icon: Settings },
  ];
}

export default function Sidebar({
  slug,
  onNavigate,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: {
  slug: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;
  
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


  // Collapsed view - minimal icons only
  if (collapsed) {
    return (
      <aside className="flex h-full w-14 flex-col overflow-hidden border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))]">
        {/* Toggle button */}
        <div className="flex h-14 min-h-14 shrink-0 items-center justify-center border-b border-[hsl(var(--border))]">
          <button
            onClick={() => setCollapsed(false)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))] transition-colors"
            title="Abrir barra lateral Ctrl+."
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col items-center gap-1 py-1">
          <Link
            to={`/studio/${slug}/chat/new`}
            onClick={onNavigate}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))] transition-colors"
            title="Nuevo chat"
          >
            <Plus className="h-5 w-5" />
          </Link>
        {/* Divider */}
        </div>
        <div className="mx-3 border-t border-[hsl(var(--sidebar-border))]" />

        {/* Navigation icons */}
        <nav className="flex flex-1 flex-col items-center gap-1 py-1">
          {sections.flatMap((section) =>
            section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.disabled ? "#" : item.href}
                  onClick={item.disabled ? (e) => e.preventDefault() : onNavigate}
                  title={item.label}
                  className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                    item.disabled
                      ? "opacity-40 cursor-not-allowed text-[hsl(var(--sidebar-foreground))]/50"
                      : item.highlight === "amber"
                      ? isActive(item.href)
                        ? "bg-amber-500/20 text-amber-400"
                        : "text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400"
                      : isActive(item.href)
                      ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]"
                      : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
                  }`}
                >
                  <Icon className="h-5 w-5 stroke-[1.5]" />
                </Link>
              );
            })
          )}
        </nav>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-1 border-t border-[hsl(var(--sidebar-border))] py-1">
          {configItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.disabled ? "#" : item.href}
                onClick={item.disabled ? (e) => e.preventDefault() : onNavigate}
                title={item.label}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                  item.disabled
                    ? "opacity-40 cursor-not-allowed text-[hsl(var(--sidebar-foreground))]/50"
                    : isActive(item.href)
                    ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]"
                    : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
                }`}
              >
                <Icon className="h-5 w-5 stroke-[1.5]" />
              </Link>
            );
          })}
          
        </div>
      </aside>
    );
  }

  // Expanded view
  return (
    <aside className="flex h-full w-60 flex-col overflow-hidden border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))]">
      {/* Header */}
      <div className="flex h-14 min-h-14 shrink-0 items-center justify-between border-b border-[hsl(var(--border))] px-3">
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
        
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))] transition-colors"
          title="Cerrar barra lateral Ctrl+."
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex flex-col gap-0.5 px-2 py-1">
        <Link to={`/studio/${slug}/chat/new`} onClick={onNavigate} className="flex items-center gap-3 rounded-md px-3 py-1 text-sm text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))] transition-colors">
          <Plus className="h-4 w-4" />
          <span>Nuevo chat</span>
        </Link>
      </div>
      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {sections.map((section) => (
          <div key={section.title} className="mb-2">
            <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-[hsl(var(--sidebar-foreground))]/[0.27] uppercase">
              {section.title}
            </div>
            
            <div className="space-y-0.5">
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
                    <Icon className="w-4 h-4 stroke-[1.5]" />
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

      {/* Configuration Section - anchored to bottom */}
      <nav className="mt-auto border-t border-[hsl(var(--sidebar-border))] px-2 py-1">
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
              <Icon className="w-4 h-4 stroke-[1.5]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        
      </nav>
    </aside>
  );
}
