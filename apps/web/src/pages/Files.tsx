import { useRef } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useFiles, useUploadFile } from "@/hooks/use-files";
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

export default function Files() {
  const { workspace } = useWorkspace();
  const { data: files, isLoading } = useFiles(workspace?.id);
  const upload = useUploadFile(workspace?.id ?? 0);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
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

      {isLoading ? (
        <ListSkeleton />
      ) : !files?.length ? (
        <EmptyState message={fc.empty} />
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <a
              key={file.id}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-magenta/30"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[hsl(var(--foreground))] truncate">
                  {file.filename}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {file.mimeType ?? "archivo"} · {formatSize(file.sizeBytes)}
                </p>
              </div>
              <span className="ml-3 text-xs text-[hsl(var(--muted-foreground))]">
                {new Date(file.createdAt).toLocaleDateString("es-MX")}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
