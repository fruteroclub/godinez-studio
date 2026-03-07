import type { ActionCard as ActionCardType } from "@godinez/types";
import { content } from "@/lib/content";

const { actions: t } = content.studio;

const TYPE_ICONS: Record<string, string> = {
  create_project: "📁",
  create_task: "✅",
  create_file: "📄",
};

interface ActionCardProps {
  action: ActionCardType;
  messageId: number | string;
  onExecute: (messageId: number, actionId: string) => void;
  disabled?: boolean;
}

export function ActionCard({
  action,
  messageId,
  onExecute,
  disabled,
}: ActionCardProps) {
  const icon = TYPE_ICONS[action.type] || "⚡";
  const isPending = action.status === "pending";
  const isExecuting = action.status === "executing";
  const isCompleted = action.status === "completed";
  const isError = action.status === "error";

  return (
    <div
      className={`my-2 rounded-lg border px-3 py-2.5 transition-colors ${
        isCompleted
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isError
            ? "border-red-500/30 bg-red-500/5"
            : isExecuting
              ? "border-gold/30 bg-gold/5"
              : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="flex-1 text-sm font-medium text-[hsl(var(--foreground))]">
          {action.label}
        </span>

        {isPending && (
          <button
            onClick={() => onExecute(Number(messageId), action.id)}
            disabled={disabled}
            className="rounded-md bg-magenta px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-magenta/90 disabled:opacity-50"
          >
            {t.execute}
          </button>
        )}

        {isExecuting && (
          <span className="flex items-center gap-1 text-xs text-gold">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-gold border-t-transparent" />
            {t.executing}
          </span>
        )}

        {isCompleted && (
          <span className="text-xs font-medium text-emerald-400">
            {t.completed}
            {action.resultId != null && (
              <span className="ml-1 text-[hsl(var(--muted-foreground))]">
                #{action.resultId}
              </span>
            )}
          </span>
        )}

        {isError && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400" title={action.error}>
              {t.error}
            </span>
            <button
              onClick={() => onExecute(Number(messageId), action.id)}
              disabled={disabled}
              className="rounded-md border border-red-500/30 px-2 py-0.5 text-xs text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              {t.retry}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
