import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useUpdateWorkspace, useDeleteWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@clerk/clerk-react";
import { apiFetch } from "@/lib/api";
import { content } from "@/lib/content";
import { RoleIcon } from "@/lib/icons";

const { settings: sc, onboarding } = content.studio;

const ROLE_IDS = ["founder", "marketing", "sales", "operations", "tech", "support", "other"] as const;

interface UserContext {
  projectType: string | null;
  projectSubtype: string | null;
  jobRole?: string | null;
}

export default function Settings() {
  const { workspace } = useWorkspace();
  const updateWorkspace = useUpdateWorkspace(workspace?.id ?? 0);
  const deleteWorkspace = useDeleteWorkspace(workspace?.id ?? 0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  
  const [name, setName] = useState(workspace?.name ?? "");
  const [deleteSlug, setDeleteSlug] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [saveFlash, setSaveFlash] = useState(false);

  // Fetch user context (includes jobRole)
  const { data: userContext } = useQuery({
    queryKey: ["userContext"],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<UserContext>("/api/context", { token });
    },
  });

  // Update role when context loads
  useEffect(() => {
    if (userContext?.jobRole) {
      setUserRole(userContext.jobRole);
    }
  }, [userContext]);

  // Mutation to update user role
  const updateRole = useMutation({
    mutationFn: async (role: string) => {
      const token = await getToken();
      return apiFetch("/api/context/role", {
        method: "PATCH",
        body: JSON.stringify({ jobRole: role }),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userContext"] });
    },
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Save workspace name
    await updateWorkspace.mutateAsync({ name: name.trim() });
    
    // Save role if changed
    if (userRole && userRole !== userContext?.jobRole) {
      await updateRole.mutateAsync(userRole);
    }
    
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-[hsl(var(--foreground))]">
            {sc.general}
          </h2>
          {saveFlash && (
            <span className="text-sm text-green-400 animate-in fade-in">
              ✓ Guardado
            </span>
          )}
        </div>
        <form onSubmit={handleSave} className="mt-4 space-y-6">
          {/* Workspace name */}
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
          
          {/* User role */}
          <div>
            <label className="text-sm text-[hsl(var(--muted-foreground))]">
              Rol del usuario
            </label>
            <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
              Tu rol principal en tu organización
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLE_IDS.map((id) => {
                const label = onboarding.roles[id];
                if (!label) return null;
                const isSelected = userRole === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUserRole(isSelected ? "" : id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                      isSelected
                        ? "border-magenta bg-magenta/10 text-[hsl(var(--foreground))]"
                        : "border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:border-white/20"
                    }`}
                  >
                    <RoleIcon roleId={id} className="w-4 h-4 stroke-[1.5] inline mr-1.5" />{label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Slug (read-only) */}
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
            disabled={updateWorkspace.isPending || updateRole.isPending}
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
