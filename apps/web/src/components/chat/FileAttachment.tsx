import { useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Paperclip, X, Image, FileText, File } from "lucide-react";

import type { ChatAttachment } from "@/hooks/use-chat";

interface FileAttachmentProps {
  workspaceId: number;
  onAttach: (attachment: ChatAttachment) => void;
  onRemove: () => void;
  attachment: ChatAttachment | null;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
];

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

export function FileAttachmentButton({
  workspaceId,
  onAttach,

  attachment,
  disabled,
}: FileAttachmentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Tipo de archivo no soportado");
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError("Archivo muy grande (máx 10 MB)");
        return;
      }

      setIsUploading(true);
      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", String(workspaceId));

        const response = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/files/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Error al subir archivo");
        }

        const data = await response.json();
        onAttach({
          fileId: data.id,
          url: data.url,
          mimeType: file.type,
          filename: file.name,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir");
      } finally {
        setIsUploading(false);
      }
    },
    [workspaceId, getToken, onAttach],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleFileSelect],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isUploading || !!attachment}
        className={`p-2 rounded-md transition-colors ${
          disabled || isUploading || attachment
            ? "text-zinc-500 cursor-not-allowed"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
        }`}
        title="Adjuntar imagen"
      >
        {isUploading ? (
          <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Paperclip className="w-5 h-5" />
        )}
      </button>

      {error && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 text-xs text-red-400 bg-red-950 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

interface AttachmentPreviewProps {
  attachment: ChatAttachment;
  onRemove: () => void;
}

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  const Icon = getFileIcon(attachment.mimeType);
  const isImage = attachment.mimeType.startsWith("image/");

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700">
      {isImage ? (
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="w-10 h-10 object-cover rounded"
        />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-zinc-700 rounded">
          <Icon className="w-5 h-5 text-zinc-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 truncate">{attachment.filename}</p>
        <p className="text-xs text-zinc-500">{attachment.mimeType}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface MessageAttachmentProps {
  attachment: ChatAttachment;
}

export function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const Icon = getFileIcon(attachment.mimeType);
  const isImage = attachment.mimeType.startsWith("image/");

  if (isImage) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs"
      >
        <img
          src={attachment.url}
          alt={attachment.filename}
          className="rounded-lg max-h-64 object-contain"
        />
        <p className="text-xs text-zinc-500 mt-1">{attachment.filename}</p>
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg hover:bg-zinc-700/50 transition-colors"
    >
      <Icon className="w-5 h-5 text-zinc-400" />
      <span className="text-sm text-zinc-300 truncate">{attachment.filename}</span>
    </a>
  );
}
