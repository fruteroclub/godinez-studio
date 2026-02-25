import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1);
    crumbs.push({ label, href: currentPath });
  }
  return crumbs;
}

export default function TopBar({
  onMenuToggle,
}: {
  onMenuToggle?: () => void;
}) {
  const { pathname } = useLocation();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 sm:px-6">
      <div className="flex items-center min-w-0">
        <button
          onClick={onMenuToggle}
          className="mr-3 rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors lg:hidden"
          aria-label="Abrir menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <nav className="flex items-center gap-2 text-sm overflow-x-auto">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-2 shrink-0">
              {i > 0 && (
                <span className="text-[hsl(var(--muted-foreground))]">/</span>
              )}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-[hsl(var(--foreground))] font-medium">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.href}
                  className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
    </header>
  );
}
