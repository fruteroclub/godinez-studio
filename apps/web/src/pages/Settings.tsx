import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useUpdateWorkspace, useDeleteWorkspace } from "@/hooks/use-workspace";
import { content } from "@/lib/content";

const { settings: sc } = content.studio;

export default function Settings() {
  const { workspace } = useWorkspace();
  const updateWorkspace = useUpdateWorkspace(workspace?.id ?? 0);
  const deleteWorkspace = useDeleteWorkspace(workspace?.id ?? 0);
  const navigate = useNavigate();
  const [name, setName] = useState(workspace?.name ?? "");
  const [deleteSlug, setDeleteSlug] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await updateWorkspace.mutateAsync({ name: name.trim() });
  }

  async function handleDelete() {
    if (deleteSlug !== workspace?.slug) return;
    await deleteWorkspace.mutateAsync();
    navigate("/studio");
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
        {sc.title}
      </h1>

      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <h2 className="text-lg font-medium text-[hsl(var(--foreground))]">
          {sc.general}
        </h2>
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="text-sm text-[hsl(var(--muted-foreground))]">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
            />
          </div>
          <div>
            <label className="text-sm text-[hsl(var(--muted-foreground))]">
              Slug
            </label>
            <p className="mt-1 text-sm text-[hsl(var(--foreground))]">
              {workspace?.slug}
            </p>
          </div>
          <button
            type="submit"
            disabled={updateWorkspace.isPending}
            className="rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors disabled:opacity-50"
          >
            {sc.save}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-red-500/30 bg-[hsl(var(--card))] p-6">
        <h2 className="text-lg font-medium text-red-400">{sc.danger}</h2>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          {sc.deleteConfirm}
          <code className="mx-1 rounded bg-[hsl(var(--muted))] px-1 py-0.5 text-xs">
            {workspace?.slug}
          </code>
        </p>
        <div className="mt-3 flex gap-3">
          <input
            type="text"
            value={deleteSlug}
            onChange={(e) => setDeleteSlug(e.target.value)}
            placeholder={workspace?.slug}
            className="flex-1 rounded-md border border-red-500/30 bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <button
            onClick={handleDelete}
            disabled={
              deleteSlug !== workspace?.slug || deleteWorkspace.isPending
            }
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {sc.deleteCta}
          </button>
        </div>
      </div>
    </div>
  );
}
