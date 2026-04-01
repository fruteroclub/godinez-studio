import { ExternalLink } from "lucide-react";
import { useState } from "react";

interface LinkPreviewProps {
  url: string;
}

// Detectar si es tunnel URL (no tiene favicon útil)
function isTunnelUrl(url: string): boolean {
  const tunnelDomains = ["loca.lt", "ngrok", "trycloudflare", "localhost.run"];
  return tunnelDomains.some(d => url.includes(d));
}

// Obtener favicon URL (solo para sitios que lo tienen)
function getFaviconUrl(url: string): string | null {
  if (isTunnelUrl(url)) return null;
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return null;
  }
}

// Obtener nombre del sitio
function getSiteName(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace("www.", "");
    const path = parsed.pathname.split("/").filter(Boolean);
    
    if (hostname.includes("github.com") && path.length >= 2) {
      return `${path[0]}/${path[1]}`;
    }
    // Para tunnels, mostrar el subdominio
    if (isTunnelUrl(url)) {
      return hostname.split(".")[0];
    }
    return hostname;
  } catch {
    return "Link";
  }
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [faviconError, setFaviconError] = useState(false);
  const siteName = getSiteName(url);
  const faviconUrl = getFaviconUrl(url);
  const showFavicon = faviconUrl && !faviconError;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm text-magenta hover:underline"
    >
      {showFavicon && (
        <img 
          src={faviconUrl} 
          alt="" 
          className="w-4 h-4"
          onError={() => setFaviconError(true)}
        />
      )}
      <span>{siteName}</span>
      <span className="opacity-60">·</span>
      <span className="opacity-80">Ver preview</span>
      <ExternalLink className="w-3 h-3 opacity-50" />
    </a>
  );
}
