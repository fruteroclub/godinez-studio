import { useState } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useMembers, useInviteMember, useRemoveMember } from "@/hooks/use-team";
import { content } from "@/lib/content";
import { ListSkeleton } from "@/components/ui/Skeleton";

const { team: tc } = content.studio;

const roleLabels: Record<string, string> = {
  owner: tc.roleOwner,
  admin: tc.roleAdmin,
  member: tc.roleMember,
  viewer: tc.roleViewer,
};

export default function Team() {
  const { workspace } = useWorkspace();
  const { data: members, isLoading } = useMembers(workspace?.id);
  const invite = useInviteMember(workspace?.id ?? 0);
  const remove = useRemoveMember(workspace?.id ?? 0);
  const [email, setEmail] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await invite.mutateAsync({ email: email.trim() });
    setEmail("");
    setShowInvite(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          {tc.title}
        </h1>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors"
        >
          {tc.invite}
        </button>
      </div>

      {showInvite && (
        <form
          onSubmit={handleInvite}
          className="flex gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            required
            className="flex-1 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
          />
          <button
            type="submit"
            disabled={invite.isPending}
            className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
          >
            Invitar
          </button>
        </form>
      )}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="space-y-2">
          {members?.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-sm font-medium text-[hsl(var(--foreground))]">
                  {(m.user.name ?? m.user.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-[hsl(var(--foreground))]">
                    {m.user.name ?? m.user.email}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {m.user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                  {roleLabels[m.role] ?? m.role}
                </span>
                {m.role !== "owner" && (
                  <button
                    onClick={() => remove.mutate(m.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
