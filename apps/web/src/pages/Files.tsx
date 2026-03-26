import { useRef, useState, useEffect } from "react";
import { Trash2, MessageSquare, ExternalLink } from "lucide-react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useFiles, useUploadFile, useStorageQuota, useDeleteFile } from "@/hooks/use-files";
import { content } from "@/lib/content";
import EmptyState from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

const { files: fc } = content.studio;

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileToDelete {
  id: number;
  filename: string;
}

export default function Files() {
  const { workspace, slug } = useWorkspace();
  const { data: files, isLoading } = useFiles(workspace?.id);
  const { data: quota } = useStorageQuota(workspace?.id);
  const upload = useUploadFile(workspace?.id ?? 0);
  const deleteFile = useDeleteFile(workspace?.id ?? 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileToDelete | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fileToDelete) setFileToDelete(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [fileToDelete]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDeleteClick(file: FileToDelete, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFileToDelete(file);
  }

  function handleConfirmDelete() {
    if (!fileToDelete) return;
    setDeletingId(fileToDelete.id);
    deleteFile.mutate(fileToDelete.id, {
      onSettled: () => {
        setDeletingId(null);
        setFileToDelete(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl p-6 max-w-md w-full border border-[hsl(var(--border))] shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <Trash2 className="w-5 h-5 text-red-500 stroke-[1.5]" />
              </div>
              <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                ¿Eliminar archivo?
              </h2>
            </div>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Esto eliminará <strong className="text-[hsl(var(--foreground))]">{fileToDelete.filename}</strong> permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setFileToDelete(null)}
                className="flex-1 px-4 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] text-[hsl(var(--foreground))]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId === fileToDelete.id}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 text-white disabled:opacity-50"
              >
                {deletingId === fileToDelete.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Eliminando...
                  </span>
                ) : (
                  "Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          {fc.title}
        </h1>
        <div>
          <input
            ref={inputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer rounded-md bg-magenta px-4 py-2 text-sm font-medium text-white hover:bg-magenta/90 transition-colors"
          >
            {upload.isPending ? "Subiendo..." : fc.upload}
          </label>
        </div>
      </div>

      {quota && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
            <span>
              {formatSize(quota.quotaBytes - quota.usedBytes)} disponibles de {formatSize(quota.quotaBytes)}
            </span>
            <span>{quota.usedPercent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[hsl(var(--muted))]">
            <div
              className={`h-full rounded-full transition-all ${
                quota.usedPercent >= 90
                  ? "bg-red-500"
                  : "bg-magenta"
              }`}
              style={{ width: `${Math.min(quota.usedPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : !files?.length ? (
        <EmptyState message={fc.empty} />
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-magenta/30"
            >
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 group"
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium text-[hsl(var(--foreground))] truncate group-hover:text-magenta transition-colors">
                    {file.filename}
                  </p>
                  <ExternalLink className="w-3 h-3 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {file.mimeType ?? "archivo"} · {formatSize(file.sizeBytes)}
                </p>
                {file.conversationId && (
                  <a
                    href={`/studio/${slug}/chat/${file.conversationId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 mt-1 text-xs text-magenta hover:text-magenta/80 transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>
                      {file.conversationTitle
                        ? `Adjunto en: ${file.conversationTitle}`
                        : `Adjunto en chat #${file.conversationId}`}
                    </span>
                  </a>
                )}
              </a>
              <div className="flex items-center gap-3 ml-3">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(file.createdAt).toLocaleDateString("es-MX")}
                </span>
                <button
                  onClick={(e) => handleDeleteClick({ id: file.id, filename: file.filename }, e)}
                  className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  title="Eliminar archivo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
