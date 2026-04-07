import { useState, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

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

export function DropZone({ onFileDrop, children, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [, setDragCounter] = useState(0);

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setDragCounter((prev) => prev + 1);
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          setIsDragging(false);
          return 0;
        }
        return newCount;
      });
    },
    [],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      if (disabled) return;

      const file = e.dataTransfer?.files?.[0];
      if (file && ALLOWED_TYPES.includes(file.type)) {
        onFileDrop(file);
      }
    },
    [disabled, onFileDrop],
  );

  useEffect(() => {
    const element = document;
    element.addEventListener("dragenter", handleDragEnter);
    element.addEventListener("dragleave", handleDragLeave);
    element.addEventListener("dragover", handleDragOver);
    element.addEventListener("drop", handleDrop);

    return () => {
      element.removeEventListener("dragenter", handleDragEnter);
      element.removeEventListener("dragleave", handleDragLeave);
      element.removeEventListener("dragover", handleDragOver);
      element.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <div className="relative h-full">
      {children}
      
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/90 backdrop-blur-sm border-2 border-dashed border-magenta rounded-lg animate-in fade-in duration-200">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-magenta/20 flex items-center justify-center">
              <Plus className="w-8 h-8 text-magenta" />
            </div>
            <p className="text-lg font-medium text-zinc-100">
              Suelta el archivo para adjuntarlo
            </p>
            <p className="text-sm text-zinc-400 mt-2">
              png, jpg, pdf, md, txt · máx 10 MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
