import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { content } from "@/lib/content";

const { lab } = content.studio;

// Regex to detect tunnel URLs - cloudflare, ngrok, localhost.run
const TUNNEL_URL_REGEX = /(https?:\/\/[a-z0-9-]+\.(?:trycloudflare\.com|ngrok\.io|ngrok-free\.app|localhost\.run)(?:\/[^\s\)\]\*\`\<\>]*)?)/gi;

type TunnelStatus = "idle" | "checking" | "live" | "dead" | "recovering";

interface PreviewState {
  url: string | null;
  projectName: string | null;
  loading: boolean;
  error: string | null;
}

export default function Lab() {
  const { slug } = useParams<{ slug: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>("idle");
  const [preview, setPreview] = useState<PreviewState>({
    url: null,
    projectName: null,
    loading: true,
    error: null,
  });
  
  // Polling interval for checking new tunnel URLs from chat
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if a tunnel URL is alive
  const checkTunnelHealth = useCallback(async (url: string): Promise<boolean> => {
    setTunnelStatus("checking");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      await fetch(url, { mode: "no-cors", signal: controller.signal });
      clearTimeout(timeout);
      setTunnelStatus("live");
      return true;
    } catch {
      setTunnelStatus("dead");
      return false;
    }
  }, []);

  // Extract tunnel URL from text
  const extractTunnelUrl = (content: string): string | null => {
    if (typeof content !== "string") return null;
    const matches = content.match(TUNNEL_URL_REGEX);
    return matches ? matches[0] : null;
  };

  // Fetch preview URL - checks both DB and recent chat messages
  const fetchPreview = useCallback(async () => {
    if (!slug) return;
    
    try {
      // First try DB stored preview
      const response = await fetch(`/api/workspaces/${slug}/preview`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.previewUrl) {
          setPreview({ 
            url: data.previewUrl, 
            projectName: data.projectName,
            loading: false, 
            error: null 
          });
          checkTunnelHealth(data.previewUrl);
          return;
        }
      }
      
      // If no stored preview, check recent chat for tunnel URLs
      const chatResponse = await fetch(`/api/workspaces/${slug}/chat/recent`);
      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        // Look through recent messages for tunnel URLs
        for (const msg of chatData.messages || []) {
          const tunnelUrl = extractTunnelUrl(msg.content);
          if (tunnelUrl) {
            setPreview({ 
              url: tunnelUrl, 
              projectName: "Chat Preview",
              loading: false, 
              error: null 
            });
            checkTunnelHealth(tunnelUrl);
            
            // Save to DB for persistence
            await fetch(`/api/workspaces/${slug}/preview`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ previewUrl: tunnelUrl }),
            });
            return;
          }
        }
      }
      
      // No preview found
      setPreview({ url: null, projectName: null, loading: false, error: null });
      setTunnelStatus("idle");
      
    } catch (err) {
      setPreview({
        url: null,
        projectName: null,
        loading: false,
        error: err instanceof Error ? err.message : "Error loading preview",
      });
    }
  }, [slug, checkTunnelHealth]);

  // Initial fetch
  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Poll for new tunnel URLs every 10 seconds
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      // Only poll if we don't have a live preview or if status is dead
      if (!preview.url || tunnelStatus === "dead" || tunnelStatus === "idle") {
        fetchPreview();
      }
    }, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [preview.url, tunnelStatus, fetchPreview]);

  // Re-check health periodically when we have a URL
  useEffect(() => {
    if (!preview.url || tunnelStatus !== "live") return;
    
    const healthCheck = setInterval(() => {
      checkTunnelHealth(preview.url!);
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(healthCheck);
  }, [preview.url, tunnelStatus, checkTunnelHealth]);

  const handleRefresh = () => {
    if (iframeRef.current && preview.url) {
      // Force refresh with cache buster
      const url = new URL(preview.url);
      url.searchParams.set("_t", Date.now().toString());
      iframeRef.current.src = url.toString();
    }
    if (preview.url) {
      checkTunnelHealth(preview.url);
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

  // Status indicator color
  const getStatusColor = () => {
    switch (tunnelStatus) {
      case "live": return "bg-green-400";
      case "checking": return "bg-yellow-400 animate-pulse";
      case "recovering": return "bg-orange-400 animate-pulse";
      case "dead": return "bg-red-400";
      default: return "bg-gray-400";
    }
  };

  // Empty state
  if (!preview.loading && !preview.url && !preview.error) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <h1 className="text-lg font-semibold">{lab.title}</h1>
        </header>
        <div className="flex flex-1 items-center justify-center bg-[hsl(var(--muted))]">
          <div className="text-center text-muted-foreground p-8">
            <span className="text-6xl mb-6 block">🧪</span>
            <h3 className="text-lg font-medium mb-2">Preview de tu proyecto</h3>
            <p className="text-sm max-w-md">
              Cuando el agente tenga tu proyecto listo con un tunnel (Cloudflare/ngrok), 
              aparecerá aquí automáticamente. Pide en el chat que cree un proyecto.
            </p>
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
            Buscando preview...
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

  // Tunnel dead state
  if (tunnelStatus === "dead") {
    return (
      <div className="flex h-full flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{lab.title}</h1>
            <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              🔄 Reintentar
            </button>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center bg-[hsl(var(--muted))]">
          <div className="text-center p-8">
            <span className="text-6xl mb-6 block">🔌</span>
            <h3 className="text-lg font-medium text-destructive mb-2">Tunnel desconectado</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              El preview no responde. Pide al agente en el chat que genere un nuevo tunnel.
            </p>
            <p className="text-xs text-muted-foreground truncate max-w-sm">
              {preview.url}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Checking state
  if (tunnelStatus === "checking") {
    return (
      <div className="flex h-full flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{lab.title}</h1>
            <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center bg-[hsl(var(--muted))]">
          <div className="text-center p-8">
            <span className="text-6xl mb-6 block animate-spin">⏳</span>
            <h3 className="text-lg font-medium mb-2">Verificando tunnel...</h3>
            <p className="text-sm text-muted-foreground">
              Comprobando que el preview está disponible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Live preview iframe
  return (
    <div className={`flex h-full flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-background" : ""}`}>
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{lab.title}</h1>
          <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} title={tunnelStatus} />
          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
            {preview.projectName || preview.url}
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
