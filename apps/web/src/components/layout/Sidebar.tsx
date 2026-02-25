import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { content } from "@/lib/content";

const { sidebar } = content.studio;

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

function getNavItems(slug: string): NavItem[] {
  return [
    { label: sidebar.dashboard, href: `/studio/${slug}`, icon: "◻" },
    { label: sidebar.chat, href: `/studio/${slug}/chat`, icon: "💬" },
    { label: sidebar.projects, href: `/studio/${slug}/projects`, icon: "📁" },
    { label: sidebar.agent, href: `/studio/${slug}/agents`, icon: "🤖" },
    { label: sidebar.tasks, href: `/studio/${slug}/tasks`, icon: "✓" },
    { label: sidebar.files, href: `/studio/${slug}/files`, icon: "📄" },
    { label: sidebar.activity, href: `/studio/${slug}/activity`, icon: "📊" },
  ];
}

function getSecondaryNavItems(slug: string): NavItem[] {
  return [
    { label: sidebar.team, href: `/studio/${slug}/team`, icon: "👥" },
    { label: sidebar.settings, href: `/studio/${slug}/settings`, icon: "⚙" },
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
  const navItems = getNavItems(slug);
  const secondaryItems = getSecondaryNavItems(slug);

  function isActive(href: string) {
    if (href === `/studio/${slug}`) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))]">
      <div className="flex h-14 items-center border-b border-[hsl(var(--sidebar-border))] px-4">
        <Link
          to="/studio"
          onClick={onNavigate}
          className="text-sm font-semibold text-[hsl(var(--sidebar-foreground))] hover:text-magenta transition-colors"
        >
          Godinez.AI
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive(item.href)
                ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))] font-medium"
                : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
            }`}
          >
            <span className="w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <nav className="space-y-1 border-t border-[hsl(var(--sidebar-border))] px-2 py-3">
        {secondaryItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive(item.href)
                ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))] font-medium"
                : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
            }`}
          >
            <span className="w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-[hsl(var(--sidebar-border))] px-4 py-3">
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      </div>
    </aside>
  );
}
