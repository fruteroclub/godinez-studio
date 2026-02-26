import { useState, useRef, useEffect } from "react";
import type { ActionType } from "@godinez/types";
import { content } from "@/lib/content";

const { actions: t } = content.studio;

interface ManualActionMenuProps {
  onSelect: (type: ActionType) => void;
}

const MENU_ITEMS: { type: ActionType; label: string; icon: string }[] = [
  { type: "create_project", label: t.createProject, icon: "📁" },
  { type: "create_task", label: t.createTask, icon: "✅" },
  { type: "create_file", label: t.createFile, icon: "📄" },
];

export function ManualActionMenu({ onSelect }: ManualActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
        title={t.menuTitle}
      >
        +
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 min-w-[180px] rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-1 shadow-lg">
          <p className="px-3 py-1.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">
            {t.menuTitle}
          </p>
          {MENU_ITEMS.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                onSelect(item.type);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
