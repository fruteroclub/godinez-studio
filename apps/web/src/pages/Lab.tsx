import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { content } from "@/lib/content";

const { lab } = content.studio;

interface PreviewState {
  url: string | null;
  loading: boolean;
  error: string | null;
}

export default function Lab() {
  const { slug } = useParams<{ slug: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({
    url: null,
    loading: true,
    error: null,
  });

  // Fetch preview URL from API
  useEffect(() => {
    async function fetchPreview() {
      try {
        setPreview((prev) => ({ ...prev, loading: true, error: null }));
        
        const response = await fetch(`/api/workspaces/${slug}/preview`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setPreview({ url: null, loading: false, error: null });
            return;
          }
          throw new Error("Failed to fetch preview");
        }
        
        const data = await response.json();
        setPreview({ url: data.previewUrl, loading: false, error: null });
      } catch (err) {
        setPreview({
          url: null,
          loading: false,
          error: err instanceof Error ? err.message : "Error loading preview",
        });
      }
    }

    if (slug) {
      fetchPreview();
    }
  }, [slug]);

  const handleRefresh = () => {
    if (iframeRef.current && preview.url) {
      iframeRef.current.src = preview.url;
    }
  };

  const handleOpenExternal = () => {
    if (preview.url) {
      window.open(preview.url, "_blank");
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Empty state
  if (!preview.loading && !preview.url && !preview.error) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <h1 className="text-lg font-semibold">{lab.title}</h1>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <span className="text-4xl mb-4 block">🧪</span>
            <p>{lab.noPreview}</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (preview.loading) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <h1 className="text-lg font-semibold">{lab.title}</h1>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">
            Cargando preview...
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (preview.error) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <h1 className="text-lg font-semibold">{lab.title}</h1>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-destructive">
            <span className="text-4xl mb-4 block">⚠️</span>
            <p>{preview.error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Preview iframe
  return (
    <div className={`flex h-full flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-background" : ""}`}>
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{lab.title}</h1>
          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
            {preview.url}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={lab.refresh}
          >
            🔄 {lab.refresh}
          </button>
          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={lab.openExternal}
          >
            ↗️ {lab.openExternal}
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={isFullscreen ? lab.exitFullscreen : lab.fullscreen}
          >
            {isFullscreen ? "🗗" : "⛶"} {isFullscreen ? lab.exitFullscreen : lab.fullscreen}
          </button>
        </div>
      </header>
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src={preview.url!}
          className="absolute inset-0 w-full h-full border-0"
          title="Project Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  );
}
