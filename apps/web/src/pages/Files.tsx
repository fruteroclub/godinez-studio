import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Trash2, MessageSquare, ExternalLink, MoreHorizontal, Pencil, Link2, Check, X, Globe, FolderOpen } from "lucide-react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useFiles, useUploadFile, useStorageQuota, useDeleteFile, useRenameFile, useAssociateFile } from "@/hooks/use-files";
import { useProjects } from "@/hooks/use-projects";
import { useConversations } from "@/hooks/use-conversations";
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

function splitFilename(filename: string): { basename: string; extension: string } {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) {
    return { basename: filename, extension: "" };
  }
  return {
    basename: filename.substring(0, lastDot),
    extension: filename.substring(lastDot),
  };
}

interface FileItem {
  id: number;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  url: string;
  projectId: number | null;
  isGlobal: boolean | null;
  conversationId: number | null;
  isGlobalChat: boolean | null;
  conversationTitle: string | null;
}

type ProjectAssociation = "none" | "global" | "specific";
type ChatAssociation = "none" | "global" | "specific";
type AssociateTab = "projects" | "chats";

export default function Files() {
  const { workspace } = useWorkspace();
  const { data: files, isLoading } = useFiles(workspace?.id);
  const { data: projects } = useProjects(workspace?.id);
  const { data: conversations } = useConversations(workspace?.id);
  const { data: quota } = useStorageQuota(workspace?.id);
  const upload = useUploadFile(workspace?.id ?? 0);
  const deleteFile = useDeleteFile(workspace?.id ?? 0);
  const renameFile = useRenameFile(workspace?.id ?? 0);
  const associateFile = useAssociateFile(workspace?.id ?? 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightProjectId = searchParams.get("highlight");
  const [highlightedFileId, setHighlightedFileId] = useState<number | null>(null);

  const [menuState, setMenuState] = useState<{
    fileId: number | null;
    position: { x: number; y: number };
  }>({ fileId: null, position: { x: 0, y: 0 } });

  const [renameState, setRenameState] = useState<{
    fileId: number | null;
    basename: string;
    extension: string;
  }>({ fileId: null, basename: "", extension: "" });

  const [associateState, setAssociateState] = useState<{
    file: FileItem | null;
    activeTab: AssociateTab;
    projectType: ProjectAssociation;
    projectId: number | null;
    chatType: ChatAssociation;
    chatId: number | null;
  }>({ file: null, activeTab: "projects", projectType: "none", projectId: null, chatType: "none", chatId: null });

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);


  // Highlight file from project
  useEffect(() => {
    if (highlightProjectId && files) {
      const projectFiles = files.filter(f => f.projectId === Number(highlightProjectId));
      if (projectFiles.length > 0) {
        const sorted = [...projectFiles].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        const mostRecent = sorted[0];
        setHighlightedFileId(mostRecent.id);
        setTimeout(() => {
          const el = document.getElementById(`file-${mostRecent.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
        setTimeout(() => {
          setSearchParams({});
          setHighlightedFileId(null);
        }, 600);
      }
    }
  }, [highlightProjectId, files, setSearchParams]);


  // Highlight file from project
  useEffect(() => {
    if (highlightProjectId && files) {
      const projectFiles = files.filter(f => f.projectId === Number(highlightProjectId) || (f.isGlobal && workspace?.id));
      if (projectFiles.length > 0) {
        const sorted = [...projectFiles].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        const mostRecent = sorted[0];
        setHighlightedFileId(mostRecent.id);
        setTimeout(() => {
          const el = document.getElementById(`file-${mostRecent.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
        setTimeout(() => {
          setSearchParams({});
          setHighlightedFileId(null);
        }, 600);
      }
    }
  }, [highlightProjectId, files, setSearchParams, workspace?.id]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuState({ fileId: null, position: { x: 0, y: 0 } });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFileToDelete(null);
        setAssociateState({ file: null, activeTab: "projects", projectType: "none", projectId: null, chatType: "none", chatId: null });
        setMenuState({ fileId: null, position: { x: 0, y: 0 } });
        setRenameState({ fileId: null, basename: "", extension: "" });
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload.mutate(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleMenuClick(file: FileItem, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMenuState({
      fileId: file.id,
      position: { x: rect.left - 150, y: rect.bottom + 5 },
    });
  }

  function handleRenameClick(file: FileItem) {
    const { basename, extension } = splitFilename(file.filename);
    setRenameState({ fileId: file.id, basename, extension });
    setMenuState({ fileId: null, position: { x: 0, y: 0 } });
  }

  function handleRenameSubmit(fileId: number) {
    if (!renameState.basename.trim()) return;
    const newFilename = renameState.basename.trim() + renameState.extension;
    renameFile.mutate(
      { fileId, filename: newFilename },
      { onSuccess: () => setRenameState({ fileId: null, basename: "", extension: "" }) }
    );
  }

  function handleAssociateClick(file: FileItem) {
    let projectType: ProjectAssociation = "none";
    if (file.isGlobal) projectType = "global";
    else if (file.projectId) projectType = "specific";

    let chatType: ChatAssociation = "none";
    if (file.isGlobalChat) chatType = "global";
    else if (file.conversationId) chatType = "specific";

    setAssociateState({
      file,
      activeTab: "projects",
      projectType,
      projectId: file.projectId,
      chatType,
      chatId: file.conversationId,
    });
    setMenuState({ fileId: null, position: { x: 0, y: 0 } });
  }

  function handleAssociateSubmit() {
    if (!associateState.file) return;

    const payload: {
      fileId: number;
      projectId?: number | null;
      isGlobal?: boolean;
      conversationId?: number | null;
      isGlobalChat?: boolean;
    } = { fileId: associateState.file.id };

    if (associateState.projectType === "none") {
      payload.projectId = null;
      payload.isGlobal = false;
    } else if (associateState.projectType === "global") {
      payload.isGlobal = true;
    } else if (associateState.projectType === "specific" && associateState.projectId) {
      payload.projectId = associateState.projectId;
      payload.isGlobal = false;
    }

    if (associateState.chatType === "none") {
      payload.conversationId = null;
      payload.isGlobalChat = false;
    } else if (associateState.chatType === "global") {
      payload.isGlobalChat = true;
    } else if (associateState.chatType === "specific" && associateState.chatId) {
      payload.conversationId = associateState.chatId;
      payload.isGlobalChat = false;
    }

    associateFile.mutate(payload, {
      onSuccess: () => setAssociateState({ file: null, activeTab: "projects", projectType: "none", projectId: null, chatType: "none", chatId: null }),
    });
  }

  function handleDeleteClick(file: FileItem) {
    setFileToDelete(file);
    setMenuState({ fileId: null, position: { x: 0, y: 0 } });
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

  // Get current selection labels for tabs
  function getProjectLabel() {
    if (associateState.projectType === "global") return "Todos";
    if (associateState.projectType === "specific" && associateState.projectId) {
      return projects?.find(p => p.id === associateState.projectId)?.name || "1 proyecto";
    }
    return "Ninguno";
  }

  function getChatLabel() {
    if (associateState.chatType === "global") return "Todos";
    if (associateState.chatType === "specific" && associateState.chatId) {
      const conv = conversations?.find(c => c.id === associateState.chatId);
      return conv?.title?.substring(0, 15) + (conv?.title && conv.title.length > 15 ? "..." : "") || "1 chat";
    }
    return "Ninguno";
  }

  return (
    <div className="space-y-6">
      {/* Context Menu */}
      {menuState.fileId && (
        <div
          ref={menuRef}
          className="fixed z-50 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ left: menuState.position.x, top: menuState.position.y }}
        >
          {(() => {
            const file = files?.find(f => f.id === menuState.fileId);
            if (!file) return null;
            return (
              <>
                <button
                  onClick={() => handleRenameClick(file)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Renombrar
                </button>
                <button
                  onClick={() => handleAssociateClick(file)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  Asociar
                </button>
                <div className="border-t border-zinc-700 my-1" />
                <button
                  onClick={() => handleDeleteClick(file)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Associate Modal - Lateral Layout */}
      {associateState.file && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-xl w-full max-w-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-[hsl(var(--border))]">
              <div className="p-2 rounded-full bg-magenta/10">
                <Link2 className="w-5 h-5 text-magenta stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Asociar</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{associateState.file.filename}</p>
              </div>
            </div>

            {/* Body - Lateral Layout */}
            <div className="flex">
              {/* Left Sidebar - Tabs */}
              <div className="w-40 border-r border-[hsl(var(--border))] p-2">
                <button
                  onClick={() => setAssociateState({ ...associateState, activeTab: "projects" })}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors mb-1 ${
                    associateState.activeTab === "projects"
                      ? "bg-magenta/10 text-magenta"
                      : "hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">Proyectos</span>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 ml-6">{getProjectLabel()}</p>
                </button>
                <button
                  onClick={() => setAssociateState({ ...associateState, activeTab: "chats" })}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    associateState.activeTab === "chats"
                      ? "bg-magenta/10 text-magenta"
                      : "hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">Chats</span>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 ml-6">{getChatLabel()}</p>
                </button>
              </div>

              {/* Right Content */}
              <div className="flex-1 p-4 max-h-72 overflow-y-auto">
                {associateState.activeTab === "projects" && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setAssociateState({ ...associateState, projectType: "none", projectId: null })}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        associateState.projectType === "none" ? "bg-magenta/10 text-magenta" : "hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                      }`}
                    >
                      Sin proyecto
                    </button>
                    <button
                      onClick={() => setAssociateState({ ...associateState, projectType: "global", projectId: null })}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                        associateState.projectType === "global" ? "bg-magenta/10 text-magenta" : "hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      Todos los proyectos
                    </button>
                    <div className="border-t border-[hsl(var(--border))] my-2" />
                    {projects?.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => setAssociateState({ ...associateState, projectType: "specific", projectId: project.id })}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                          associateState.projectType === "specific" && associateState.projectId === project.id
                            ? "bg-magenta/10 text-magenta"
                            : "hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                        }`}
                      >
                        {project.name}
                      </button>
                    ))}
                    {!projects?.length && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))] px-3 py-2">No hay proyectos</p>
                    )}
                  </div>
                )}

                {associateState.activeTab === "chats" && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setAssociateState({ ...associateState, chatType: "none", chatId: null })}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        associateState.chatType === "none" ? "bg-magenta/10 text-magenta" : "hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                      }`}
                    >
                      Sin chat
                    </button>
                    <button
                      onClick={() => setAssociateState({ ...associateState, chatType: "global", chatId: null })}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                        associateState.chatType === "global" ? "bg-magenta/10 text-magenta" : "hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      Todos los chats
                    </button>
                    <div className="border-t border-[hsl(var(--border))] my-2" />
                    {conversations?.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setAssociateState({ ...associateState, chatType: "specific", chatId: conv.id })}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm truncate ${
                          associateState.chatType === "specific" && associateState.chatId === conv.id
                            ? "bg-magenta/10 text-magenta"
                            : "hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
                        }`}
                      >
                        {conv.title}
                      </button>
                    ))}
                    {!conversations?.length && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))] px-3 py-2">No hay chats</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-[hsl(var(--border))]">
              <button
                onClick={() => setAssociateState({ file: null, activeTab: "projects", projectType: "none", projectId: null, chatType: "none", chatId: null })}
                className="flex-1 px-4 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] rounded-lg transition-colors text-[hsl(var(--foreground))]"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssociateSubmit}
                className="flex-1 px-4 py-2 bg-magenta hover:bg-magenta/90 rounded-lg transition-colors text-white"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

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
              Esto eliminará <strong className="text-[hsl(var(--foreground))]">{fileToDelete.filename}</strong> permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setFileToDelete(null)}
                className="flex-1 px-4 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] rounded-lg transition-colors text-[hsl(var(--foreground))]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId === fileToDelete.id}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-white disabled:opacity-50"
              >
                {deletingId === fileToDelete.id ? "Eliminando..." : "Eliminar"}
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
              className={`h-full rounded-full transition-all duration-500 ${quota.usedPercent >= 90 ? "bg-red-500" : "bg-magenta"}`}
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
          {files.map((file) => {
            const isRenaming = renameState.fileId === file.id;
            const projectName = projects?.find(p => p.id === file.projectId)?.name;
            const chatTitle = conversations?.find(c => c.id === file.conversationId)?.title;

            return (
              <div
                key={file.id}
                id={`file-${file.id}`}
                className={`flex items-center justify-between rounded-lg border p-4 transition-all duration-500 group ${highlightedFileId === file.id ? "border-magenta ring-2 ring-magenta/50 bg-magenta/5" : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-magenta/30"}`}
              >
                <div className="min-w-0 flex-1">
                  {isRenaming ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={renameState.basename}
                        onChange={(e) => setRenameState({ ...renameState, basename: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSubmit(file.id);
                          if (e.key === "Escape") setRenameState({ fileId: null, basename: "", extension: "" });
                        }}
                        autoFocus
                        className="bg-transparent border-b border-magenta focus:outline-none text-[hsl(var(--foreground))]"
                      />
                      <span className="text-[hsl(var(--muted-foreground))]">{renameState.extension}</span>
                      <button
                        onClick={() => handleRenameSubmit(file.id)}
                        className="ml-2 p-1 text-green-500 hover:bg-green-500/10 rounded transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRenameState({ fileId: null, basename: "", extension: "" })}
                        className="p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[hsl(var(--foreground))] truncate group-hover/link:text-magenta transition-colors">
                          {file.filename}
                        </p>
                        <ExternalLink className="w-3 h-3 text-[hsl(var(--muted-foreground))] opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] flex flex-wrap gap-1.5 items-center">
                        <span>{file.mimeType ?? "archivo"} · {formatSize(file.sizeBytes)}</span>
                        {file.isGlobal && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] inline-flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Todos proyectos
                          </span>
                        )}
                        {projectName && !file.isGlobal && (
                          <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 text-[10px]">
                            {projectName}
                          </span>
                        )}
                        {file.isGlobalChat && (
                          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] inline-flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Todos chats
                          </span>
                        )}
                        {chatTitle && !file.isGlobalChat && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] inline-flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {chatTitle}
                          </span>
                        )}
                      </p>
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {new Date(file.createdAt).toLocaleDateString("es-MX")}
                  </span>
                  <button
                    onClick={(e) => handleMenuClick(file, e)}
                    className="p-1.5 rounded text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-all duration-500"
                    title="Opciones"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
